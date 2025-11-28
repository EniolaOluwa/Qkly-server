import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { Admin } from "../../common/decorators/admin.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { RoleGuard } from "../users";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";


@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Post()
  async create(@Body() createDto: CreateCategoryDto) {
    const data = await this.categoryService.create(createDto);
    return HttpResponse.success({
      data,
      message: 'Categories Created successfully',
      statusCode: 201
    });
  }

  @Public()
  @Get()
  async findAll() {
    const data = await this.categoryService.findAll();
    return HttpResponse.success({
      data,
      message: 'Category fetched successfully',
    });
  }


  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.categoryService.findOne(id);
    return HttpResponse.success({
      data,
      message: 'Category fetched successfully',
    });
  }


  // only admin can update category
  @UseGuards(RoleGuard)
  @Admin()
  @Put(':id')
  @ApiBearerAuth()
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto) {
    const data = await this.categoryService.update(id, updateDto);
    return HttpResponse.success({
      data,
      message: 'Category updated successfully',
      statusCode: 200
    });
  }



  // only admin can delete categories
  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoryService.remove(id);
    return HttpResponse.success({
      data: null,
      message: 'Category deleted successfully',
      statusCode: 204
    });
  }



  // get total under a category
  @Public()
  @Get(':categoryId/product-count')
  @ApiOperation({ summary: 'Get number of products under a category (including children)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Product count returned successfully.' })
  async getProductCount(@Param('id') id: number) {
    const totalProducts = await this.categoryService.getTotalProductsInCategory(id);
    return HttpResponse.success({
      data: {
        totalProducts,
        categoryId: id
      },
      message: 'Category deleted successfully',
      statusCode: 200
    });
  }


  //get total number of product in a product
  @Public()
  @Get(':businesId/product')
  @ApiOperation({
    summary: 'Return products grouped by category for a business (paginated)',
  })
  async getGroupedProducts(
    @Param('businessId') businessId: number,
  ) {
    const data = await this.categoryService.getBusinessProductsGroupedByCategory(
      businessId,
    );
    return HttpResponse.success({
      data,
      message: 'Category product fetched successfully',
      statusCode: 200
    });
  }


  @Get('business/:businessId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch all categories for a business',
    description: 'Returns a list of all categories belonging to the specified business.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Business not found',
  })
  async getBusinessCategories(
    @Param('businessId') businessId: number,
  ) {
    const data = await this.categoryService.getCategoriesForBusiness(businessId);

    return HttpResponse.success({
      data,
      message: 'Success',
      statusCode: 200
    });
  }
}
