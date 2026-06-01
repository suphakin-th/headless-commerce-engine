import { Controller, Get, Post, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ShopifyService } from './shopify.service';
import { WordPressService } from './wordpress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly shopify: ShopifyService,
    private readonly wordpress: WordPressService,
  ) {}

  @Post('shopify/sync')
  @ApiOperation({ summary: 'Pull products from Shopify and upsert into local DB' })
  syncShopify() {
    return this.shopify.syncProducts();
  }

  @Get('shopify/products')
  @ApiOperation({ summary: 'List products directly from the Shopify Admin API' })
  shopifyProducts() {
    return this.shopify.getProducts();
  }

  @Get('wordpress/posts')
  @ApiOperation({ summary: 'Fetch published posts from WordPress REST API' })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  wordpressPosts(
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    return this.wordpress.getPosts(perPage);
  }

  @Get('wordpress/pages')
  @ApiOperation({ summary: 'Fetch pages from WordPress REST API (headless CMS content)' })
  wordpressPages() {
    return this.wordpress.getPages();
  }
}
