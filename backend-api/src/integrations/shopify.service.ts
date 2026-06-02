import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import type { ShopifyProduct } from '@shared/types';

interface ShopifyApiProduct {
  id: number;
  title: string;
  body_html: string;
  variants: Array<{ id: number; price: string; inventory_quantity: number }>;
  images: Array<{ id: number; src: string }>;
}

interface ShopifyProductsResponse {
  products: ShopifyApiProduct[];
}

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;

  constructor(
    private readonly config: ConfigService,
    private readonly productsService: ProductsService,
  ) {
    const domain = config.getOrThrow<string>('SHOPIFY_SHOP_DOMAIN');
    const apiVersion = config.get('SHOPIFY_API_VERSION', '2024-01');
    this.baseUrl = `https://${domain}/admin/api/${apiVersion}`;
    this.headers = {
      'X-Shopify-Access-Token': config.getOrThrow<string>('SHOPIFY_ACCESS_TOKEN'),
      'Content-Type': 'application/json',
    };
  }

  async syncProducts(): Promise<{ synced: number; errors: number }> {
    const shopifyProducts = await this.fetchAllProducts();
    let synced = 0;
    let errors = 0;

    await Promise.allSettled(
      shopifyProducts.map(async (sp) => {
        try {
          const mapped = this.mapToCreateDto(sp);
          await this.productsService.upsertByShopifyId(mapped);
          synced++;
        } catch (err) {
          this.logger.error(`Failed to sync Shopify product ${sp.id}: ${(err as Error).message}`);
          errors++;
        }
      }),
    );

    this.logger.log(`Shopify sync complete — synced: ${synced}, errors: ${errors}`);
    return { synced, errors };
  }

  async getProducts(): Promise<ShopifyProduct[]> {
    const raw = await this.fetchAllProducts();
    return raw.map((p) => ({
      id: String(p.id),
      title: p.title,
      body_html: p.body_html,
      handle: p.title.toLowerCase().replace(/\s+/g, '-'),
      variants: p.variants.map((v) => ({
        id: String(v.id),
        title: 'Default',
        price: v.price,
        inventory_quantity: v.inventory_quantity,
        sku: '',
      })),
      images: p.images.map((i) => ({ id: String(i.id), src: i.src, alt: null })),
    }));
  }

  async registerWebhook(topic: string, callbackUrl: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/webhooks.json`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ webhook: { topic, address: callbackUrl, format: 'json' } }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to register Shopify webhook for ${topic}: ${body}`);
    }

    this.logger.log(`Registered Shopify webhook: ${topic} → ${callbackUrl}`);
  }

  private async fetchAllProducts(): Promise<ShopifyApiProduct[]> {
    const response = await fetch(`${this.baseUrl}/products.json?limit=250`, {
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ShopifyProductsResponse;
    return data.products;
  }

  private mapToCreateDto(p: ShopifyApiProduct) {
    const primaryVariant = p.variants[0];
    const primaryImage = p.images[0];

    return {
      name: p.title,
      description: p.body_html.replace(/<[^>]+>/g, '').trim() || p.title,
      price: parseFloat(primaryVariant?.price ?? '0'),
      imageUrl: primaryImage?.src ?? 'https://placehold.co/400x400',
      inventory: primaryVariant?.inventory_quantity ?? 0,
      shopifyProductId: String(p.id),
      shopifyVariantId: String(primaryVariant?.id ?? ''),
    };
  }
}
