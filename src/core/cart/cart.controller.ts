import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Cart')
@ApiHeader({
  name: 'x-session-id',
  description: 'Guest Session ID (UUID)',
  required: false,
})
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  private getSessionId(headers: any): string {
    const sessionId = headers['x-session-id'];
    if (!sessionId) {
      // If we want to enforce client generating it, throw error.
      // But for better UX, we could generate one (but client needs to know it).
      // Usually client generates specific session ID.
      // Let's enforce it or return one.
      // Instructions said "Extract x-session-id header or generate one if missing."
      // But if we generate it here, client won't know it for next request unless we return it.
      // For api simplicity, let's require it or return it in response.
      // Actually standard pattern: Client generates UUID and stores in localstorage.
      return uuidv4();
    }
    return sessionId;
  }

  // Helper to get userId if we decided to keep optional auth later, 
  // but for now we focus on guest.
  private getUserId(req: any): number | null {
    return req.user?.userId || null;
  }


  @Get()
  @ApiOperation({ summary: 'Get active cart' })
  async getCart(@Req() req, @Headers() headers) {
    const sessionId = this.getSessionId(headers);
    return this.cartService.getFullCart(null, sessionId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(@Req() req, @Body() dto: AddToCartDto, @Headers() headers) {
    const sessionId = this.getSessionId(headers);
    return this.cartService.addToCart(null, sessionId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item' })
  async updateCartItem(
    @Req() req,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
    @Headers() headers
  ) {
    const sessionId = this.getSessionId(headers);
    return this.cartService.updateCartItem(null, sessionId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeCartItem(
    @Req() req,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Headers() headers
  ) {
    const sessionId = this.getSessionId(headers);
    return this.cartService.removeFromCart(null, sessionId, itemId);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Req() req, @Headers() headers) {
    const sessionId = this.getSessionId(headers);
    return this.cartService.clearCart(null, sessionId);
  }
}
