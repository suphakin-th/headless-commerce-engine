import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItemEntity } from './entities/cart-item.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import type { Cart, CartItem } from '@shared/types';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItemEntity)
    private readonly items: Repository<CartItemEntity>,
  ) {}

  async getCart(userId: string): Promise<Cart> {
    const entities = await this.items.find({ where: { userId } });
    return this.toCart(entities);
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<Cart> {
    const existing = await this.items.findOne({
      where: { userId, productId: dto.productId },
    });

    if (existing) {
      await this.items.update(existing.id, { quantity: existing.quantity + dto.quantity });
    } else {
      await this.items.save(this.items.create({ userId, productId: dto.productId, quantity: dto.quantity }));
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string): Promise<Cart> {
    const item = await this.items.findOne({ where: { userId, productId } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.items.remove(item);
    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    await this.items.delete({ userId });
  }

  private toCart(entities: CartItemEntity[]): Cart {
    const items: CartItem[] = entities.map((e) => ({
      productId: e.productId,
      product: {
        id: e.product.id,
        name: e.product.name,
        description: e.product.description,
        price: Number(e.product.price),
        imageUrl: e.product.imageUrl,
        inventory: e.product.inventory,
        shopifyProductId: e.product.shopifyProductId,
        shopifyVariantId: e.product.shopifyVariantId,
        createdAt: e.product.createdAt.toISOString(),
        updatedAt: e.product.updatedAt.toISOString(),
      },
      quantity: e.quantity,
    }));

    const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    return { items, total };
  }
}
