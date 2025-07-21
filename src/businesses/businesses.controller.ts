import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import {
  CreateBusinessTypeDto,
  UpdateBusinessTypeDto,
  BusinessTypeResponseDto,
  CreateBusinessDto,
  UpdateBusinessDto,
  BusinessResponseDto,
} from '../dto/responses.dto';

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  // Business Type endpoints
  @Post('types')
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
    const businessType = await this.businessesService.createBusinessType(
      createBusinessTypeDto,
    );
    return {
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    };
  }

  @Get('types')
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
    const businessTypes = await this.businessesService.findAllBusinessTypes();
    return businessTypes.map((businessType) => ({
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    }));
  }

  @Get('types/:id')
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
    const businessType = await this.businessesService.findBusinessTypeById(id);
    return {
      id: businessType.id,
      name: businessType.name,
      createdAt: businessType.createdAt,
      updatedAt: businessType.updatedAt,
    };
  }

  @Put('types/:id')
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
    const businessType = await this.businessesService.updateBusinessType(
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

  @Delete('types/:id')
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
    await this.businessesService.deleteBusinessType(id);
    return { message: 'Business type deleted successfully' };
  }

  // Business endpoints
  @Post()
  @ApiOperation({
    summary: 'Create a new business',
    description: 'Creates a new business with the provided information',
  })
  @ApiResponse({
    status: 201,
    description: 'Business created successfully',
    type: BusinessResponseDto,
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
    status: 500,
    description: 'Internal server error',
  })
  async createBusiness(
    @Body(ValidationPipe) createBusinessDto: CreateBusinessDto,
  ): Promise<BusinessResponseDto> {
    const business =
      await this.businessesService.createBusiness(createBusinessDto);
    return {
      id: business.id,
      businessName: business.businessName,
      businessType: {
        id: business.businessType.id,
        name: business.businessType.name,
        createdAt: business.businessType.createdAt,
        updatedAt: business.businessType.updatedAt,
      },
      businessDescription: business.businessDescription,
      location: business.location,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all businesses',
    description: 'Retrieves all businesses with their business types',
  })
  @ApiResponse({
    status: 200,
    description: 'Businesses retrieved successfully',
    type: [BusinessResponseDto],
  })
  async getAllBusinesses(): Promise<BusinessResponseDto[]> {
    const businesses = await this.businessesService.findAllBusinesses();
    return businesses.map((business) => ({
      id: business.id,
      businessName: business.businessName,
      businessType: {
        id: business.businessType.id,
        name: business.businessType.name,
        createdAt: business.businessType.createdAt,
        updatedAt: business.businessType.updatedAt,
      },
      businessDescription: business.businessDescription,
      location: business.location,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get business by ID',
    description:
      'Retrieves a business by its ID with business type information',
  })
  @ApiResponse({
    status: 200,
    description: 'Business retrieved successfully',
    type: BusinessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found',
  })
  async getBusinessById(@Param('id') id: number): Promise<BusinessResponseDto> {
    const business = await this.businessesService.findBusinessById(id);
    return {
      id: business.id,
      businessName: business.businessName,
      businessType: {
        id: business.businessType.id,
        name: business.businessType.name,
        createdAt: business.businessType.createdAt,
        updatedAt: business.businessType.updatedAt,
      },
      businessDescription: business.businessDescription,
      location: business.location,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update business',
    description: 'Updates an existing business',
  })
  @ApiResponse({
    status: 200,
    description: 'Business updated successfully',
    type: BusinessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Business or business type not found',
  })
  async updateBusiness(
    @Param('id') id: number,
    @Body(ValidationPipe) updateBusinessDto: UpdateBusinessDto,
  ): Promise<BusinessResponseDto> {
    const business = await this.businessesService.updateBusiness(
      id,
      updateBusinessDto,
    );
    return {
      id: business.id,
      businessName: business.businessName,
      businessType: {
        id: business.businessType.id,
        name: business.businessType.name,
        createdAt: business.businessType.createdAt,
        updatedAt: business.businessType.updatedAt,
      },
      businessDescription: business.businessDescription,
      location: business.location,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete business',
    description: 'Deletes a business by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Business deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found',
  })
  async deleteBusiness(@Param('id') id: number): Promise<{ message: string }> {
    await this.businessesService.deleteBusiness(id);
    return { message: 'Business deleted successfully' };
  }
}
