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
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

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
  async getCart(userId: number | null, sessionId?: string): Promise<Cart> {
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
        currency: 'NGN', // Default
      });
      await this.cartRepository.save(cart);
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
  async getCartItems(cartId: number): Promise<CartItem[]> {
    return this.cartItemRepository.find({
      where: { cartId },
      relations: ['product', 'variant'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get full cart with items
   */
  async getFullCart(userId: number | null, sessionId?: string) {
    const cart = await this.getCart(userId, sessionId);
    const items = await this.getCartItems(cart.id);
    return { ...cart, items };
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: number | null, sessionId: string, dto: AddToCartDto) {
    const { productId, variantId, quantity, notes } = dto;

    // 1. Validate Product & Variant
    const product = await this.productRepository.findOne({ where: { id: productId }, relations: ['images'] });
    if (!product) throw new NotFoundException('Product not found');

    const variant = await this.productVariantRepository.findOne({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Product variant not found');

    if (variant.quantityInStock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // 2. Get Cart
    const cart = await this.getCart(userId, sessionId);

    // 3. Check if item exists
    let item = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, variantId },
    });

    if (item) {
      // Update quantity
      item.quantity += quantity;
      item.subtotal = Number(item.quantity) * Number(item.unitPrice);
    } else {
      // Get main image URL safely
      // Product entity has imageUrls (string[]) or images (OneToMany)
      // We will look at imageUrls first as it's a simple array, or check images relation if loaded
      let imageUrl = '';
      if (product.imageUrls && product.imageUrls.length > 0) {
        imageUrl = product.imageUrls[0];
      }

      // Create new item
      item = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        variantId,
        quantity,
        unitPrice: variant.price || product.price, // Use variant price if set, else product price
        subtotal: Number(quantity) * Number(variant.price || product.price),
        productName: product.name,
        variantName: variant.variantName || variant.sku,
        imageUrl: imageUrl,
        notes,
      });
    }

    await this.cartItemRepository.save(item);

    // 4. Update Cart Totals
    await this.calculateCartTotals(cart.id);

    return this.getFullCart(userId, sessionId);
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
