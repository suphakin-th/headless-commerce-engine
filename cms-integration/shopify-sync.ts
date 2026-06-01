import 'dotenv/config';
import type { ShopifyProduct } from '../shared/types';

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-01';
const BACKEND_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3000';
const ADMIN_TOKEN = process.env.BACKEND_ADMIN_TOKEN;

if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
  console.error('Missing Shopify env vars. Copy .env.example → .env and fill in values.');
  process.exit(1);
}

const shopifyBase = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}`;
const shopifyHeaders = {
  'X-Shopify-Access-Token': ACCESS_TOKEN,
  'Content-Type': 'application/json',
};

interface ShopifyRawProduct {
  id: number;
  title: string;
  body_html: string;
  handle: string;
  variants: Array<{ id: number; price: string; inventory_quantity: number; sku: string }>;
  images: Array<{ id: number; src: string; alt: string | null }>;
}

interface ShopifyProductsResponse {
  products: ShopifyRawProduct[];
  next?: string;
}

function mapProduct(raw: ShopifyRawProduct): ShopifyProduct {
  return {
    id: String(raw.id),
    title: raw.title,
    body_html: raw.body_html,
    handle: raw.handle,
    variants: raw.variants.map((v) => ({
      id: String(v.id),
      title: v.sku || 'Default',
      price: v.price,
      inventory_quantity: v.inventory_quantity,
      sku: v.sku,
    })),
    images: raw.images.map((i) => ({ id: String(i.id), src: i.src, alt: i.alt })),
  };
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let url: string | undefined = `${shopifyBase}/products.json?limit=250`;

  while (url) {
    const res = await fetch(url, { headers: shopifyHeaders });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as ShopifyProductsResponse;
    all.push(...data.products.map(mapProduct));

    // Shopify uses Link header for pagination
    const linkHeader = res.headers.get('link') ?? '';
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch?.[1];
  }

  return all;
}

async function pushToBackend(products: ShopifyProduct[]): Promise<{ synced: number; errors: number }> {
  if (!ADMIN_TOKEN) {
    console.warn('BACKEND_ADMIN_TOKEN not set — skipping backend upsert, writing to shopify-products.json only');
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  await Promise.allSettled(
    products.map(async (p) => {
      const primaryVariant = p.variants[0];
      const primaryImage = p.images[0];

      const body = {
        name: p.title,
        description: p.body_html.replace(/<[^>]+>/g, '').trim() || p.title,
        price: parseFloat(primaryVariant?.price ?? '0'),
        imageUrl: primaryImage?.src ?? 'https://placehold.co/400x400',
        inventory: primaryVariant?.inventory_quantity ?? 0,
        shopifyProductId: p.id,
        shopifyVariantId: primaryVariant?.id ?? '',
      };

      const res = await fetch(`${BACKEND_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        synced++;
      } else {
        console.error(`Failed to upsert product ${p.id}: ${res.status}`);
        errors++;
      }
    }),
  );

  return { synced, errors };
}

async function main(): Promise<void> {
  console.log(`Fetching products from Shopify store: ${SHOP_DOMAIN}...`);

  const products = await fetchAllProducts();
  console.log(`Fetched ${products.length} products from Shopify`);

  products.forEach((p) => {
    const variant = p.variants[0];
    console.log(`  [${p.id}] ${p.title} — $${variant?.price} (${variant?.inventory_quantity} in stock)`);
  });

  const { synced, errors } = await pushToBackend(products);
  if (ADMIN_TOKEN) console.log(`\nBackend sync: ${synced} synced, ${errors} errors`);

  const { writeFileSync } = await import('fs');
  writeFileSync('./shopify-products.json', JSON.stringify(products, null, 2));
  console.log('Products written to shopify-products.json');
}

main().catch((err) => {
  console.error('Shopify sync failed:', err);
  process.exit(1);
});
