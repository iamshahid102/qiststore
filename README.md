# Qist Store — BNPL Installment E-Commerce Marketplace (MERN)

A full-stack **Buy-Now-Pay-Later (BNPL) marketplace**: customers pay a small **advance** plus fixed
**monthly installments**, vendors list products, staff verify orders (CNIC + guarantors) and collect
installment payments. Built as a functional clone of the qistbazaar.pk product model with
**original branding, content and assets** (see “Legal & content policy”).

<p align="center">
  <img src="client/public/brand/logo.png" alt="Qist Store" width="260" />
</p>

---

## 1. Brand & Theme

| Token | Value | Usage |
|---|---|---|
| **Primary** | `#185ADB` | Brand blue — `brand-600` (`bg-brand-600`, `text-brand-700`, links, header bar) |
| **Accent** | `#FF8A3D` | Orange CTA — `accent-500` (Add to Cart, Place Order, discount badges) |
| **Surface** | `#F5F1E8` | Cream page background — `cream-100` (body, section bands, warm cards) |

Full scales live in `client/src/app/globals.css` (`@theme` → `brand-50…900`, `accent-100…700`,
`cream-50…300`, `ink-900/800`), so every component consumes tokens instead of hard-coded hex
values. The mobile browser chrome uses `themeColor: #185ADB`.

### Design language

The storefront follows a modern rounded-card layout: `qb-card` (soft layered shadow),
`qb-btn-accent` / `qb-btn-dark` / `qb-btn-light` (pill buttons), `qb-eyebrow` (accent label above
section titles), `qb-icon-chip` (tinted circular icon holder) and `qb-stat-box` (countdown tiles).
Type is **Plus Jakarta Sans** (loaded with `next/font`, self-hosted at build time — no runtime
request to Google), tight tracking for display headings.

**Icons:** no emoji anywhere. All glyphs are `react-icons` (Lucide set for UI, Font Awesome for
social/WhatsApp). Category icons are stored in MongoDB as **icon keys** (`"smartphone"`,
`"refrigerator"`…) and rendered through `client/src/components/ui/CategoryIcon.tsx`, so the API
never has to ship image artwork and the UI can theme icons at any size.

### Brand assets

