import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserEntity } from '../auth/entities/user.entity';

interface AuthRequest extends Request {
  user: UserEntity;
}

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Stripe Checkout session for the given cart items' })
  createCheckout(@Request() req: AuthRequest, @Body() dto: CreateCheckoutSessionDto) {
    return this.orders.createCheckoutSession(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders for the authenticated user' })
  myOrders(@Request() req: AuthRequest) {
    return this.orders.findByUser(req.user.id);
  }
}
