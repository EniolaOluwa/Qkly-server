import { Controller, Post, Body, Get, Param, ParseIntPipe, Put, Delete, UseGuards } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { Public } from "../../common/decorators/public.decorator";
import { Admin } from "../../common/decorators/admin.decorator";
import { RoleGuard } from "../users";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";



@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  // only admin can create categories
  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Post()
  create(@Body() createDto: CreateCategoryDto) {
    return this.categoryService.create(createDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }


  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }


  // only admin can update category
  @UseGuards(RoleGuard)
  @Admin()
  @Put(':id')
  @ApiBearerAuth()
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateDto);
  }



  // only admin can delete categories
  @UseGuards(RoleGuard)
  @Admin()
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }



   // special category fetch
   // get total under a category
    @Public()
    @Get(':categoryId/product-count')
    @ApiOperation({ summary: 'Get number of products under a category (including children)' })
    @ApiParam({ name: 'id', type: Number })
    @ApiResponse({ status: 200, description: 'Product count returned successfully.' })
    async getProductCount(@Param('id') id: number) {
      return {
        categoryId: id,
        totalProducts: await this.categoryService.getTotalProductsInCategoryTree(id),
      };
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
        return this.categoryService.getBusinessProductsGroupedByCategory(
          businessId,
        );
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
          return this.categoryService.getCategoriesForBusiness(businessId);
        }

}
