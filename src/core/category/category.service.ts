import { ErrorHelper } from '@app/common/utils';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entity/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entity/category.entity';
import { DateTime } from 'luxon';
import { PaginationMetadataDto } from '../../common/queries/dto';
import { DateFilterUtil } from '../../common/utils/date-filter.util';
import { CategoriesListResponseDto } from './dto/categories-list-response.dto';
import { CategoryDetailDto } from './dto/category-detail.dto';
import { CategoryProductDto } from './dto/category-filter.dto';
import { CategoryFilterDto } from './dto/category-list-item.dto';
import { CategoryListItemDto } from './dto/category-product.dto';
import { CategoryStatsDto } from './dto/category-stats.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  // Find a category by name, or create if it doesn't exist
  async findOrCreate(name: string): Promise<Category> {
    const normalized = name.trim();
    let category = await this.categoryRepository.findOne({ where: { name: normalized } });
    if (!category) {
      category = this.categoryRepository.create({ name: normalized });
      category = await this.categoryRepository.save(category);
    }
    return category;
  }

  async create(createDto: CreateCategoryDto): Promise<Category> {
    return this.findOrCreate(createDto.name);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      ErrorHelper.NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: number, updateDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }

  async getTotalProductsInCategory(categoryId: number) {
    const category = await this.findOne(categoryId);
    return this.productRepository.count({ where: { categoryId: category.id } });
  }

  async getCategoriesForBusiness(businessId: number) {
    return this.categoryRepository
      .createQueryBuilder('category')
      .select(['category.id', 'category.name'])
      .innerJoin(
        'category.products',
        'product',
        'product.businessId = :businessId',
        { businessId }
      )
      .getMany();
  }

  async getBusinessProductsGroupedByCategory(businessId: number) {
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .innerJoin('category.products', 'product', 'product.businessId = :businessId', { businessId })
      .getMany();

    const results = await Promise.all(
      categories.map(async (category) => {
        const totalProductsInCategory = await this.productRepository.count({
          where: { businessId, categoryId: category.id },
        });

        const products = await this.productRepository.find({
          where: { businessId, categoryId: category.id },
          order: { createdAt: 'DESC' },
        });

        return {
          categoryId: category.id,
          categoryName: category.name,
          totalProductsInCategory,
          products,
        };
      }),
    );

    return {
      businessId,
      categories: results,
      totalCategories: results.length,
    };
  }


  async getCategoryStats(): Promise<CategoryStatsDto> {
    const timezone = process.env.TIMEZONE || 'UTC';
    const now = DateTime.now().setZone(timezone);
    const startOfMonth = now.startOf('month').toJSDate();
    const endOfMonth = now.endOf('month').toJSDate();

    const [totalCategories, newCategoriesThisMonth, totalProducts] = await Promise.all([
      this.categoryRepository.count(),
      this.categoryRepository
        .createQueryBuilder('category')
        .where('category.createdAt BETWEEN :start AND :end', {
          start: startOfMonth,
          end: endOfMonth,
        })
        .getCount(),
      this.productRepository.count({ where: { deletedAt: undefined } }),
    ]);

    return {
      totalCategories,
      newCategoriesThisMonth,
      totalProducts,
    };
  }

  async getCategoriesList(
    filterDto: CategoryFilterDto,
  ): Promise<CategoriesListResponseDto> {
    const { skip, limit, order, search, dateFilter, sortBy } = filterDto;

    // Build query
    let queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .select([
        'category.id',
        'category.name',
        'category.createdAt',
        'category.updatedAt',
      ])
      .addSelect('COUNT(DISTINCT product.id)', 'totalProducts')
      .addSelect('COUNT(DISTINCT product.businessId)', 'totalBusinesses')
      .groupBy('category.id');

    // Apply search filter
    if (search) {
      queryBuilder.andWhere('category.name ILIKE :search', { search: `%${search}%` });
    }

    // Apply date filter
    if (dateFilter) {
      const dateRange = DateFilterUtil.getDateRange(dateFilter);
      queryBuilder.andWhere('category.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    // Apply sorting
    const sortField = sortBy || 'createdAt';
    if (sortField === 'totalProducts') {
      queryBuilder.orderBy('totalProducts', order);
    } else if (sortField === 'name') {
      queryBuilder.orderBy('category.name', order);
    } else {
      queryBuilder.orderBy('category.createdAt', order);
    }

    // Get total count before pagination
    const totalCount = await this.categoryRepository
      .createQueryBuilder('category')
      .where(
        search
          ? 'category.name ILIKE :search'
          : '1=1',
        search ? { search: `%${search}%` } : {},
      )
      .getCount();

    // Execute query with pagination
    const results = await queryBuilder.skip(skip).take(limit).getRawAndEntities();

    // Map results to DTOs
    const categoriesData: CategoryListItemDto[] = results.entities.map((category, index) => {
      const raw = results.raw[index];
      return {
        id: category.id,
        name: category.name,
        totalProducts: parseInt(raw.totalProducts) || 0,
        totalBusinesses: parseInt(raw.totalBusinesses) || 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    });

    const meta = new PaginationMetadataDto({
      pageOptionsDto: filterDto,
      itemCount: totalCount,
    });

    return {
      data: categoriesData,
      meta,
    };
  }

  async getCategoryDetail(categoryId: number): Promise<CategoryDetailDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      ErrorHelper.NotFoundException('Category not found');
    }

    // Get category statistics
    const [totalProducts, totalBusinesses] = await Promise.all([
      this.productRepository.count({
        where: { categoryId, deletedAt: undefined },
      }),
      this.productRepository
        .createQueryBuilder('product')
        .select('COUNT(DISTINCT product.businessId)', 'count')
        .where('product.categoryId = :categoryId', { categoryId })
        .andWhere('product.deletedAt IS NULL')
        .getRawOne()
        .then((result) => parseInt(result.count) || 0),
    ]);

    // Get products with business information
    const productsQuery = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.business', 'business')
      .where('product.categoryId = :categoryId', { categoryId })
      .andWhere('product.deletedAt IS NULL')
      .orderBy('product.createdAt', 'DESC')
      .limit(50) // Limit to 50 products for performance
      .getMany();

    const products: CategoryProductDto[] = productsQuery.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
      quantityInStock: product.quantityInStock,
      images: product.images || [],
      businessName: product.business?.businessName || 'N/A',
      businessId: product.businessId,
      createdAt: product.createdAt,
    }));

    return {
      id: category.id,
      name: category.name,
      totalProducts,
      totalBusinesses,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      products,
    };
  }
}
