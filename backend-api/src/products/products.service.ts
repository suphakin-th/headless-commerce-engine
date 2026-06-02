import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import type { PaginatedResponse, Product } from '@shared/types';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
  ) {}

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Product>> {
    const [entities, total] = await this.products.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: entities.map(this.toProduct),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Product> {
    const entity = await this.products.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    return this.toProduct(entity);
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const entity = this.products.create(dto);
    const saved = await this.products.save(entity);
    return this.toProduct(saved);
  }

  async upsertByShopifyId(dto: CreateProductDto & { shopifyProductId: string }): Promise<Product> {
    const existing = await this.products.findOne({
      where: { shopifyProductId: dto.shopifyProductId },
    });

    if (existing) {
      await this.products.update(existing.id, dto);
      return this.findOne(existing.id);
    }

    return this.create(dto);
  }

  private toProduct(e: ProductEntity): Product {
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      price: Number(e.price),
      imageUrl: e.imageUrl,
      inventory: e.inventory,
      shopifyProductId: e.shopifyProductId,
      shopifyVariantId: e.shopifyVariantId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
