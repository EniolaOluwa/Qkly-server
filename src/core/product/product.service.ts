import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { PaginationDto, PaginationResultDto } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { CategoryService } from '../category/category.service';
import { Category } from '../category/entity/category.entity';
import { User } from '../users/entity/user.entity';
import { CreateProductDto, FindAllProductsDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entity/product.entity';




@Injectable()
export class ProductService {
  constructor(
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


      return await this.productRepository.save(product);
    } catch (error) {
      ErrorHelper.InternalServerErrorException(`Error creating product: ${error.message}`, error);
    }
  }



  async findAllProducts(query: FindAllProductsDto): Promise<PaginationResultDto<Product>> {
    try {
      const qb = this.buildProductQuery(query);

      const { skip, limit, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

      const allowedSortFields = [
        'id', 'name', 'price', 'quantityInStock', 'createdAt', 'updatedAt'
      ];

      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(`product.${validSortBy}`, validSortOrder);

      // Count after all filters
      const itemCount = await qb.getCount();

      const data = await qb.skip(skip).take(limit).getMany();

      return new PaginationResultDto(data, { itemCount, pageOptionsDto: query });
    } catch (error) {
      ErrorHelper.InternalServerErrorException(
        `Error finding products: ${error.message}`,
        error
      );
    }
  }



  async findProductById(id: number): Promise<Product> {
    try {
      const product = await this.productRepository.findOne({
        where: { id },
        relations: ['user', 'category', 'business', 'sizes'],
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



  buildProductQuery(query: FindAllProductsDto) {
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.sizes', 'sizes')
      .leftJoinAndSelect('product.category', 'category')
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
      updatedBefore
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
      qb.andWhere(
        inStock ? 'product.quantityInStock > 0' : 'product.quantityInStock <= 0'
      );
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

    return qb;
  }
}