| File (source, repo root) | Role | Where it lives now |
|---|---|---|
| `brand-logo.png` — 677×369, transparent | **Logo** (chosen: transparent background makes it usable on cream, white and blue surfaces) | `client/public/brand/logo.png` (900px), plus generated `client/src/app/icon.png` (512, favicon) and `apple-icon.png` (180) |
| `brand-logo-img.jpg` — 1408×768, cream background | **Brand banner** (matches the #F5F1E8 surface) | `client/public/brand/brand-banner.jpg` (1600px) used in the homepage hero, plus generated `client/public/brand/og-image.jpg` (1200×630 social card) |

Assets were processed with **sharp** (already a Next.js dependency, now declared explicitly as a
client devDependency) — trim/crop to a square favicon, re-encode to optimised PNG/JPEG. The originals
stay untouched in the repo root.

---

## 2. Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  client/  —  Next.js 16 (App Router, SSR) + React 19 + Tailwind CSS 4     │
│  Storefront · Cart · Checkout · Tracking · Account · CMS pages            │
└───────────────┬───────────────────────────────────────────────────────────┘
                │  /api/v1/*  (Next rewrite proxy — no CORS in the browser)
┌───────────────▼───────────────────────────────────────────────────────────┐
│  server/  —  Express 5 + TypeScript (routes → controllers → models),      │
│              zod validation, JWT + RBAC, Cloudinary uploads               │
└───────────────┬───────────────────────────────────────────────────────────┘
                │  Mongoose                                    │ Cloudinary SDK
┌───────────────▼───────────────────────┐   ┌─────────────────▼─────────────┐
│  MongoDB — catalog, orders,           │   │  Cloudinary CDN — product &    │
│  installments, verification, CMS      │   │  vendor images (AVIF/WebP)     │
└───────────────────────────────────────┘   └───────────────────────────────┘
```

Monorepo layout (npm workspaces):

| Path | Purpose |
|---|---|
| `client/` | Next.js storefront + customer account area |
| `server/` | Express REST API, installment engine, uploads, seed scripts, tests |
| `scripts/` | Browser-based verification tools (responsive + brand/theme) |
| `plan.md` | Engineering plan & roadmap this build follows |
| `PLAN_VS_BUILD_REPORT.txt` | Plan vs build, deviations, and verification evidence |

---

## 3. Tech Stack

### 3.1 Client (`client/`)

| Library | Version | Why |
|---|---|---|
| **next** | 16.4.0 | SSR/SEO for 1,000+ product & category URLs, App Router, image optimizer |
| **react** / **react-dom** | 19.3.0 | UI runtime |
| **typescript** | 7.0.2 | Type safety across DTOs and components |
| **tailwindcss** | 4.3.3 | Utility-first styling with `@theme` design tokens |
| **@tailwindcss/postcss** | 4.3.3 | Tailwind v4 PostCSS pipeline |
| **next/font (Plus Jakarta Sans)** | built-in | Self-hosted at build time — the display typeface of the storefront |
| **zustand** | 5.0.15 | Cart + wishlist state (localStorage-persisted, external-store hooks) |
| **react-icons** | 5.7.0 | Every icon in the UI (Lucide + Font Awesome sets) — no emoji artwork |
| **sharp** (dev) | 0.35.5 | Brand-asset processing + Next.js production image optimisation |
| **eslint** + **eslint-config-next** (dev) | 10.12.0 / 16.4.0 | Lint gate (flat config, core-web-vitals + TS) |

No UI kit: components are hand-built with Tailwind so tokens stay in one place.

> **TypeScript note:** both workspaces build and typecheck with **typescript 7.0.2**
> (`npx tsc --version` in `client/` and `server/` both report 7.0.2). npm additionally hoists a
> `typescript@6.0.3` copy at the repo root purely to satisfy the `typescript-eslint` peer range used
> by `eslint-config-next` — it does not compile or typecheck the application code.

### 3.2 Server (`server/`)

| Library | Version | Why |
|---|---|---|
| **express** | 5.3.0 | HTTP layer, middleware pipeline |
| **mongoose** | 9.11.1 | ODM, schema validation, indexes |
| **zod** | 4.6.5 | Request validation + typed env parsing |
| **cloudinary** | 2.11.0 | Image storage/CDN for product & vendor imagery |
| **multer** | 2.4.0 | Multipart parsing for admin image uploads (5 MB limit, MIME allow-list) |
| **jsonwebtoken** | 9.0.3 | Access (15m) + refresh (7d) tokens |
| **bcryptjs** | 3.0.3 | Password hashing (pure JS — no native build) |
| **helmet** | 8.3.0 | Security headers |
| **cors** | 2.8.6 | Origin allow-list |
| **express-rate-limit** | 8.7.1 | Global + sensitive-route throttling |
| **compression** | 1.8.2 | gzip responses |
| **cookie-parser** | 1.4.7 | httpOnly refresh-token cookie |
| **pino** | 10.4.0 | Structured JSON logging |
| **dotenv** | 18.0.7 | Env loading |

### 3.3 Tooling / testing

| Tool | Version | Purpose |
|---|---|---|
| **vitest** | 5.0.3 | Unit + integration test runner |
| **supertest** | 7.3.1 | HTTP assertions against the Express app |
| **mongodb-memory-server** | 11.3.0 | Throwaway MongoDB for tests (falls back to an isolated test DB) |
| **puppeteer-core** | 25.13.0 | Drives the locally installed Chrome for responsive/brand checks (no browser download) |
| **tsx** | 4.23.15 | TS execution for dev/seed scripts |
| **concurrently** | 10.0.6 | Run API + web together from the root |

---

## 4. Features

**Storefront**
- Home: hero with the brand banner, category quick-links, **Deals of the Day with live countdown**,
  scrolling top-categories marquee, per-category product rails, trust strip
- Shop with filters (category, brand, advance-price range, sort) — all state in the URL
- Category & brand-subcategory listing pages with SEO copy and pagination
- Product page: gallery, **installment plan selector (monthly × term + advance + total payable)**,
  spec table, vendor block, related products, same-brand rail, `Product` JSON-LD
- Cart (plan snapshotted per line), server-priced quote, checkout, order-success guidance
- Order tracking by **Order ID + phone** (no login) with timeline + installment schedule
- Auth (register/login/logout), account dashboard with orders and installment schedule
- Wishlist, search, 10 CMS pages (About, FAQs, Verification bilingual EN/UR, Payment methods,
  policies, Musawamah agreement, Become a Vendor), blog/press, partner stores, 12 facilitation centres
- SEO: dynamic `sitemap.xml`, `robots.txt`, per-page metadata, Open Graph/Twitter cards, brand OG image

**API**
- Catalog: categories tree, brands, products (filters/sort/pagination/text search), product detail,
  active deal, home sections, category facets
- Content: CMS pages, blogs/press, branches (grouped by city), vendor stores
- Checkout: server-side quote, order creation (guest-friendly), public tracking, customer orders
- Auth: register/login/refresh (rotation + cookie)/logout/me
- Admin: order queue, **state-machine-enforced status transitions**, verification approve/reject,
  **Cloudinary image upload + product image attach/detach**, storage status probe
- Installment schedule generation with overdue-capable statuses

**Engineering**
- All money as **integer paisa** — no floats anywhere
- Server-side pricing (client prices are never trusted)
- Order state machine with unit-tested guards (cancel is impossible once processing starts)
- RBAC (`customer` / `vendor` / `staff` / `admin`), rate limits on auth + checkout + uploads
- Graceful degradation: dev boots without MongoDB (`/health` → `degraded`), uploads answer a clear
  `503 CLOUDINARY_NOT_CONFIGURED` until credentials exist — the rest of the app keeps working
- Fully responsive from **320 px to 1440 px+** (verified in a real browser, see §7)

---

## 5. Getting Started

### Prerequisites
- Node.js **≥ 20** (developed on 24)
- A MongoDB instance (local or MongoDB Atlas)
- (Optional, for image uploads) a Cloudinary account
- (Optional, for the verification scripts) Google Chrome installed

### 5.1 Install

```bash
npm install          # installs both workspaces + root tooling
```

### 5.2 Configure

```bash
cp server/.env.example server/.env     # then set MONGO_URI + JWT secrets (+ Cloudinary)
cp client/.env.local.example client/.env.local
```

| Variable (server) | Example | Notes |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://user:pass@cluster/qiststore` | required |
| `PORT` | `5000` | API port |
| `CORS_ORIGIN` | `http://localhost:3000` | comma-separated allow-list |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | long random strings | change in production |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL_DAYS` | `15m` / `7` | token lifetimes |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from the Cloudinary dashboard | optional — uploads return 503 until set |
| `CLOUDINARY_FOLDER` | `qiststore/products` | CDN folder for uploads |

| Variable (client) | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api/v1` | used by server components |
| `API_PROXY_URL` | `http://localhost:5000` | target of the `/api/v1` rewrite |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | canonical/sitemap/OG base |

### 5.3 Seed demo data

```bash
npm run seed         # 17 categories, 12 brands, 21 products w/ plans, CMS pages, blogs, branches, deals, demo users
```

| Role | Phone | Password |
|---|---|---|
| Admin | `03000000001` | `Admin@123` |
| Customer | `03000000002` | `Customer@123` |

### 5.4 Run

```bash
npm run dev          # API on :5000 + web on :3000
```

Production:

```bash
npm run build        # tsc → server/dist, next build → client/.next
npm start
```

---

## 6. Image & File Handling (Cloudinary)

Cloudinary is wired end-to-end; the app runs fine without it and tells you exactly what is missing.

**Setup**

1. Create a free account at <https://cloudinary.com> → **Dashboard → Account Details → API Keys**.
2. Put the three values into `server/.env`:

   ```env
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=123456789012345
   CLOUDINARY_API_SECRET=your-api-secret
   CLOUDINARY_FOLDER=qiststore/products
   ```
3. Restart the API. `GET /api/v1/admin/uploads/status` should now report `configured: true`.

**Endpoints** (all require `admin`/`staff`)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/uploads/status` | Is storage configured? |
| `POST` | `/api/v1/admin/uploads` | Multipart (`file`) → uploads to Cloudinary, returns `{ url, publicId, width, height, format, bytes }` |
| `DELETE` | `/api/v1/admin/uploads?publicId=…` | Delete an asset from Cloudinary |
| `POST` | `/api/v1/admin/products/:slug/images` | Attach `{ url, publicId, alt }` to a product |
| `DELETE` | `/api/v1/admin/products/:slug/images?url=…&publicId=…` | Detach (and best-effort delete from Cloudinary) |

**Delivery:** stored URLs are rendered through `next/image` (`res.cloudinary.com` is allow-listed in
`next.config.ts` via `remotePatterns`), so the browser receives AVIF/WebP at responsive widths with
`quality=auto, fetch_format=auto` transformations applied by Cloudinary.

**Client helper:** `client/src/lib/api.ts → apiUpload<T>(path, file, token)` performs the multipart
call through the Next proxy, ready for the admin UI upload form.

---

## 7. Scripts

| Command (root) | Does |
|---|---|
| `npm run dev` | API + web in watch mode |
| `npm run build` | Build server then client |
| `npm start` | Run both production builds |
| `npm run typecheck` | `tsc --noEmit` for server and client |
| `npm test` | Server test suite (unit + integration) |
| `npm run seed` | Re-seed the demo database |
| `npm run check:responsive` | Real-browser horizontal-overflow audit: 16 routes × 8 widths (320→1440 px) |
| `npm run check:brand` | Real-browser theme/brand audit: tokens, cream surface, CTA colour, logo, banner, mobile header |
| `npm run check:console` | Real-browser runtime audit: console errors/warnings, page errors, failed requests, 5xx across 14 routes |
| `node scripts/capture-previews.mjs` | Saves desktop/mobile screenshots of key pages into `preview/` |

Both checkers drive the locally installed Chrome through `puppeteer-core` (no browser download) and
expect the app to be running on `http://localhost:3000` (`BASE_URL` / `CHROME_PATH` overridable).

Workspace-scoped: `npm run <script> -w server` (e.g. `npm run db:dev -w server` starts a throwaway
MongoDB for machines without one installed).

---

## 8. Project Structure

```
QistStore/
├── scripts/                            # check-responsive.mjs, check-brand.mjs
├── client/
│   ├── src/app/icon.png, apple-icon.png # generated from the brand logo
│   ├── public/brand/                    # logo.png, brand-banner.jpg, og-image.jpg
│   └── src/
│       ├── app/                         # routes: /, /shop, /product/[slug],
│       │                                # /product-category/[...slug], /cart, /checkout,
│       │                                # /order-tracking, /account/*, /page/[slug],
│       │                                # /blogs, /stores, /visit-us, /search, /wishlist│       ├── components/      # layout/ product/ listing/ home/ cms/ ui/
│       │                    #   ui/{SectionHeading,CategoryIcon}.tsx — shared
│       │                    #   design language (eyebrow headings, icon registry)
│       ├── lib/             # api client (+ apiUpload), formatting, auth store
│       ├── stores/                      # zustand: cart, wishlist
│       └── types/                       # shared DTO types
└── server/
    ├── src/
    │   ├── config/                      # env (zod), db connection, cloudinary
    │   ├── middlewares/                 # auth/RBAC, validate, rateLimit, error
    │   ├── models/                      # User, Category/Brand, Product, Order, Content
    │   ├── modules/
    │   │   ├── engine/installment.ts    # PURE installment + state-machine logic
    │   │   ├── auth/ catalog/ content/ checkout/
    │   │   └── uploads/                 # Cloudinary upload + product image endpoints
    │   ├── routes/                      # API router
    │   ├── seed/                        # dataset + seed + dev-db helper
    │   └── utils/                       # money (paisa), slug, pagination, errors, logger
    └── tests/                           # engine.test.ts, api.test.ts, globalSetup.ts
```

---

## 9. Installment Engine Rules

Money is stored as **integer paisa** (Rs 1 = 100 paisa).

```
totalPayable = advance + (monthly × term)
markup       = totalPayable − cashPrice      // disclosed cost-plus margin (Musawamah), never called "interest"
```

- `advance` must be ≥ 10% of the cash price (default-risk guard)
- The schedule starts one month after the order date and **sums exactly** to `monthly × term`
  (the last installment absorbs the remainder — asserted by tests)
- Orders move only along the allowed state machine; illegal moves return **409 CONFLICT**

```
pending_verification → verification_in_progress → approved → processing → shipped → delivered → completed
                          ↘ rejected                                        ↘ defaulted
   (cancellable before processing)
```

---

## 10. Testing & Verification

```bash
npm test                      # everything
npm test -w server -- engine  # installment engine only
npm run check:brand           # needs the web app running
npm run check:responsive      # needs the web app running
npm run check:console         # needs the web app running
```

- **`tests/engine.test.ts`** — pure unit tests: plan math, schedule invariants, rounding, state machine
- **`tests/api.test.ts`** — HTTP layer (no DB needed) + full integration suite when a database is
  reachable: catalog, pagination, auth, checkout quote/order, schedule invariant, tracking security,
  RBAC, admin verification flow
- Test databases are isolated: in-memory MongoDB when available, otherwise a `…_test` database derived
  from `MONGO_URI` (dropped on teardown); development/demo data is never touched

---

## 11. Responsiveness & UI verification

- Mobile-first Tailwind breakpoints across every route (`grid-cols-2 → sm:3 → lg:4`, stacked → split
  layouts at `lg`, tighter `px-3 → sm:px-4` gutters)
- Reference-style redesign: floating rounded hero card with gradient + blobs, "Browse by Category"
  icon grid, dark deals banner with countdown tiles, product cards with badge/heart/rating/price/
  CTA, trust strip, dark navy footer with newsletter + social icons
- Category strip and wide tables scroll horizontally inside their own container instead of
  stretching the page
- Sticky header with a compact utility bar, always-visible search on mobile (36px tap target) and a
  category drawer
- Floating WhatsApp button, 44 px+ tap targets on primary actions
- **Measured:** `npm run check:responsive` → 128 viewport checks (320, 360, 390, 414, 768, 1024, 1280,
  1440 px × 16 routes), **0 horizontal-overflow failures**; `npm run check:brand` → 14/14;
  `npm run check:console` → 14 routes with **0 console errors, 0 page errors, 0 failed requests**

---

## 12. Deployment Notes

| Piece | Suggested target |
|---|---|
| Client | Vercel (Next.js native) — set `NEXT_PUBLIC_API_URL`, `API_PROXY_URL`, `NEXT_PUBLIC_SITE_URL` |
| API | Render / Railway / Fly.io — `npm run build -w server && npm start -w server` |
| Database | MongoDB Atlas (enable PITR backups) |
| Media | Cloudinary (set the three API credentials in the API environment) |

Production hardening checklist: rotate JWT secrets, set `NODE_ENV=production` (the API then
**fails fast** if MongoDB is unreachable), enable TLS + secure cookies, configure Redis for caching and
BullMQ for installment reminders, wire Sentry, and put a CDN in front of static assets.

---

## 13. Legal & Content Policy

This project is a **functional** re-implementation of a BNPL installment storefront. All code, copy,
seed data and imagery are original (the logo and banner are the project owner's own assets) — no
logos, text, images or blog content were copied from any third-party site. Demo product names/brands
are used descriptively; replace them with your own catalogue before commercial use.
Payment-provider integrations (JazzCash/EasyPaisa) are modelled as an interface with manual admin
confirmation; connect real merchant credentials before going live.
