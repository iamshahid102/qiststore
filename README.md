# QistStore — BNPL Installment E-Commerce Marketplace (MERN)

A full-stack **Buy-Now-Pay-Later (BNPL) marketplace**: customers pay a small **advance** plus fixed
**monthly installments**, vendors list products, staff verify orders offline (CNIC + guarantors) and
collect installment payments. Built as a functional clone of the qistbazaar.pk product model with
**original branding, content and assets** (see “Legal & content policy” below).

<p align="center">
  <img src="brand-logo.png" alt="QistStore logo" width="220" />
</p>

---

## 1. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  client/  —  Next.js 16 (App Router, SSR) + React 19 + Tailwind  │
│  Storefront · Cart · Checkout · Tracking · Account · CMS pages   │
└───────────────┬─────────────────────────────────────────────────┘
                │  /api/v1/*  (Next rewrite proxy — no CORS in browser)
┌───────────────▼─────────────────────────────────────────────────┐
│  server/  —  Express 5 + TypeScript (routes → controllers →      │
│              services → models), zod validation, JWT + RBAC       │
└───────────────┬─────────────────────────────────────────────────┘
                │  Mongoose
┌───────────────▼─────────────────────────────────────────────────┐
│  MongoDB  —  catalog, orders, installments, verification, CMS    │
└─────────────────────────────────────────────────────────────────┘
```

Monorepo layout (npm workspaces):

| Path | Purpose |
|---|---|
| `client/` | Next.js storefront + customer account area |
| `server/` | Express REST API, installment engine, seed scripts, tests |
| `plan.md` | Engineering plan & roadmap this build follows |
| `PLAN_VS_BUILD_REPORT.txt` | What was built vs planned, deviations, verification evidence |

---

## 2. Tech Stack

### 2.1 Client (`client/`)

| Library | Version | Why |
|---|---|---|
| **next** | 16.4.0 | SSR/SEO for 1,000+ product & category URLs, App Router, ISR-capable |
| **react** / **react-dom** | 19.3.0 | UI runtime |
| **typescript** | 7.0.2 | Type safety across DTOs and components |
| **tailwindcss** | 4.3.3 | Utility-first styling, `@theme` design tokens |
| **@tailwindcss/postcss** | 4.3.3 | Tailwind v4 PostCSS pipeline |
| **postcss** | 8.5.x | CSS tooling |
| **zustand** | 5.0.15 | Lightweight client state (cart + wishlist, localStorage-persisted) |
| **eslint** + **eslint-config-next** | 10.12.0 / 16.4.0 | Lint gate (flat config, core-web-vitals + TS rules) |

No UI kit is used — components are hand-built with Tailwind so the design tokens stay in one place.

> **TypeScript note:** both workspaces build and typecheck with **typescript 7.0.2**
> (`npx tsc --version` in `client/` and `server/` both report 7.0.2). npm additionally
> hoists a `typescript@6.0.3` copy at the repo root purely to satisfy the
> `typescript-eslint` peer range used by `eslint-config-next` — it is not used to
> compile or typecheck the application code.

### 2.2 Server (`server/`)

| Library | Version | Why |
|---|---|---|
| **express** | 5.3.0 | HTTP layer, middleware pipeline |
| **mongoose** | 9.11.1 | ODM, schema validation, indexes |
| **zod** | 4.6.5 | Request validation + typed env parsing |
| **jsonwebtoken** | 9.0.3 | Access (15m) + refresh (7d) tokens |
| **bcryptjs** | 3.0.3 | Password hashing (pure JS — no native build) |
| **helmet** | 8.3.0 | Security headers |
| **cors** | 2.8.6 | Origin allow-list |
| **express-rate-limit** | 8.7.1 | Global + sensitive-route throttling |
| **compression** | 1.8.2 | gzip responses |
| **cookie-parser** | 1.4.7 | httpOnly refresh-token cookie |
| **pino** | 10.4.0 | Structured JSON logging |
| **dotenv** | 18.0.7 | Env loading |

### 2.3 Tooling / testing

| Tool | Version | Purpose |
|---|---|---|
| **vitest** | 5.0.3 | Unit + integration test runner |
| **supertest** | 7.3.1 | HTTP assertions against the Express app |
| **mongodb-memory-server** | 11.3.0 | Throwaway MongoDB for tests (falls back to an isolated test DB) |
| **tsx** | 4.23.15 | TS execution for dev/seed scripts |
| **typescript** | 7.0.2 | `tsc` build + typecheck gate |
| **concurrently** | 10.0.6 | Run API + web together from the root |

---

## 3. Features

**Storefront**
- Home: hero, category quick-links, **Deals of the Day with live countdown**, scrolling top-categories
  marquee, per-category product rails, trust strip
- Shop with filters (category, brand, advance-price range, sort) — all state in the URL
- Category & brand-subcategory listing pages with SEO copy
- Product page: gallery, **installment plan selector (3 plans: monthly × term + advance)**, spec table,
  vendor block, related products, same-brand rail, `Product` JSON-LD
- Cart (plans snapshotted per line), server-priced quote, checkout, order-success guidance
- Order tracking by **Order ID + phone** (no login) with timeline + installment schedule
- Auth (register/login/logout), account dashboard with orders and installment schedule
- Wishlist, search, 10 CMS pages (About, FAQs, Verification bilingually EN/UR, Payment methods,
  policies, Musawamah agreement, Become a Vendor), blog/press, partner stores, 12 facilitation centres
- SEO: dynamic `sitemap.xml`, `robots.txt` (blocks `/account/`, `/order-tracking`, `/search`, cart, checkout),
  per-page metadata, semantic breadcrumbs

**API**
- Catalog: categories tree, brands, products (filters/sort/pagination/text search), product detail,
  active deal, home sections, category facets
- Content: CMS pages, blogs/press, branches (grouped by city), vendor stores
- Checkout: server-side quote, order creation (guest-friendly), public tracking, customer orders
- Auth: register/login/refresh (rotation + cookie)/logout/me
- Admin: order queue, **state-machine-enforced status transitions**, verification approve/reject
- Installment schedule generation, admin-collection-ready statuses, overdue-capable model

**Engineering**
- All money as **integer paisa** — no floats anywhere
- Server-side pricing (client prices are never trusted)
- Order state machine with unit-tested guards (cancel is impossible once processing starts)
- RBAC (`customer` / `vendor` / `staff` / `admin`), rate limits on auth + checkout
- Graceful degradation: dev boots without MongoDB and reports `degraded` on `/health`

---

## 4. Getting Started

### Prerequisites
- Node.js **≥ 20** (developed on 24)
- A MongoDB instance (local `mongodb://127.0.0.1:27017` or MongoDB Atlas)

### 4.1 Install

```bash
npm install          # installs both workspaces
```

### 4.2 Configure

```bash
cp server/.env.example server/.env     # then edit MONGO_URI + JWT secrets
cp client/.env.local.example client/.env.local
```

| Variable (server) | Example | Notes |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://user:pass@cluster/qiststore` | required |
| `PORT` | `5000` | API port |
| `CORS_ORIGIN` | `http://localhost:3000` | comma-separated allow-list |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | long random strings | change in production |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | `15m` / `7` | token lifetimes |

| Variable (client) | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | used by server components |
| `API_PROXY_URL` | `http://localhost:5000` | target of the `/api/v1` rewrite |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | canonical/sitemap base |

### 4.3 Seed demo data

```bash
npm run seed         # categories, brands, 21 products w/ plans, CMS pages, blogs, branches, deals, demo users
```

Demo logins created by the seed:

| Role | Phone | Password |
|---|---|---|
| Admin | `03000000001` | `Admin@123` |
| Customer | `03000000002` | `Customer@123` |

### 4.4 Run

```bash
npm run dev          # API on :5000 + web on :3000
```

Production:

```bash
npm run build        # tsc → server/dist, next build → client/.next
npm start
```

---

## 5. Scripts

| Command (root) | Does |
|---|---|
| `npm run dev` | API + web in watch mode |
| `npm run build` | Build server then client |
| `npm start` | Run both production builds |
| `npm run typecheck` | `tsc --noEmit` for server and client |
| `npm test` | Server test suite (unit + integration) |
| `npm run seed` | Re-seed the demo database |

Workspace-scoped: `npm run <script> -w server` (e.g. `npm run db:dev -w server` starts a throwaway
MongoDB for machines without one installed).

---

## 6. Project Structure

```
QistStore/
├── client/
│   ├── public/brand/                   # brand logo + hero image
│   └── src/
│       ├── app/                        # routes: /, /shop, /product/[slug],
│       │                               # /product-category/[...slug], /cart, /checkout,
│       │                               # /order-tracking, /account/*, /page/[slug],
│       │                               # /blogs, /stores, /visit-us, /search, /wishlist
│       ├── components/                 # layout/ product/ listing/ home/ cms/
│       ├── lib/                        # api client, formatting, auth storage
│       ├── stores/                     # zustand: cart, wishlist
│       └── types/                      # shared DTO types
└── server/
    ├── src/
    │   ├── config/                     # env (zod), db connection
    │   ├── middlewares/                # auth/RBAC, validate, rateLimit, error
    │   ├── models/                     # User, Category/Brand, Product, Order, Content
    │   ├── modules/
    │   │   ├── engine/installment.ts   # PURE installment + state-machine logic
    │   │   ├── auth/                   # register/login/refresh/me
    │   │   ├── catalog/                # categories, products, deals, home, facets
    │   │   ├── content/                # CMS, blogs, branches, stores
    │   │   └── checkout/               # quote, order, tracking, admin
    │   ├── routes/                     # API router
    │   ├── seed/                       # dataset + seed + dev-db helper
    │   └── utils/                      # money (paisa), slug, pagination, errors, logger
    └── tests/                          # engine.test.ts, api.test.ts, globalSetup.ts
```

---

## 7. Installment Engine Rules

Money is stored as **integer paisa** (Rs 1 = 100 paisa).

```
totalPayable = advance + (monthly × term)
markup       = totalPayable − cashPrice      // disclosed cost-plus margin (Musawamah), never called "interest"
```

- `advance` must be ≥ 10% of the cash price (default-risk guard)
- Schedule starts one month after order date and **sums exactly** to `monthly × term`
  (last installment absorbs the remainder — asserted by tests)
- Orders transition only along the allowed state machine; illegal moves return **409 CONFLICT**

```
pending_verification → verification_in_progress → approved → processing → shipped → delivered → completed
                          ↘ rejected                                        ↘ defaulted
   (cancellable before processing)
```

---

## 8. Testing

```bash
npm test                      # everything
npm test -w server -- engine  # installment engine only
```

- **`tests/engine.test.ts`** — pure unit tests: plan math, schedule invariants, rounding, state machine
- **`tests/api.test.ts`** — HTTP layer (no DB needed) + full integration suite when a database is
  reachable: catalog, pagination, auth, duplicate/invalid registration, checkout quote/order,
  schedule invariant, tracking security, RBAC and admin verification flow
- Test databases are isolated: in-memory MongoDB when available, otherwise an `…_test` database
  derived from `MONGO_URI` (dropped on teardown); the dev/demo data is never touched

---

## 9. Deployment Notes

| Piece | Suggested target |
|---|---|
| Client | Vercel (Next.js native) — set `NEXT_PUBLIC_API_URL`, `API_PROXY_URL`, `NEXT_PUBLIC_SITE_URL` |
| API | Render / Railway / Fly.io — `npm run build -w server && npm start -w server` |
| Database | MongoDB Atlas (enable PITR backups) |
| Media | Cloudinary or S3 (product images are currently gradient placeholders) |

Production hardening checklist: rotate JWT secrets, set `NODE_ENV=production` (the API then
**fails fast** if MongoDB is unreachable), enable TLS + secure cookies, configure Redis for caching
and BullMQ for installment reminders, wire Sentry, and put a CDN in front of static assets.

---

## 10. Legal & Content Policy

This project is a **functional** re-implementation of a BNPL installment storefront. All
**code, copy, seed data and imagery are original** — no logos, text, images or blog content were
copied from any third-party site. Demo product names/brands are used descriptively; replace them
with your own catalogue before commercial use. Payment-provider integrations (JazzCash/EasyPaisa)
are modelled as an interface with manual admin confirmation; connect real merchant credentials
before going live.
