import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { ShopifyService } from './shopify.service';
import { WordPressService } from './wordpress.service';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  controllers: [IntegrationsController],
  providers: [ShopifyService, WordPressService],
  exports: [ShopifyService, WordPressService],
})
export class IntegrationsModule {}
