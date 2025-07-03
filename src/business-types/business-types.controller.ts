import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BusinessTypesService } from './business-types.service';
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
  BusinessTypeResponseDto,
} from '../dto/responses.dto';

@ApiTags('business-types')
@Controller('business-types')
export class BusinessTypesController {
  constructor(private readonly businessTypesService: BusinessTypesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new business type',
    description: 'Creates a new business type with the provided name',
  })
  @ApiResponse({
    status: 201,
    description: 'Business type created successfully',
    type: BusinessTypeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Business type with this name already exists',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createBusinessType(
    @Body(ValidationPipe) createBusinessTypeDto: CreateBusinessTypeDto,
  ): Promise<BusinessTypeResponseDto> {
    const businessType = await this.businessTypesService.createBusinessType(
      createBusinessTypeDto,
    );
    return {
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all business types',
    description: 'Retrieves all business types ordered by name',
  })
  @ApiResponse({
    status: 200,
    description: 'Business types retrieved successfully',
    type: [BusinessTypeResponseDto],
  })
  async getAllBusinessTypes(): Promise<BusinessTypeResponseDto[]> {
    const businessTypes =
      await this.businessTypesService.findAllBusinessTypes();
    return businessTypes.map((businessType) => ({
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get business type by ID',
    description: 'Retrieves a business type by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Business type retrieved successfully',
    type: BusinessTypeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Business type not found',
  })
  async getBusinessTypeById(
    @Param('id') id: number,
  ): Promise<BusinessTypeResponseDto> {
    const businessType =
      await this.businessTypesService.findBusinessTypeById(id);
    return {
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update business type',
    description: 'Updates an existing business type',
  })
  @ApiResponse({
    status: 200,
    description: 'Business type updated successfully',
    type: BusinessTypeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Business type not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Business type with this name already exists',
  })
  async updateBusinessType(
    @Param('id') id: number,
    @Body(ValidationPipe) updateBusinessTypeDto: UpdateBusinessTypeDto,
  ): Promise<BusinessTypeResponseDto> {
    const businessType = await this.businessTypesService.updateBusinessType(
      id,
      updateBusinessTypeDto,
    );
    return {
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete business type',
    description: 'Deletes a business type by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Business type deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Business type not found',
  })
  async deleteBusinessType(
    @Param('id') id: number,
  ): Promise<{ message: string }> {
    await this.businessTypesService.deleteBusinessType(id);
    return { message: 'Business type deleted successfully' };
  }
}
