/**
 * Shopify Custom App — Webhook Registration Script
 *
 * Registers the backend webhooks on your Shopify store so Shopify
 * pushes events directly to your NestJS endpoint.
 *
 * Run: npx tsx shopify-plugin/index.ts
 */
import 'dotenv/config';

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2024-01';
const BACKEND_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3000';

if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
  console.error('SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN are required');
  process.exit(1);
}

const base = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}`;
const headers = {
  'X-Shopify-Access-Token': ACCESS_TOKEN,
  'Content-Type': 'application/json',
};

interface WebhookRegistration {
  topic: string;
  address: string;
}

const webhooks: WebhookRegistration[] = [
  { topic: 'products/create', address: `${BACKEND_URL}/webhooks/shopify/products` },
  { topic: 'products/update', address: `${BACKEND_URL}/webhooks/shopify/products` },
  { topic: 'products/delete', address: `${BACKEND_URL}/webhooks/shopify/products` },
  { topic: 'inventory_levels/update', address: `${BACKEND_URL}/webhooks/shopify/inventory` },
  { topic: 'orders/paid', address: `${BACKEND_URL}/webhooks/shopify/orders` },
];

interface ExistingWebhook {
  id: number;
  topic: string;
  address: string;
}

interface WebhooksListResponse {
  webhooks: ExistingWebhook[];
}

async function getExistingWebhooks(): Promise<ExistingWebhook[]> {
  const res = await fetch(`${base}/webhooks.json`, { headers });
  if (!res.ok) throw new Error(`Failed to list webhooks: ${res.status}`);
  const data = (await res.json()) as WebhooksListResponse;
  return data.webhooks;
}

async function registerWebhook(topic: string, address: string): Promise<void> {
  const res = await fetch(`${base}/webhooks.json`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to register ${topic}: ${body}`);
  }
}

async function deleteWebhook(id: number): Promise<void> {
  await fetch(`${base}/webhooks/${id}.json`, { method: 'DELETE', headers });
}

async function main(): Promise<void> {
  console.log(`Connecting to Shopify store: ${SHOP_DOMAIN}\n`);

  const existing = await getExistingWebhooks();

  // Remove stale registrations pointing to a different backend URL
  const stale = existing.filter(
    (w) => webhooks.some((r) => r.topic === w.topic) && !w.address.startsWith(BACKEND_URL),
  );

  await Promise.all(
    stale.map(async (w) => {
      await deleteWebhook(w.id);
      console.log(`  Removed stale webhook: ${w.topic} → ${w.address}`);
    }),
  );

  // Register new webhooks, skipping those already registered
  const alreadyRegistered = new Set(existing.filter((w) => w.address.startsWith(BACKEND_URL)).map((w) => w.topic));

  await Promise.allSettled(
    webhooks.map(async ({ topic, address }) => {
      if (alreadyRegistered.has(topic)) {
        console.log(`  Already registered: ${topic}`);
        return;
      }
      await registerWebhook(topic, address);
      console.log(`  Registered: ${topic} → ${address}`);
    }),
  );

  console.log('\nWebhook registration complete.');
}

main().catch((err) => {
  console.error('Webhook registration failed:', err);
  process.exit(1);
});
