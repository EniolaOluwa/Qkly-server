
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationOrder, PaginationResultDto } from '../../common/queries/dto';
import { ErrorHelper } from '../../common/utils';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { FindAllProductsDto } from '../product/dto/create-product.dto';
import { Product } from '../product/entity/product.entity';
import { ProductService } from '../product/product.service';
import { StoreFrontProductQueryDto } from './dto/store-front-query.dto';
import {
  PublicProductDetailDto,
  StoreFrontCategoryDto
} from './dto/store-front-response.dto';
import { BusinessesService } from '../businesses/businesses.service';


@Injectable()
export class StoreFrontService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly productService: ProductService,
    private readonly businessService: BusinessesService

  ) { }

  async getBusinessByUserId(userId: number): Promise<Business> {
    const business = await this.businessService.findBusinessByUserId(userId);

    if (!business) {
      ErrorHelper.NotFoundException('Business not found for this user');
    }

    return business;
  }


  async getStoreInfo(identifier: number | string) {
    const business =
      await this.businessService.resolveBusinessByIdentifier(identifier, {
        businessType: true,
      });

    return {
      id: business.id,
      businessName: business.businessName,
      businessDescription: business.businessDescription,
      location: business.location,
      logo: business.logo,
      storeName: business.storeName,
      slug: business.slug,
      storeColor: business.storeColor,
      coverImage: business.coverImage,
      businessType: {
        id: business.businessType.id,
        name: business.businessType.name,
      },
      createdAt: business.createdAt,
    };
  }

  async getProductDetail(
    businessId: number,
    productId: number
  ): Promise<PublicProductDetailDto> {
    const product = await this.productRepository.findOne({
      where: { id: productId, businessId },
      relations: ['category', 'business', 'sizes'],
    });

    if (!product) {
      ErrorHelper.NotFoundException(
        `Product with ID ${productId} not found in store ${businessId}`
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
      where: { id: businessId }
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

    return categoriesWithCounts.map(cat => ({
      id: parseInt(cat.id),
      name: cat.name,
      productCount: parseInt(cat.productCount),
    }));
  }

  async getProductsByCategory(
    businessId: number,
    categoryId: number,
    query: StoreFrontProductQueryDto
  ) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId }
    });

    if (!category) {
      ErrorHelper.NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.getStoreProducts(businessId, { ...query, categoryId });
  }

  async getStoreProducts(
    businessId: number,
    query: StoreFrontProductQueryDto
  ): Promise<PaginationResultDto<any>> {
    // Build the query for the product service
    const storeQuery: FindAllProductsDto = {
      businessId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),

      categoryId: query.categoryId,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      inStock: true,

      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'DESC',
      order: query.sortOrder === 'DESC' ? PaginationOrder.DESC : PaginationOrder.ASC,
    };

    // Fetch paginated products
    const result = await this.productService.findAllProducts(storeQuery) as PaginationResultDto<Product>;

    return result
  }
}