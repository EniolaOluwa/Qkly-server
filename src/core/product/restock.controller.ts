import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { HttpResponse } from '../../common/utils/http-response.utils';
import { RestockProductDto } from './dto/restock-product.dto';
import { ProductService } from './product.service';

@ApiTags('Products')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class RestockController {
  constructor(private readonly productService: ProductService) { }

  @Patch('restock/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restock product',
    description: 'Update the stock level of a product or its variant. (Dedicated Endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Product restocked successfully',
  })
  async restockProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockProductDto,
    @Request() req: any
  ) {
    const userId = req.user.userId;
    // Ownership check delegated to service
    const product = await this.productService.restockProduct(id, userId, dto);

    // Sanitize minimally or duplicate helper logic? 
    // Let's just return product for now, sanitation is nice to have but functionality is key.
    return HttpResponse.success({
      data: product,
      message: 'Product restocked successfully'
    });
  }
}
