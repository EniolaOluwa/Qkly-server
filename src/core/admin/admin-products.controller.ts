import {
  Controller,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Admin } from '../../common/decorators/admin.decorator';
import { Product } from '../product/entity/product.entity';
import { OrderItem } from '../order/entity/order-items.entity';
import { Category } from '../category/entity/category.entity';
import { Business } from '../businesses/business.entity';
import { User } from '../users';
import { PaginationMetadataDto } from '../../common/queries/dto/page-meta.dto';
import { DateFilterUtil } from '../../common/utils/date-filter.util';
import {
  ProductFilterDto,
  StockStatusEnum,
  ProductSortByEnum,
} from './dto/product-filter.dto';
import {
  ProductMetricsDto,
  TopProductDto,
  CategoryDistributionDto,
} from './dto/product-metrics.dto';
import {
  ProductListItemDto,
  ProductsListResponseDto,
} from './dto/product-list-item.dto';
import { ErrorHelper } from '../../common/utils';

@Admin()
@ApiTags('Admin Products')
@ApiBearerAuth()
@Controller('admin/products')
export class AdminProductsController {
  private readonly logger = new Logger(AdminProductsController.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  @Get('metrics')
  @ApiOperation({
    summary: 'Get comprehensive platform-wide product metrics (Admin only)',
    description:
      'Retrieves detailed product analytics including stock levels, top products, category distribution, and inventory value',
  })
  @ApiQuery({
    name: 'startDate',
    description:
      'Start date for filtering metrics (ISO 8601 format). If not provided, all-time metrics are returned.',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    description:
      'End date for filtering metrics (ISO 8601 format). Must be used with startDate.',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved product metrics',
    type: ProductMetricsDto,
  })
  async getProductMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ProductMetricsDto> {
    try {
      // Build base query with optional date filter
      let productQuery = this.productRepository.createQueryBuilder('product');

      if (startDate && endDate) {
        productQuery.andWhere(
          'product.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
        );
      }

      // Get all products for calculations
      const products = await productQuery.getMany();
      const totalProducts = products.length;

      // Calculate stock metrics
      const inStockProducts = products.filter((p) => p.quantityInStock > 0).length;
      const outOfStockProducts = products.filter((p) => p.quantityInStock === 0).length;
      const lowStockProducts = products.filter(
        (p) => p.quantityInStock > 0 && p.quantityInStock < 10,
      ).length;

      // Calculate price metrics
      const totalPrice = products.reduce(
        (sum, product) => sum + Number(product.price),
        0,
      );
      const averagePrice =
        totalProducts > 0 ? totalPrice / totalProducts : 0;

      // Calculate total inventory value
      const totalInventoryValue = products.reduce(
        (sum, product) =>
          sum + Number(product.price) * product.quantityInStock,
        0,
      );

      // Count unique merchants
      const uniqueMerchantIds = new Set(products.map((p) => p.businessId));
      const totalMerchants = uniqueMerchantIds.size;

      // Count products with variations
      const productsWithVariations = products.filter((p) => p.hasVariation).length;

      // Get top 10 best-selling products
      const topProducts = await this.getTopProducts(startDate, endDate);

      // Get category distribution
      const categoryDistribution = await this.getCategoryDistribution();

      return {
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        lowStockProducts,
        averagePrice: averagePrice.toFixed(2),
        totalInventoryValue: totalInventoryValue.toFixed(2),
        totalMerchants,
        productsWithVariations,
        topProducts,
        categoryDistribution,
      };
    } catch (error) {
      this.logger.error(`Failed to get product metrics: ${error.message}`);
      ErrorHelper.InternalServerErrorException(
        `Failed to retrieve product metrics: ${error.message}`,
      );
    }
  }

  @Get('lists')
  @ApiOperation({
    summary: 'Get platform-wide product list with comprehensive filtering (Admin only)',
    description:
      'Retrieves all products across the platform with advanced filtering options including stock status, price range, category, business, and more',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved product list',
    type: ProductsListResponseDto,
  })
  async getProductsList(
    @Query() filterDto: ProductFilterDto,
  ): Promise<ProductsListResponseDto> {
    try {
      const { skip, limit, order, sortBy } = filterDto;

      // Build the query with joins
      let queryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.business', 'business')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.user', 'user')
        .leftJoin('order_items', 'orderItem', 'orderItem.productId = product.id')
        .select([
          'product.id',
          'product.name',
          'product.description',
          'product.price',
          'product.quantityInStock',
          'product.hasVariation',
          'product.images',
          'product.createdAt',
          'product.updatedAt',
          'business.id',
          'business.businessName',
          'category.id',
          'category.name',
          'user.email',
        ])
        .addSelect('COALESCE(SUM(orderItem.quantity), 0)', 'totalSold')
        .addSelect(
          'COALESCE(SUM(orderItem.subtotal), 0)',
          'totalRevenue',
        )
        .groupBy('product.id')
        .addGroupBy('business.id')
        .addGroupBy('category.id')
        .addGroupBy('user.id');

      // Apply filters
      queryBuilder = this.applyFilters(queryBuilder, filterDto);

      // Apply sorting
      const sortField = sortBy || ProductSortByEnum.CREATED_AT;
      if (sortField === ProductSortByEnum.TOTAL_SALES) {
        queryBuilder.orderBy('SUM(orderItem.quantity)', order);
      } else if (sortField === ProductSortByEnum.NAME) {
        queryBuilder.orderBy('product.name', order);
      } else if (sortField === ProductSortByEnum.PRICE) {
        queryBuilder.orderBy('product.price', order);
      } else if (sortField === ProductSortByEnum.QUANTITY) {
        queryBuilder.orderBy('product.quantityInStock', order);
      } else {
        queryBuilder.orderBy('product.createdAt', order);
      }

      // Get count for pagination (before applying skip/limit)
      const countQueryBuilder = this.productRepository
        .createQueryBuilder('product')
        .leftJoin('product.business', 'business')
        .leftJoin('product.category', 'category')
        .leftJoin('product.user', 'user');

      const countQuery = this.applyFilters(countQueryBuilder, filterDto);

      // Execute queries in parallel
      const [results, totalCount] = await Promise.all([
        queryBuilder.skip(skip).take(limit).getRawAndEntities(),
        countQuery.getCount(),
      ]);

      // Map results to DTOs
      const productsData: ProductListItemDto[] = results.entities.map(
        (product, index) => {
          const raw = results.raw[index];
          const stockStatus = this.getStockStatus(product.quantityInStock);

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: Number(product.price).toFixed(2),
            quantityInStock: product.quantityInStock,
            stockStatus,
            businessId: product.business?.id,
            businessName: product.business?.businessName || 'N/A',
            categoryId: product.category?.id,
            categoryName: product.category?.name || 'N/A',
            ownerEmail: product.user?.email || 'N/A',
            hasVariation: product.hasVariation,
            images: product.imageUrls || [],
            totalSold: parseInt(raw.totalSold) || 0,
            totalRevenue: parseFloat(raw.totalRevenue).toFixed(2),
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          };
        },
      );

      const meta = new PaginationMetadataDto({
        pageOptionsDto: filterDto,
        itemCount: totalCount,
      });

      return { data: productsData, meta };
    } catch (error) {
      this.logger.error(`Failed to get products list: ${error.message}`);
      ErrorHelper.InternalServerErrorException(
        `Failed to retrieve products list: ${error.message}`,
      );
    }
  }

  // Helper method to apply filters
  private applyFilters(
    queryBuilder: SelectQueryBuilder<Product>,
    filterDto: ProductFilterDto,
  ): SelectQueryBuilder<Product> {
    const {
      search,
      categoryId,
      businessId,
      userId,
      stockStatus,
      dateFilter,
      customStartDate,
      customEndDate,
      minPrice,
      maxPrice,
      minQuantity,
      maxQuantity,
      hasVariation,
    } = filterDto;

    // Search filter (product name or description)
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Category filter
    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId,
      });
    }

    // Business filter
    if (businessId) {
      queryBuilder.andWhere('product.businessId = :businessId', {
        businessId,
      });
    }

    // User/Merchant filter
    if (userId) {
      queryBuilder.andWhere('product.userId = :userId', { userId });
    }

    // Stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case StockStatusEnum.IN_STOCK:
          queryBuilder.andWhere('product.quantityInStock > 0');
          break;
        case StockStatusEnum.OUT_OF_STOCK:
          queryBuilder.andWhere('product.quantityInStock = 0');
          break;
        case StockStatusEnum.LOW_STOCK:
          queryBuilder.andWhere(
            'product.quantityInStock > 0 AND product.quantityInStock < 10',
          );
          break;
      }
    }

    // Date range filter
    if (dateFilter) {
      const dateRange = DateFilterUtil.getDateRange(
        dateFilter,
        customStartDate ? new Date(customStartDate) : undefined,
        customEndDate ? new Date(customEndDate) : undefined,
      );

      queryBuilder.andWhere(
        'product.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      );
    }

    // Price range filters
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Quantity range filters
    if (minQuantity !== undefined) {
      queryBuilder.andWhere('product.quantityInStock >= :minQuantity', {
        minQuantity,
      });
    }

    if (maxQuantity !== undefined) {
      queryBuilder.andWhere('product.quantityInStock <= :maxQuantity', {
        maxQuantity,
      });
    }

    // Has variation filter
    if (hasVariation !== undefined) {
      queryBuilder.andWhere('product.hasVariation = :hasVariation', {
        hasVariation,
      });
    }

    return queryBuilder;
  }

  // Helper method to get top products
  private async getTopProducts(
    startDate?: string,
    endDate?: string,
  ): Promise<TopProductDto[]> {
    let queryBuilder = this.orderItemRepository
      .createQueryBuilder('orderItem')
      .leftJoin('orderItem.product', 'product')
      .leftJoin('product.business', 'business')
      .leftJoin('product.category', 'category')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('product.price', 'productPrice')
      .addSelect('product.quantityInStock', 'productQuantity')
      .addSelect('business.businessName', 'businessName')
      .addSelect('category.name', 'categoryName')
      .addSelect('SUM(orderItem.quantity)', 'totalSold')
      .addSelect('SUM(orderItem.subtotal)', 'totalRevenue')
      .where('product.id IS NOT NULL')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.price')
      .addGroupBy('product.quantityInStock')
      .addGroupBy('business.businessName')
      .addGroupBy('category.name')
      .orderBy('SUM(orderItem.quantity)', 'DESC')
      .limit(10);

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'orderItem.createdAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    }

    const results = await queryBuilder.getRawMany();

    return results.map((raw) => {
      return {
        id: raw.productId,
        name: raw.productName || 'N/A',
        businessName: raw.businessName || 'N/A',
        categoryName: raw.categoryName || 'N/A',
        price: Number(raw.productPrice || 0).toFixed(2),
        totalSold: parseInt(raw.totalSold) || 0,
        totalRevenue: parseFloat(raw.totalRevenue || 0).toFixed(2),
        quantityInStock: raw.productQuantity || 0,
      };
    });
  }

  // Helper method to get category distribution
  private async getCategoryDistribution(): Promise<
    CategoryDistributionDto[]
  > {
    const totalProducts = await this.productRepository.count();

    const results = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(product.id)', 'productCount')
      .where('category.id IS NOT NULL')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('COUNT(product.id)', 'DESC')
      .getRawMany();

    return results.map((raw) => {
      const productCount = parseInt(raw.productCount) || 0;
      const percentage =
        totalProducts > 0 ? (productCount / totalProducts) * 100 : 0;

      return {
        categoryId: raw.categoryId,
        categoryName: raw.categoryName || 'N/A',
        productCount,
        percentage: parseFloat(percentage.toFixed(2)),
      };
    });
  }

  // Helper method to determine stock status
  private getStockStatus(quantity: number): string {
    if (quantity === 0) {
      return StockStatusEnum.OUT_OF_STOCK;
    } else if (quantity < 10) {
      return StockStatusEnum.LOW_STOCK;
    } else {
      return StockStatusEnum.IN_STOCK;
    }
  }
}
