import { ErrorHelper } from '@app/common/utils';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entity/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entity/category.entity';

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
}
