import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { Product } from '../product/entity/product.entity';
import { StoreFrontProductQueryDto } from './dto/store-front-query.dto';
import {
  PaginatedProductsDto,
  PublicBusinessInfoDto,
  PublicProductDetailDto,
  PublicProductDto,
  StoreFrontCategoryDto,
} from './dto/store-front-response.dto';

@Injectable()
export class StoreFrontService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async getBusinessByUserId(userId: number): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { userId },
    });

    if (!business) {
      throw new NotFoundException('Business not found for this user');
    }

    return business;
  }

  async getStoreInfo(businessId: number): Promise<PublicBusinessInfoDto> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['businessType'],
    });

    if (!business) {
      ErrorHelper.NotFoundException(`Store with ID ${businessId} not found`);
    }

    return {
      id: business.id,
      businessName: business.businessName,
      businessDescription: business.businessDescription,
      location: business.location,
      logo: business.logo,
      businessType: {
        id: business.businessType.id,
        name: business.businessType.name,
      },
      createdAt: business.createdAt,
    };
  }

  async getStoreProducts(
    businessId: number,
    query: StoreFrontProductQueryDto,
  ): Promise<PaginatedProductsDto> {
    // Verify business exists
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });

    if (!business) {
      ErrorHelper.NotFoundException(`Store with ID ${businessId} not found`);
    }

    const {
      page = 1,
      limit = 20,
      categoryId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    // Build query
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.quantityInStock > 0');

    // Apply filters
    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(product.name) LIKE LOWER(:search) OR LOWER(product.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Apply sorting
    const allowedSortFields = ['name', 'price', 'createdAt'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`product.${validSortBy}`, sortOrder);

    // Get total count
    const totalItems = await qb.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    const products = await qb.skip(skip).take(limit).getMany();

    // Transform to public DTO (remove sensitive data)
    const data: PublicProductDto[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      quantityInStock: product.quantityInStock,
      hasVariation: product.hasVariation,
      colors: product.colors,
      sizes: product.sizes,
      images: product.images || [],
      category: {
        id: product.category.id,
        name: product.category.name,
      },
      createdAt: product.createdAt,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getProductDetail(businessId: number, productId: number): Promise<PublicProductDetailDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
      relations: ['category', 'business', 'sizes'],
    });

    if (!product) {
      ErrorHelper.NotFoundException(
        `Product with ID ${productId} not found in store ${businessId}`,
      );
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      quantityInStock: product.quantityInStock,
      hasVariation: product.hasVariation,
      colors: product.colors,
      sizes: product.sizes,
      images: product.images || [],
      category: {
        id: product.category.id,
        name: product.category.name,
      },
      business: {
        id: product.business.id,
        businessName: product.business.businessName,
        logo: product.business.logo,
      },
      createdAt: product.createdAt,
    };
  }

  async getStoreCategories(businessId: number): Promise<StoreFrontCategoryDto[]> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });

    if (!business) {
      ErrorHelper.NotFoundException(`Store with ID ${businessId} not found`);
    }

    const categoriesWithCounts = await this.productRepository
      .createQueryBuilder('product')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(product.id)', 'productCount')
      .leftJoin('product.category', 'category')
      .where('product.businessId = :businessId', { businessId })
      .andWhere('product.quantityInStock > 0')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('category.name', 'ASC')
      .getRawMany();

    return categoriesWithCounts.map((cat) => ({
      id: parseInt(cat.id),
      name: cat.name,
      productCount: parseInt(cat.productCount),
    }));
  }

  async getProductsByCategory(
    businessId: number,
    categoryId: number,
    query: StoreFrontProductQueryDto,
  ): Promise<PaginatedProductsDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      ErrorHelper.NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.getStoreProducts(businessId, { ...query, categoryId });
  }
}
