import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { CategoryService } from '../category/category.service';
import { Category } from '../category/entity/category.entity';
import { User } from '../users/entity/user.entity';
import { CreateProductDto, FindAllProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entity/product.entity';
import { UserProgressService } from '../user-progress/user-progress.service';
import { UserProgressEvent } from '../user-progress/entities/user-progress.entity';




@Injectable()
export class ProductService {
  constructor(
    private readonly userProgressService: UserProgressService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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

      const savedProduct = await this.productRepository.save(product);


      const productCount = await this.productRepository.count({ where: { userId } });

      if (productCount === 1) {
        await this.userProgressService.addProgress(userId, UserProgressEvent.FIRST_PRODUCT_CREATED);
      }


      return savedProduct;
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error creating product: ${error.message}`, error);
    }
  }




  async findAllProducts(query: FindAllProductsDto): Promise<Product[] | PaginationResultDto<Product>> {
    try {
      const qb = this.buildProductQuery(query);
      return this.paginateProducts(qb, query);
    } catch (error) {
      ErrorHelper.InternalServerErrorException(
        `Error finding products: ${error.message}`,
        error,
      );
    }
  }



  async findProductById(id: number): Promise<Product> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.sizes', 'sizes')
      .leftJoin('product.category', 'category')
      .addSelect(['category.id', 'category.name'])
      .leftJoin('product.user', 'user')
      .addSelect(['user.id']) // add more fields if needed
      .where('product.id = :id', { id })
      .getOne();

    if (!product) {
      ErrorHelper.NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }



  async findProductsByUserId(
    userId: number,
    pageOptionsDto?: PaginationDto,
  ): Promise<Product[] | PaginationResultDto<Product>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) ErrorHelper.NotFoundException(`User with ID ${userId} not found`);

    const qb = this.buildProductQuery({ userId });
    return this.paginateProducts(qb, pageOptionsDto);
  }


  async findProductsByBusinessId(
    businessId: number,
    pageOptionsDto?: PaginationDto,
  ): Promise<Product[] | PaginationResultDto<Product>> {
    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) ErrorHelper.NotFoundException(`Business with ID ${businessId} not found`);

    const qb = this.buildProductQuery({ businessId });
    return this.paginateProducts(qb, pageOptionsDto);
  }



  async updateProduct(
    id: number,
    updateData: UpdateProductDto,
  ): Promise<Product> {
    try {
      const product = await this.findProductById(id);

      // Validate variations
      if (updateData.hasVariation !== undefined) {
        const hasSizes =
          (updateData.sizes && updateData.sizes.length > 0) ||
          (product.sizes && product.sizes.length > 0 && !updateData.sizes);
        const hasColors =
          (updateData.colors && updateData.colors.length > 0) ||
          (product.colors && product.colors.length > 0 && !updateData.colors);

        if (updateData.hasVariation && !hasSizes && !hasColors) {
          ErrorHelper.BadRequestException(
            'Product marked as having variations must include at least one size or color.',
          );
        }
      }

      // Handle category update by name
      if (updateData.category) {
        let category = await this.categoryRepository.findOne({
          where: { name: updateData.category },
        });

        // If category does not exist, create it
        if (!category) {
          category = this.categoryRepository.create({ name: updateData.category });
          category = await this.categoryRepository.save(category);
        }

        product.category = category;
        product.categoryId = category.id;
      }

      // Assign other fields
      Object.assign(product, {
        ...updateData,
        category: product.category,
        categoryId: product.categoryId,
      });

      return await this.productRepository.save(product);
    } catch (error) {
      ErrorHelper.InternalServerErrorException(
        `Error updating product: ${error.message}`,
        error,
      );
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



  buildProductQuery(
    query: Partial<FindAllProductsDto> & { userId?: number; businessId?: number }
  ) {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.sizes', 'sizes')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.user', 'user')
      .where('product.deletedAt IS NULL')
      .distinct(true);

    const {
      userId,
      businessId,
      categoryId,
      search,
      minPrice,
      maxPrice,
      inStock,
      hasVariation,
      colors,
      sizes,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
    } = query;

    if (userId) qb.andWhere('product.userId = :userId', { userId });
    if (businessId) qb.andWhere('product.businessId = :businessId', { businessId });
    if (categoryId) qb.andWhere('product.categoryId = :categoryId', { categoryId });

    if (search) {
      qb.andWhere(
        '(LOWER(product.name) LIKE LOWER(:search) OR LOWER(product.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (minPrice !== undefined) qb.andWhere('product.price >= :minPrice', { minPrice });
    if (maxPrice !== undefined) qb.andWhere('product.price <= :maxPrice', { maxPrice });

    if (inStock !== undefined) {
      qb.andWhere(inStock ? 'product.quantityInStock > 0' : 'product.quantityInStock <= 0');
    }

    if (hasVariation !== undefined) {
      qb.andWhere('product.hasVariation = :hasVariation', { hasVariation });
    }

    if (colors?.length) {
      qb.andWhere('product.colors && ARRAY[:...colors]', { colors });
    }

    if (sizes?.length) {
      const sub = qb.subQuery()
        .select('ps.productId')
        .from('product_sizes', 'ps')
        .where('ps.value && ARRAY[:...sizes]', { sizes })
        .getQuery();

      qb.andWhere(`product.id IN ${sub}`);
    }

    if (createdAfter) qb.andWhere('product.createdAt >= :createdAfter', { createdAfter: new Date(createdAfter) });
    if (createdBefore) qb.andWhere('product.createdAt <= :createdBefore', { createdBefore: new Date(createdBefore) });
    if (updatedAfter) qb.andWhere('product.updatedAt >= :updatedAfter', { updatedAfter: new Date(updatedAfter) });
    if (updatedBefore) qb.andWhere('product.updatedAt <= :updatedBefore', { updatedBefore: new Date(updatedBefore) });

    // Select fields explicitly; include only businessId, not full business
    return qb.select([
      'product',       // all product fields
      'sizes',
      'category',
      'user.id',       // just user id (or add fields if needed)
      'product.businessId', // only businessId
    ]);
  }

  private async paginateProducts(
    qb: SelectQueryBuilder<Product>,
    pageOptionsDto?: PaginationDto,
  ): Promise<Product[] | PaginationResultDto<Product>> {
    if (!pageOptionsDto) return qb.getMany();

    const { skip, limit, order = 'DESC' } = pageOptionsDto;

    // Clone query for count
    const countQb = qb.clone();
    const itemCount = await countQb.getCount();

    const data = await qb
      .orderBy('product.createdAt', order)
      .skip(skip)
      .take(limit)
      .getMany();

    return new PaginationResultDto(data, { itemCount, pageOptionsDto });
  }
}
