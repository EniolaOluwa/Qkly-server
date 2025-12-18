import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { Admin } from "../../common/decorators/admin.decorator";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { CreateCategoryDto } from "../category/dto/create-category.dto";
import { CategoryService } from "../category/category.service";
import { CategoryStatsDto } from "../category/dto/category-stats.dto";
import { CategoriesListResponseDto } from "../category/dto/categories-list-response.dto";
import { CategoryFilterDto } from "../category/dto/category-list-item.dto";
import { CategoryDetailDto } from "../category/dto/category-detail.dto";
import { UpdateCategoryDto } from "../category/dto/update-category.dto";

@Admin()
@ApiTags('Admin Categories')
@ApiBearerAuth()
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoryService: CategoryService) { }


  @Post('create')
  async create(@Body() createDto: CreateCategoryDto) {
    const data = await this.categoryService.create(createDto);
    return HttpResponse.success({
      data,
      message: 'Categories Created successfully',
      statusCode: 201
    });
  }


  @Get('stats')
  @ApiOperation({
    summary: 'Get category statistics',
    description: 'Retrieves category statistics including total categories, new categories this month, and total products',
  })
  @ApiResponse({
    status: 200,
    description: 'Category statistics retrieved successfully',
    type: CategoryStatsDto,
  })
  async getCategoryStats(): Promise<CategoryStatsDto> {
    return this.categoryService.getCategoryStats();
  }


  @Get('list')
  @ApiOperation({
    summary: 'Get paginated list of categories',
    description: 'Retrieves a paginated list of all categories with product counts, business counts, and filtering options',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories list retrieved successfully',
    type: CategoriesListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameters',
  })
  async getCategories(
    @Query() filterDto: CategoryFilterDto,
  ): Promise<CategoriesListResponseDto> {
    return this.categoryService.getCategoriesList(filterDto);
  }



  @Get(':id')
  @ApiOperation({
    summary: 'Get category details with products',
    description: 'Retrieves detailed information about a specific category including all products under it',
  })
  @ApiResponse({
    status: 200,
    description: 'Category details retrieved successfully',
    type: CategoryDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async getCategoryDetail(@Param('id', ParseIntPipe) id: number): Promise<CategoryDetailDto> {
    return this.categoryService.getCategoryDetail(id);
  }


  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto) {
    const data = await this.categoryService.update(id, updateDto);
    return HttpResponse.success({
      data,
      message: 'Category updated successfully',
      statusCode: 200
    });
  }


  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id);
    return HttpResponse.success({
      data: null,
      message: 'Category deleted successfully',
      statusCode: 204
    });
  }
}