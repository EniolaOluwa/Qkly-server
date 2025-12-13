import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { HttpResponse } from "../../common/utils/http-response.utils";
import { CategoryService } from "./category.service";


@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }
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
  @Get('business/:businessId/products')
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


  @Public()
  @Get('business/:businessId')
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
