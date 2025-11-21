import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { CategoryService } from '../category/category.service';
import { User } from '../users';
import { CreateProductDto, FindAllProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entity/product.entity';
import { generateRandomProduct } from '../../common/utils/product-generator';



@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly categoryService: CategoryService
  ) { }


  async verifyBusinessOwnership(userId: number, businessId: number): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId }
    });

    if (!business) {
      ErrorHelper.NotFoundException(`Business with ID ${businessId} not found`);
    }

    if (business.userId !== userId) {
      ErrorHelper.ForbiddenException(
        'Access denied: You can only manage products for your own business'
      );
    }
  }

  // Product methods
  async createProduct(userId: number, productData: CreateProductDto): Promise<Product> {
    try {
      const userExists = await this.userRepository.findOne({ where: { id: userId } });
      if (!userExists) {
        ErrorHelper.BadRequestException('User does not exist.');
      }

      const businessExists = await this.businessRepository.findOne({ where: { id: productData.businessId } });
      if (!businessExists) {
        ErrorHelper.BadRequestException('Business does not exist.');
      }

      if (productData.hasVariation) {
        const hasSizes = productData.sizes && productData.sizes.length > 0;
        const hasColors = productData.colors && productData.colors.length > 0;

        if (!hasSizes && !hasColors) {
          ErrorHelper.BadRequestException(
            'Product marked as having variations must include at least one size or color.',
          );
        }
      }

      if (!productData.category) {
        ErrorHelper.BadRequestException('Category is required for this product.');
      }

      const category = await this.categoryService.findOrCreate(productData.category);

      const { category: _, ...rest } = productData;

      const product = this.productRepository.create({
        ...rest,
        categoryId: category.id,
        userId
      });

      return await this.productRepository.save(product);
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error creating product: ${error.message}`, error);
    }
  }

  async findAllProducts(
    query: FindAllProductsDto,
  ): Promise<PaginationResultDto<Product>> {
    try {
      const {
        userId,
        businessId,
        categoryId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        minPrice,
        maxPrice,
        inStock,
        hasVariation,
        colors,
        sizes,
        createdAfter,
        createdBefore,
        updatedAfter,
        updatedBefore
      } = query;

      // Create a QueryBuilder for more flexibility
      const qb = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.sizes', 'sizes')


      // User filter
      if (userId) {
        qb.andWhere('product.userId = :userId', { userId });
      }

      // Business filter
      if (businessId) {
        qb.andWhere('product.businessId = :businessId', { businessId });
      }

      // Category filter
      if (categoryId) {
        qb.andWhere('product.categoryId = :categoryId', { categoryId });
      }

      // Search filter (case-insensitive)
      if (search) {
        qb.andWhere(
          '(LOWER(product.name) LIKE LOWER(:search) OR LOWER(product.description) LIKE LOWER(:search))',
          { search: `%${search}%` }
        );
      }

      // Price range filter
      if (minPrice !== undefined) {
        qb.andWhere('product.price >= :minPrice', { minPrice });
      }

      if (maxPrice !== undefined) {
        qb.andWhere('product.price <= :maxPrice', { maxPrice });
      }

      // Stock filter
      if (inStock !== undefined) {
        if (inStock) {
          qb.andWhere('product.quantityInStock > 0');
        } else {
          qb.andWhere('product.quantityInStock <= 0');
        }
      }

      // Variation filter
      if (hasVariation !== undefined) {
        qb.andWhere('product.hasVariation = :hasVariation', { hasVariation });
      }

      // Colors filter
      if (colors && colors.length > 0) {
        qb.andWhere(`product.colors && ARRAY[:...colors]`, { colors });
      }

      // Size filter
      if (sizes && sizes.length > 0) {
        // For sizes, we'll need a more complex query since sizes are in a related table
        qb.andWhere(qb => {
          const subQuery = qb
            .subQuery()
            .select('product_size.productId')
            .from('product_sizes', 'product_size')
            .where('product_size.value && ARRAY[:...sizes]', { sizes })
            .getQuery();
          return 'product.id IN ' + subQuery;
        });
      }

      // Date range filters
      if (createdAfter) {
        qb.andWhere('product.createdAt >= :createdAfter', {
          createdAfter: new Date(createdAfter)
        });
      }

      if (createdBefore) {
        qb.andWhere('product.createdAt <= :createdBefore', {
          createdBefore: new Date(createdBefore)
        });
      }

      if (updatedAfter) {
        qb.andWhere('product.updatedAt >= :updatedAfter', {
          updatedAfter: new Date(updatedAfter)
        });
      }

      if (updatedBefore) {
        qb.andWhere('product.updatedAt <= :updatedBefore', {
          updatedBefore: new Date(updatedBefore)
        });
      }

      const itemCount = await qb.getCount();

      const { skip, limit } = query;

      // Add sorting
      const allowedSortFields = [
        'id', 'name', 'price', 'quantityInStock', 'createdAt', 'updatedAt'
      ];

      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(`product.${validSortBy}`, validSortOrder);

      // Apply pagination
      const data = await qb
        .skip(skip)
        .take(limit)
        .getMany();

      return new PaginationResultDto(data, {
        itemCount,
        pageOptionsDto: query,
      });
    } catch (error) {
      console.log(error)
      ErrorHelper.InternalServerErrorException(`Error finding products: ${error.message}`, error);
    }
  }

  async findProductById(id: number): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['user', 'category', 'business'],
      });

      if (!product) {
        ErrorHelper.NotFoundException(`Product with ID ${id} not found`);
      }

      return product;
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error finding product by id: ${error.message}`, error);
    }
  }

  async findProductsByUserId(
    userId: number,
    pageOptionsDto?: PaginationDto
  ): Promise<Product[] | PaginationResultDto<Product>> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        ErrorHelper.NotFoundException(`User with ID ${userId} not found`);
      }

      if (pageOptionsDto) {
        const qb = this.productRepository
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.sizes', 'sizes')
          .where('product.userId = :userId', { userId });

        const itemCount = await qb.getCount();
        const { skip, limit, order } = pageOptionsDto;

        const data = await qb
          .skip(skip)
          .take(limit)
          .orderBy('product.createdAt', order)
          .getMany();

        return new PaginationResultDto(data, {
          itemCount,
          pageOptionsDto,
        });
      }

      return await this.productRepository.find({
        where: { userId },
        relations: ['sizes'],
      });
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error finding products by user id: ${error.message}`, error);
    }
  }

  async findProductsByBusinessId(
    businessId: number,
    pageOptionsDto?: PaginationDto
  ): Promise<Product[] | PaginationResultDto<Product>> {
    try {
      const business = await this.businessRepository.findOne({ where: { id: businessId } });

      if (!business) {
        ErrorHelper.NotFoundException(`Business with ID ${businessId} not found`);
      }

      if (pageOptionsDto) {
        const qb = this.productRepository
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.sizes', 'sizes')
          .where('product.businessId = :businessId', { businessId });

        const itemCount = await qb.getCount();
        const { skip, limit, order } = pageOptionsDto;

        const data = await qb
          .skip(skip)
          .take(limit)
          .orderBy('product.createdAt', order)
          .getMany();

        return new PaginationResultDto(data, {
          itemCount,
          pageOptionsDto,
        });
      }

      return await this.productRepository.find({
        where: { businessId },
        relations: ['user', 'business', 'sizes'],
      });
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error finding products by business id: ${error.message}`, error);
    }
  }

  async updateProduct(
    id: number,
    updateData: UpdateProductDto,
  ): Promise<Product> {
    try {
      const product = await this.findProductById(id);

      if (updateData.hasVariation !== undefined) {
        const hasSizes = (updateData.sizes && updateData.sizes.length > 0) ||
          (product.sizes && product.sizes.length > 0 && !updateData.sizes);
        const hasColors = (updateData.colors && updateData.colors.length > 0) ||
          (product.colors && product.colors.length > 0 && !updateData.colors);

        if (updateData.hasVariation && !hasSizes && !hasColors) {
          ErrorHelper.BadRequestException(
            'Product marked as having variations must include at least one size or color.',
          );
        }
      }

      Object.assign(product, updateData);
      return await this.productRepository.save(product);
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error updating product: ${error.message}`, error);
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      const product = await this.findProductById(id);
      await this.productRepository.remove(product);
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error deleting product: ${error.message}`, error);
    }
  }
}
