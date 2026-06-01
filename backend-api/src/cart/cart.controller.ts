import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserEntity } from '../auth/entities/user.entity';

interface AuthRequest extends Request {
  user: UserEntity;
}

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user\'s cart' })
  getCart(@Request() req: AuthRequest) {
    return this.cart.getCart(req.user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the cart (increments qty if already present)' })
  addItem(@Request() req: AuthRequest, @Body() dto: AddToCartDto) {
    return this.cart.addItem(req.user.id, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product from the cart' })
  removeItem(@Request() req: AuthRequest, @Param('productId') productId: string) {
    return this.cart.removeItem(req.user.id, productId);
  }
}
