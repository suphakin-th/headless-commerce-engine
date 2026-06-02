import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrderEntity } from './entities/order.entity';
import { ProductsService } from '../products/products.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import type { CheckoutSession, Order } from '@shared/types';

@Injectable()
export class OrdersService {
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSession> {
    const products = await Promise.all(
      dto.items.map(({ productId }) => this.productsService.findOne(productId)),
    );

    const lineItems = dto.items.map((item, index) => {
      const product = products[index];
      if (product.inventory < item.quantity) {
        throw new BadRequestException(`Insufficient inventory for ${product.name}`);
      }
      return {
        price_data: {
          currency: 'usd',
          product_data: { name: product.name, images: [product.imageUrl] },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const orderItems = dto.items.map((item, index) => ({
      productId: item.productId,
      productName: products[index].name,
      quantity: item.quantity,
      unitPrice: products[index].price,
    }));

    const total = orderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const order = await this.orders.save(
      this.orders.create({ userId, items: orderItems, total, status: 'pending' }),
    );

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${this.config.getOrThrow('STRIPE_SUCCESS_URL')}?orderId=${order.id}`,
      cancel_url: this.config.getOrThrow('STRIPE_CANCEL_URL'),
      metadata: { orderId: order.id },
    });

    await this.orders.update(order.id, { stripeSessionId: session.id });

    return { sessionId: session.id, url: session.url! };
  }

  async findByUser(userId: string): Promise<Order[]> {
    const entities = await this.orders.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(this.toOrder);
  }

  async markCompleted(stripeSessionId: string, paymentIntentId: string): Promise<void> {
    await this.orders.update(
      { stripeSessionId },
      { status: 'completed', stripePaymentIntentId: paymentIntentId },
    );
  }

  private toOrder(e: OrderEntity): Order {
    return {
      id: e.id,
      userId: e.userId,
      items: e.items,
      total: Number(e.total),
      status: e.status,
      stripePaymentIntentId: e.stripePaymentIntentId,
      stripeSessionId: e.stripeSessionId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
