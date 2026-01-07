import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../product/entity/product.entity';
import { ProductVariant } from '../product/entity/product-variant.entity';
import { AddToCartDto, AddToCartItemDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UpdateCartEmailDto } from './dto/update-cart-email.dto';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
  ) { }

  /**
   * Get or create active cart for user or guest
   */
  async getCart(userId: number | null, sessionId?: string, currency?: string): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Either userId or sessionId must be provided');
    }

    const whereCondition: any = { status: 'ACTIVE' };
    if (userId) {
      whereCondition.userId = userId;
    } else if (sessionId) {
      whereCondition.sessionId = sessionId;
    }

    let cart = await this.cartRepository.findOne({
      where: whereCondition,
      relations: ['user'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        userId: userId ?? null,
        sessionId: sessionId ?? null,
        status: 'ACTIVE',
        currency: currency || 'NGN', // Use provided currency or default to NGN
      });
      await this.cartRepository.save(cart);
    } else if (currency && cart.currency !== currency) {
      // Update currency if provided and different (only if cart is empty)
      const itemCount = await this.cartItemRepository.count({ where: { cartId: cart.id } });
      if (itemCount === 0) {
        cart.currency = currency;
        await this.cartRepository.save(cart);
      }
    }

    // Refresh totals
    await this.calculateCartTotals(cart.id);

    // Return with items
    const foundCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['user'],
    });

    if (!foundCart) {
      throw new NotFoundException('Cart not found');
    }

    return foundCart;
  }

  /**
   * Get cart items with product details
   */
  async getFullCart(userId: number | null, sessionId?: string) {
    const cart = await this.getCart(userId, sessionId);
    const items = await this.getCartItems(cart.id);

    // Combine and clean top-level cart
    const fullCart = { ...cart, items };
    return this.sanitizeCart(fullCart);
  }

  /**
   * Helper: Deep clean cart object
   */
  private sanitizeCart(cart: any) {
    const {
      userId, customerIp, customerUserAgent,
      convertedToOrderId, abandonedAt, convertedAt,
      // customerEmail should remain if present
      createdAt, updatedAt,
      ...cleanCart
    } = cart;

    // Filter out null values
    Object.keys(cleanCart).forEach(key => cleanCart[key] === null && delete cleanCart[key]);

    return cleanCart;
  }

  /**
   * Helper: Deep clean item object
   */
  private sanitizeCartItem(item: CartItem) {
    const {
      productName, variantName, imageUrl,
      cartId, stockReservationId,
      createdAt, updatedAt,
      ...cleanItem
    } = item;

    // Clean nested Product
    if (cleanItem.product) {
      const {
        userId, businessId, createdAt, updatedAt, deletedAt,
        ...safeProduct
      } = cleanItem.product as any;

      // Remove nulls from product
      Object.keys(safeProduct).forEach(key => safeProduct[key] === null && delete safeProduct[key]);
      cleanItem.product = safeProduct;
    }

    // Clean nested Variant
    if (cleanItem.variant) {
      const {
        createdAt, updatedAt, costPrice,
        ...safeVariant
      } = cleanItem.variant as any;

      // Remove nulls from variant
      Object.keys(safeVariant).forEach(key => safeVariant[key] === null && delete safeVariant[key]);
      cleanItem.variant = safeVariant;
    }

    // Remove nulls from item
    Object.keys(cleanItem).forEach(key => cleanItem[key] === null && delete cleanItem[key]);

    return cleanItem;
  }

  /**
   * Get cart items with product details
   */
  async getCartItems(cartId: number): Promise<Partial<CartItem>[]> {
    const items = await this.cartItemRepository.find({
      where: { cartId },
      relations: ['product', 'variant'],
      order: { createdAt: 'DESC' },
    });

    return items.map(this.sanitizeCartItem);
  }

  /**
   * Get single cart item
   */
  async getCartItem(userId: number | null, sessionId: string, itemId: number): Promise<Partial<CartItem>> {
    const cart = await this.getCart(userId, sessionId);
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
      relations: ['product', 'variant'],
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.sanitizeCartItem(item);
  }

  /**
   * Add items to cart (supports batch adding)
   */
  async addToCart(userId: number | null, sessionId: string, dto: AddToCartDto) {
    try {
      const { items, email, currency } = dto;

      if (!items || items.length === 0) {
        throw new BadRequestException('At least one item is required');
      }

      // 1. Get or create Cart first (with optional currency)
      const cart = await this.getCart(userId, sessionId, currency);

      // Update email if provided
      if (email) {
        cart.customerEmail = email;
        await this.cartRepository.save(cart);
      }

      // 2. Process each item
      for (const itemDto of items) {
        await this.addSingleItemToCart(cart.id, itemDto);
      }

      // 3. Update Cart Totals once after all items
      await this.calculateCartTotals(cart.id);

      return this.getFullCart(userId, sessionId);
    } catch (e) {
      this.logger.error(`[CartService] addToCart ERROR: ${e.message}`, e.stack);
      throw e;
    }
  }

  /**
   * Process a single item addition to cart (internal helper)
   */
  private async addSingleItemToCart(cartId: number, itemDto: AddToCartItemDto) {
    let { productId, variantId, quantity, notes } = itemDto;

    // 1. Validate Product & Variant
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      this.logger.error(`[CartService] Product not found: ${productId}`);
      throw new NotFoundException(`Product not found: ${productId}`);
    }

    let variant;

    if (variantId) {
      variant = await this.productVariantRepository.findOne({ where: { id: variantId, productId } });
      if (!variant) throw new NotFoundException(`Product variant not found: ${variantId}`);
    } else {
      // Auto-resolve for simple products
      if (product.hasVariation) {
        throw new BadRequestException(`Product ${product.name} has variations. Please select a specific option (variantId).`);
      }

      // Find the "default" variant for simple products (there should be only one)
      variant = await this.productVariantRepository.findOne({ where: { productId } });

      if (!variant) {
        // Self-healing: Create default variant if it doesn't exist
        this.logger.warn(`Fixing missing default variant for product ${productId}`);

        variant = this.productVariantRepository.create({
          productId,
          sku: `SKU-P-${productId}-${Date.now()}`, // Simple unique SKU
          variantName: 'Default',
          price: product.price,
          quantityInStock: product.quantityInStock,
          lowStockThreshold: product.lowStockThreshold,
          isActive: true,
          isDefault: true,
          options: {}, // Empty options for simple product
        });

        variant = await this.productVariantRepository.save(variant);
      }

      // Assign resolved ID
      variantId = variant.id;
    }

    if (variant.quantityInStock < quantity) {
      throw new BadRequestException(`Insufficient stock for ${product.name}. Only ${variant.quantityInStock} available.`);
    }

    // 2. Check if item exists in cart
    let item = await this.cartItemRepository.findOne({
      where: { cartId, variantId },
    });

    if (item) {
      // Update quantity (increment)
      item.quantity += quantity;
      item.subtotal = Number(item.quantity) * Number(item.unitPrice);
    } else {
      // Get main image URL safely
      let imageUrl = '';
      if (product.imageUrls && product.imageUrls.length > 0) {
        imageUrl = product.imageUrls[0];
      }

      // Create new item
      item = this.cartItemRepository.create({
        cartId,
        productId,
        variantId,
        quantity,
        unitPrice: variant.price || product.price,
        subtotal: Number(quantity) * Number(variant.price || product.price),
        productName: product.name,
        variantName: variant.variantName || variant.sku,
        imageUrl: imageUrl,
        notes,
      });
    }

    await this.cartItemRepository.save(item);
  }

  /**
   * Update cart item
   */
  async updateCartItem(userId: number | null, sessionId: string, itemId: number, dto: UpdateCartItemDto) {
    const cart = await this.getCart(userId, sessionId);
    const item = await this.cartItemRepository.findOne({ where: { id: itemId, cartId: cart.id } });

    if (!item) throw new NotFoundException('Item not found in cart');

    if (dto.quantity !== undefined) {
      if (dto.quantity <= 0) {
        return this.removeFromCart(userId, sessionId, itemId);
      }

      // Check stock
      const variant = await this.productVariantRepository.findOne({ where: { id: item.variantId } });
      if (variant && variant.quantityInStock < dto.quantity) {
        throw new BadRequestException(`Insufficient stock. Only ${variant.quantityInStock} available.`);
      }

      item.quantity = dto.quantity;
      item.subtotal = Number(item.quantity) * Number(item.unitPrice);
    }

    if (dto.notes !== undefined) {
      item.notes = dto.notes;
    }

    await this.cartItemRepository.save(item);
    await this.calculateCartTotals(cart.id);

    return this.getFullCart(userId, sessionId);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: number | null, sessionId: string, itemId: number) {
    const cart = await this.getCart(userId, sessionId);
    const item = await this.cartItemRepository.findOne({ where: { id: itemId, cartId: cart.id } });

    if (item) {
      await this.cartItemRepository.remove(item);
      await this.calculateCartTotals(cart.id);
    }

    return this.getFullCart(userId, sessionId);
  }

  /**
   * Clear user cart
   */
  async clearCart(userId: number | null, sessionId?: string) {
    // For clearing, we might not need to be as strict if we just want to clear by ID, 
    // but sticking to the pattern is safer.
    const cart = await this.getCart(userId, sessionId);

    // Hard delete items
    await this.cartItemRepository.delete({ cartId: cart.id });

    // Reset totals
    cart.itemCount = 0;
    cart.subtotal = 0;
    cart.discountAmount = 0;
    cart.couponCode = null as any;
    await this.cartRepository.save(cart);

    return cart;
  }

  /**
   * Update guest customer email
   */
  async updateCustomerEmail(userId: number | null, sessionId: string, dto: UpdateCartEmailDto) {
    const cart = await this.getCart(userId, sessionId);
    cart.customerEmail = dto.email;
    await this.cartRepository.save(cart);
    return this.getFullCart(userId, sessionId);
  }

  /**
   * Recalculate totals
   */
  private async calculateCartTotals(cartId: number) {
    const items = await this.cartItemRepository.find({ where: { cartId } });

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    await this.cartRepository.update(cartId, {
      itemCount,
      subtotal,
    });
  }
}
