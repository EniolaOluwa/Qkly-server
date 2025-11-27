import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entity/category.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ErrorHelper } from '@app/common/utils';
import { Product } from '../product/entity/product.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) { }

  // Auto-create or find category by name
  async findOrCreate(name: string, parentId?: number): Promise<Category> {
    const normalized = name.trim();
    let category = await this.categoryRepository.findOne({ where: { name: normalized } });
    if (!category) {
      category = this.categoryRepository.create({ name: normalized, parentId });
      category = await this.categoryRepository.save(category);
    }
    return category;
  }

  async create(createDto: CreateCategoryDto): Promise<Category> {
    return this.findOrCreate(createDto.name, createDto.parentId);
  }

  async findOrCreateCategory(name: string): Promise<Category> {
    // Trim and normalize case for consistency
    const normalized = name.trim();

    let category = await this.categoryRepository.findOne({ where: { name: normalized } });

    if (!category) {
      category = this.categoryRepository.create({ name: normalized });
      category = await this.categoryRepository.save(category);
    }

    return category;
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({ relations: ['children', 'parent'] });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id }, relations: ['children', 'parent'] });
    if (!category) throw new NotFoundException('Category not found');
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

   // GET TOTAL PRODUCTS IN CATEGORY TREE
  async getTotalProductsInCategoryTree(categoryId: number): Promise<number> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['children'],
    });

    if (!category) {
      ErrorHelper.NotFoundException(`Category with ID ${categoryId} does not exist.`);
    }

    const categoryIds: number[] = [categoryId];
    const stack: Category[] = [...(category.children ?? [])];

    while (stack.length) {
      const child = stack.pop();
      if (!child) continue;

      categoryIds.push(child.id);

      if (child.children?.length) {
        stack.push(...child.children);
      }
    }

    return this.productRepository.count({
      where: { categoryId: In(categoryIds) },
    });
  }

  // GET CATEGORIES FOR A BUSINESS
  async getCategoriesForBusiness(businessId: number) {
    const categories = await this.categoryRepository.find({
      where: { id: businessId },
    });

    return {
      message: 'Categories fetched successfully',
      data: categories,
    };
  }


    // get total product for a business
  async getBusinessProductsGroupedByCategory(
    businessId: number,
  ) {
    // Fetch all categories that belong to the business
    const categories = await this.categoryRepository.find({
      where: { id:  businessId },
    });
  
    const results: {
      categoryId: number;
      categoryName: string;
      totalProductsInCategory: number;
      products: Product[];
    }[] = [];
  
    for (const category of categories) {
      // Count products in this category
      const totalProducts = await this.productRepository.count({
        where: {
          businessId,
          categoryId: category.id,
        },
      });
  
      // Fetch products in this category
      const products = await this.productRepository.find({
        where: {
          businessId,
          categoryId: category.id,
        },
        order: { createdAt: 'DESC' },
      });
  
      results.push({
        categoryId: category.id,
        categoryName: category.name,
        totalProductsInCategory: totalProducts,
        products,
      });
    }
  
    return {
      businessId,
      categories: results,
      totalCategories: results.length,
    };
  }
  

 
}
