import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './entity/category.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ErrorHelper } from '@app/common/utils';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) { }

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

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({ relations: ['children', 'parent'] });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id }, relations: ['children', 'parent'] });
    if (!category) ErrorHelper.NotFoundException('Category not found');
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
}
