# Headless Commerce Engine

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![React Native](https://img.shields.io/badge/React_Native-0.73-61DAFB?logo=react&logoColor=black)
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white)
![Shopify](https://img.shields.io/badge/Shopify-Admin_API-96BF48?logo=shopify&logoColor=white)
![WordPress](https://img.shields.io/badge/WordPress-REST_API-21759B?logo=wordpress&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A production-quality headless e-commerce monorepo. A React web storefront and React Native mobile app share a typed domain model and call a single NestJS REST API that integrates Stripe for payments, Shopify for inventory, and WordPress as a headless CMS.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
│                                                                      │
│   ┌─────────────────────┐       ┌───────────────────────────────┐   │
│   │   React Web App      │       │   React Native Mobile App     │   │
│   │   (Vite + Tailwind)  │       │   (Expo + AsyncStorage)       │   │
│   │   localhost:5173     │       │   iOS / Android               │   │
│   └──────────┬──────────┘       └──────────────┬────────────────┘   │
└──────────────┼───────────────────────────────── ┼ ──────────────────┘
               │  REST + JWT                       │  REST + JWT
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       NestJS API  :3000                              │
│                                                                      │
│   /auth          /products       /cart        /orders                │
│   /webhooks      /integrations   /healthz     /api/docs (Swagger)    │
│                                                                      │
└──────┬────────────┬──────────────────┬─────────────────┬────────────┘
       │            │                  │                  │
       ▼            ▼                  ▼                  ▼
  PostgreSQL    Stripe API       Shopify              WordPress
  :5432         (Checkout +       Admin API            REST API
  (TypeORM)      Webhooks)       (Products +          (Posts +
                                  Inventory)           Pages)
```

**Data flow summary:**

| Flow | Direction | Description |
|------|-----------|-------------|
| Product browse | Client → API → DB | React/RN fetches paginated products |
| Auth | Client → API → DB | JWT issued on register/login |
| Add to cart | Client → API → DB | Server-side cart persisted per user |
| Checkout | Client → API → Stripe | API creates Checkout Session, client redirects |
| Payment confirmed | Stripe → API (webhook) | `checkout.session.completed` marks order as completed |
| Shopify sync | API ↔ Shopify Admin | Pull products, upsert to local DB; register outbound webhooks |
| CMS content | API → WordPress REST | Pull posts/pages for marketing content |
| WP content event | WordPress → API (webhook) | WP plugin pushes `post.saved` events on publish |

---

## API Integration Mapping

| External Endpoint | Purpose | Direction |
|---|---|---|
| `POST /v1/checkout/sessions` (Stripe) | Create a hosted Checkout session for an order | API → Stripe |
| `POST /webhooks/stripe` (this API) | Receive `checkout.session.completed` with HMAC signature verification | Stripe → API |
| `GET /admin/api/2024-01/products.json` (Shopify) | Fetch full product catalogue for local upsert | API → Shopify |
| `POST /admin/api/2024-01/webhooks.json` (Shopify) | Register `products/update`, `inventory_levels/update` webhooks | API → Shopify |
| `GET /wp-json/wp/v2/posts` (WordPress) | Pull published blog posts as headless CMS content | API → WordPress |
| `GET /wp-json/wp/v2/pages` (WordPress) | Pull static pages (About, FAQ, etc.) | API → WordPress |
| `GET /wp-json/hcc/v1/content` (custom plugin) | Aggregate posts + pages in a single call | API → WordPress |
| `POST /webhooks/wordpress/content` (this API) | Receive `post.saved` events from the HCC WP plugin | WordPress → API |

---

## Project Structure

```
headless-commerce-engine/
├── shared/
│   └── types.ts               # Canonical TypeScript domain types (shared by all TS packages)
│
├── frontend-web/              # React 18 + Vite + Tailwind CSS storefront
│   └── src/
│       ├── components/        # Navbar, ProductCard, Layout
│       ├── pages/             # Home, ProductDetail, Cart, Checkout, Auth, Orders
│       ├── stores/            # Zustand stores (auth, cart)
│       └── lib/api.ts         # Typed fetch wrapper for the backend
│
├── mobile-app/                # React Native (Expo) mobile storefront
│   └── src/
│       ├── screens/           # ProductList, ProductDetail, Cart, Auth
│       ├── navigation/        # Stack + Tab navigator
│       ├── store/cart.ts      # Zustand cart store (AsyncStorage backed)
│       └── lib/api.ts         # Same API contract as web, uses EXPO_PUBLIC_API_BASE_URL
│
├── backend-api/               # NestJS REST API
│   └── src/
│       ├── auth/              # JWT auth, bcrypt, Passport strategy
│       ├── products/          # CRUD + Shopify upsert
│       ├── cart/              # Server-side cart per user
│       ├── orders/            # Stripe Checkout session creation
│       ├── webhooks/          # Stripe signature-verified webhook handler
│       ├── integrations/      # ShopifyService + WordPressService
│       └── health/            # /healthz endpoint (Terminus)
│
├── cms-integration/           # Standalone sync scripts
│   ├── wordpress-sync.ts      # Fetch WP posts/pages → wordpress-content.json
│   ├── shopify-sync.ts        # Fetch Shopify products → upsert to API
│   ├── shopify-plugin/        # Node.js script to register Shopify webhooks
│   │   └── index.ts
│   └── wordpress-plugin/
│       └── headless-commerce-connector.php   # WordPress plugin with custom REST + outbound hooks
│
└── docker-compose.yml         # postgres:15 + adminer + backend
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for running frontend and scripts locally)

### 1. Boot the database and backend

```bash
# Copy and fill in real API keys
cp backend-api/.env.example backend-api/.env

docker-compose up -d
```

The backend auto-creates tables on first start (`synchronize: true` in dev). Swagger UI is at http://localhost:3000/api/docs.

### 2. Run the web storefront

```bash
cd frontend-web
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

### 3. Run the mobile app

```bash
cd mobile-app
cp .env.example .env
npm install
npx expo start
# Scan the QR with Expo Go on iOS or Android
```

### 4. Sync Shopify inventory (optional)

```bash
cd cms-integration
cp .env.example .env   # fill SHOPIFY_SHOP_DOMAIN and SHOPIFY_ACCESS_TOKEN
npm install
npm run shopify:sync
```

### 5. Register Shopify webhooks

```bash
# Requires BACKEND_API_URL to be publicly reachable (use ngrok in dev)
npm run shopify:register-webhooks
```

### 6. Install the WordPress plugin

Upload `cms-integration/wordpress-plugin/headless-commerce-connector.php` to your WordPress installation via **Plugins → Add New → Upload**, then configure the backend URL and shared secret under **Settings → HCC Settings**.

---

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `DATABASE_*` | backend | PostgreSQL connection config |
| `JWT_SECRET` | backend | HS256 signing key — use a long random string in production |
| `STRIPE_SECRET_KEY` | backend | `sk_test_*` or `sk_live_*` from Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | backend | `whsec_*` from Stripe webhook endpoint config |
| `SHOPIFY_SHOP_DOMAIN` | backend, cms-integration | `your-store.myshopify.com` |
| `SHOPIFY_ACCESS_TOKEN` | backend, cms-integration | Custom App access token (`shpat_*`) |
| `WORDPRESS_BASE_URL` | backend, cms-integration | Root URL of your WordPress installation |
| `WORDPRESS_APP_PASSWORD` | backend, cms-integration | Application password from WP user profile |
| `VITE_API_BASE_URL` | frontend-web | Backend URL (default: `http://localhost:3000`) |
| `EXPO_PUBLIC_API_BASE_URL` | mobile-app | Backend URL for the Expo app |

---

## Key Technical Decisions

**Shared types** — `shared/types.ts` is the single source of truth for all domain interfaces. Both the frontend and backend import from it via TypeScript path alias `@shared/*`, eliminating `any` and keeping API contracts in sync.

**Server-side cart** — The cart is persisted in PostgreSQL rather than client-side localStorage. This enables cart recovery across devices and gives the backend accurate inventory counts when creating Checkout sessions.

**Stripe webhook signature verification** — The `WebhooksService` calls `stripe.webhooks.constructEvent()` with the raw request body (NestJS `rawBody: true`) and the `STRIPE_WEBHOOK_SECRET`. A bad signature throws `400` before any business logic executes.

**Shopify sync strategy** — `ShopifyService.upsertByShopifyId()` matches on `shopifyProductId` so repeated syncs are idempotent. The standalone `cms-integration/shopify-sync.ts` script handles full pagination via Shopify's `Link: rel="next"` headers.
