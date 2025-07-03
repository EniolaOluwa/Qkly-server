import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType } from '../business-type.entity';
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
} from '../dto/responses.dto';

@Injectable()
export class BusinessTypesService {
  constructor(
    @InjectRepository(BusinessType)
    private businessTypeRepository: Repository<BusinessType>,
  ) {}

  async createBusinessType(
    createBusinessTypeDto: CreateBusinessTypeDto,
  ): Promise<BusinessType> {
    try {
      // Check if business type already exists
      const existingBusinessType = await this.businessTypeRepository.findOne({
        where: { name: createBusinessTypeDto.name },
      });

      if (existingBusinessType) {
        throw new ConflictException(
          'Business type with this name already exists',
        );
      }

      // Create new business type
      const businessType = this.businessTypeRepository.create({
        name: createBusinessTypeDto.name,
      });

      // Save business type to database
      return await this.businessTypeRepository.save(businessType);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create business type');
    }
  }

  async findAllBusinessTypes(): Promise<BusinessType[]> {
    return await this.businessTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findBusinessTypeById(id: number): Promise<BusinessType> {
    const businessType = await this.businessTypeRepository.findOne({
      where: { id },
    });
    if (!businessType) {
      throw new NotFoundException(`Business type with ID ${id} not found`);
    }
    return businessType;
  }

  async updateBusinessType(
    id: number,
    updateBusinessTypeDto: UpdateBusinessTypeDto,
  ): Promise<BusinessType> {
    try {
      const businessType = await this.findBusinessTypeById(id);

      // Check if the new name conflicts with existing business types
      if (
        updateBusinessTypeDto.name &&
        updateBusinessTypeDto.name !== businessType.name
      ) {
        const existingBusinessType = await this.businessTypeRepository.findOne({
          where: { name: updateBusinessTypeDto.name },
        });

        if (existingBusinessType) {
          throw new ConflictException(
            'Business type with this name already exists',
          );
        }
      }

      // Update the business type
      Object.assign(businessType, updateBusinessTypeDto);
      return await this.businessTypeRepository.save(businessType);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update business type');
    }
  }

  async deleteBusinessType(id: number): Promise<void> {
    const businessType = await this.findBusinessTypeById(id);
    await this.businessTypeRepository.remove(businessType);
  }
}
