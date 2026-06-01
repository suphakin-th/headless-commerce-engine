import { Controller, Post, Headers, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('stripe')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Stripe webhook endpoint — validates Stripe-Signature header before processing',
  })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.webhooks.handleStripeWebhook(req.rawBody!, signature);
  }
}
