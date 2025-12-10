import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import {
  BusinessResponseDto,
  BusinessTypeResponseDto,
  CreateBusinessDto,
  CreateBusinessTypeDto,
  UpdateBusinessDto,
  UpdateBusinessTypeDto,
} from '../../common/dto/responses.dto';
import { BusinessGuard } from '../../common/guards/business.guard';
import { ErrorHelper } from '../../common/utils';
import { Business } from './business.entity';
import { BusinessesService } from './businesses.service';


@ApiTags('Business')
@Controller('business')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) { }

  // ==================== BUSINESS TYPE ENDPOINTS ====================

  @Post('types')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    return await this.businessesService.findAllBusinessTypes();
  }

  @Get('types/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  // ==================== BUSINESS ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1, },
    ], {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/tiff',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Invalid file type. Supported formats: JPEG, JPG, PNG, GIF, WebP, BMP, TIFF',
            ),
            false,
          );
        }
      }
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new business',
    description:
      'Creates a new business with the provided information. User must be on business information onboarding step. Successfully creating a business advances the user to KYC verification step.',
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
    status: 409,
    description:
      'Conflict - User already has a business or not on correct onboarding step',
  })
  async createBusiness(
    @Body(ValidationPipe) createBusinessDto: CreateBusinessDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
    },
    @CurrentUser('userId') userId: number,
  ): Promise<BusinessResponseDto> {
    if (!files.logo) {
      ErrorHelper.BadRequestException('Logo is required for business creation');
    }

    if (files.logo) createBusinessDto.logo = files.logo[0];

    const business = await this.businessesService.createBusiness(
      createBusinessDto,
      userId,
    );

    return this.mapBusinessToResponse(business);
  }

  @Get('my-business')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user business',
    description: 'Retrieves the business associated with the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User business retrieved successfully',
    type: BusinessResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User has no business',
  })
  async getMyBusiness(
    @CurrentUser('businessId') businessId: number,
  ): Promise<BusinessResponseDto> {
    const business = await this.businessesService.findBusinessById(businessId);
    return this.mapBusinessToResponse(business);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    return businesses.map((business) => this.mapBusinessToResponse(business));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get business by ID',
    description: 'Retrieves a business by its ID with business type information',
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
    return this.mapBusinessToResponse(business);
  }


  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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

  @Patch('settings/:id')
  @UseGuards(JwtAuthGuard, BusinessGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update business details',
    description: 'Allows an authenticated user to update their business details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Business updated successfully',
    type: BusinessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid payload',
  })
  @ApiResponse({
    status: 404,
    description: 'Business record not found',
  })
  async updateBusinessDetails(
    @Param('id') id: number,
    @Body(ValidationPipe) updateBusinessDto: UpdateBusinessDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      coverImage?: Express.Multer.File[];
    },
    @CurrentUser('userId') userId: number,
  ): Promise<BusinessResponseDto> {
    if (files.logo) updateBusinessDto.logo = files.logo[0];
    if (files.coverImage) updateBusinessDto.coverImage = files.coverImage[0];

    const business = await this.businessesService.updateBusinessDetails(
      updateBusinessDto,
      userId,
      id,
    );

    return this.mapBusinessToResponse(business);
  }

  // ==================== HELPER METHOD ====================
  private mapBusinessToResponse(business: Business): BusinessResponseDto {
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
      logo: business.logo,
      coverImage: business.coverImage,
      storeName: business.storeName,
      heroText: business.heroText,
      storeColor: business.storeColor,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }
}
