
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entity/product.entity';
import { Business } from '../businesses/business.entity';
import { Category } from '../category/entity/category.entity';
import { StoreFront } from './entities/store-front.entity';
import {
  PublicBusinessInfoDto,
  PublicProductDto,
  PublicProductDetailDto,
  StoreFrontCategoryDto,
  PaginatedProductsDto,
  StoreFrontResponseDto
} from './dto/store-front-response.dto';
import { StoreFrontProductQueryDto } from './dto/store-front-query.dto';
import { CreateStoreFrontDto } from './dto/create-store-front.dto';
import { UpdateStoreFrontDto } from './dto/update-store-front.dto';
import { ErrorHelper } from '../../common/utils';
import { CloudinaryUtil } from '../../common/utils/cloudinary.util';

@Injectable()
export class StoreFrontService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(StoreFront)
    private readonly storeFrontRepository: Repository<StoreFront>,
    private readonly cloudinaryUtil: CloudinaryUtil,
  ) { }

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
    query: StoreFrontProductQueryDto
  ): Promise<PaginatedProductsDto> {
    // Verify business exists
    const business = await this.businessRepository.findOne({
      where: { id: businessId }
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
      sortOrder = 'DESC'
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
        { search: `%${search}%` }
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
    const data: PublicProductDto[] = products.map(product => ({
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
  ): Promise<PaginatedProductsDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId }
    });

    if (!category) {
      ErrorHelper.NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.getStoreProducts(businessId, { ...query, categoryId });
  }

  async createStoreFront(
    businessId: number,
    createStoreFrontDto: CreateStoreFrontDto,
    coverImage?: Express.Multer.File,
    categoryImages?: Express.Multer.File[],
  ): Promise<StoreFrontResponseDto> {
    // Verify business exists
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found`);
    }

    // Check if store-front already exists for this business
    const existingStoreFront = await this.storeFrontRepository.findOne({
      where: { businessId },
    });

    if (existingStoreFront) {
      throw new ConflictException('Store front already exists for this business');
    }

    // Upload cover image
    if (!coverImage && !createStoreFrontDto.coverImage) {
      throw new BadRequestException('Cover image is required');
    }

    const coverImageFile = coverImage || createStoreFrontDto.coverImage;
    if (!coverImageFile) {
      throw new BadRequestException('Cover image is required');
    }

    const coverImageUpload = await this.cloudinaryUtil.uploadImage(
      coverImageFile.buffer,
      'Qkly/store-fronts/cover',
    );
    const coverImageUrl = coverImageUpload.secure_url;

    // Upload category images if provided
    let categoryImageUrls: string[] = [];
    const categoryImageFiles = categoryImages || createStoreFrontDto.categoryImages || [];

    if (categoryImageFiles.length > 0) {
      // Ensure category names and images arrays match in length
      if (createStoreFrontDto.categoryName && 
          createStoreFrontDto.categoryName.length !== categoryImageFiles.length) {
        throw new BadRequestException(
          'Number of category names must match number of category images',
        );
      }

      // Upload all category images
      const uploadPromises = categoryImageFiles.map((file) =>
        this.cloudinaryUtil.uploadImage(
          file.buffer,
          'Qkly/store-fronts/categories',
        ),
      );
      const uploadResults = await Promise.all(uploadPromises);
      categoryImageUrls = uploadResults.map((result) => result.secure_url);
    }

    // Create store-front
    const storeFront = this.storeFrontRepository.create({
      businessId,
      coverImage: coverImageUrl,
      storeName: createStoreFrontDto.storeName,
      heroText: createStoreFrontDto.heroText,
      storeColor: createStoreFrontDto.storeColor,
      categoryName: createStoreFrontDto.categoryName || [],
      categoryImage: categoryImageUrls,
    });

    const savedStoreFront = await this.storeFrontRepository.save(storeFront);

    return {
      id: savedStoreFront.id,
      businessId: savedStoreFront.businessId,
      coverImage: savedStoreFront.coverImage,
      storeName: savedStoreFront.storeName,
      heroText: savedStoreFront.heroText,
      storeColor: savedStoreFront.storeColor,
      categoryName: savedStoreFront.categoryName,
      categoryImage: savedStoreFront.categoryImage,
      createdAt: savedStoreFront.createdAt,
      updatedAt: savedStoreFront.updatedAt,
    };
  }

  async updateStoreFront(
    businessId: number,
    updateStoreFrontDto: UpdateStoreFrontDto,
    coverImage?: Express.Multer.File,
    categoryImages?: Express.Multer.File[],
  ): Promise<StoreFrontResponseDto> {
    // Find existing store-front
    const storeFront = await this.storeFrontRepository.findOne({
      where: { businessId },
    });

    if (!storeFront) {
      throw new NotFoundException('Store front not found for this business');
    }

    // Update cover image if provided
    if (coverImage || updateStoreFrontDto.coverImage) {
      const coverImageFile = coverImage || updateStoreFrontDto.coverImage;
      if (coverImageFile) {
        const coverImageUpload = await this.cloudinaryUtil.uploadImage(
          coverImageFile.buffer,
          'Qkly/store-fronts/cover',
        );
        storeFront.coverImage = coverImageUpload.secure_url;
      }
    }

    // Update category images if provided
    const categoryImageFiles = categoryImages || updateStoreFrontDto.categoryImages || [];
    if (categoryImageFiles.length > 0) {
      // Ensure category names and images arrays match in length if both are provided
      if (updateStoreFrontDto.categoryName && 
          updateStoreFrontDto.categoryName.length !== categoryImageFiles.length) {
        throw new BadRequestException(
          'Number of category names must match number of category images',
        );
      }

      // Upload all category images
      const uploadPromises = categoryImageFiles.map((file) =>
        this.cloudinaryUtil.uploadImage(
          file.buffer,
          'Qkly/store-fronts/categories',
        ),
      );
      const uploadResults = await Promise.all(uploadPromises);
      storeFront.categoryImage = uploadResults.map((result) => result.secure_url);
    }

    // Update other fields
    if (updateStoreFrontDto.storeName !== undefined) {
      storeFront.storeName = updateStoreFrontDto.storeName;
    }
    if (updateStoreFrontDto.heroText !== undefined) {
      storeFront.heroText = updateStoreFrontDto.heroText;
    }
    if (updateStoreFrontDto.storeColor !== undefined) {
      storeFront.storeColor = updateStoreFrontDto.storeColor;
    }
    if (updateStoreFrontDto.categoryName !== undefined) {
      storeFront.categoryName = updateStoreFrontDto.categoryName;
    }

    const updatedStoreFront = await this.storeFrontRepository.save(storeFront);

    return {
      id: updatedStoreFront.id,
      businessId: updatedStoreFront.businessId,
      coverImage: updatedStoreFront.coverImage,
      storeName: updatedStoreFront.storeName,
      heroText: updatedStoreFront.heroText,
      storeColor: updatedStoreFront.storeColor,
      categoryName: updatedStoreFront.categoryName,
      categoryImage: updatedStoreFront.categoryImage,
      createdAt: updatedStoreFront.createdAt,
      updatedAt: updatedStoreFront.updatedAt,
    };
  }
}