# QistStore — Full-Stack MERN Clone Plan for qistbazaar.pk

> **Document type:** Software Engineering Plan (Architecture + Delivery Roadmap)
> **Author role:** Senior Software Engineer (15+ yrs, e-commerce / fintech / marketplace systems)
> **Target repo:** `QistStore/` (root) → `client/` + `server/`
> **Reference site:** https://www.qistbazaar.pk (analyzed live on 2026-10-10)
> **Status:** Draft v1.0 — ready for estimation & Phase 0 kickoff

---

## 0. Roman Urdu Summary (2 minute mein samajh lo)

Yeh plan ek **BNPL (Buy Now Pay Later) installment e-commerce marketplace** ka clone banane ka hai — jaise QistBazaar hai. Website analyze kar li gayi hai (home, categories, subcategories, product pages, stores/vendor pages, static pages, blog, press, order tracking, auth, cart, checkout — sab). Plan ke andar:

1. **Complete page/route inventory** jo clone karna hai
2. **Tech stack decision** (Next.js client + Express/MongoDB server) with reasoning
3. **Folder structure** `client/` aur `server/` ke liye
4. **Database schemas** (MongoDB/Mongoose) — User, Product, InstallmentPlan, Order, Vendor, Verification, Payment etc.
5. **Installment engine** ka math (advance + monthly) — site ka core logic
6. **API contract** (pure REST routes)
7. **Phases/Sprints** — MVP se lekar full production tak, realistic timelines
8. **Testing, security, SEO, deployment, risks** — sab ek senior engineer ki tarah cover kiya gaya

> ⚠️ **Legal note (pehle padho):** Sirf *functionality/layout* clone karo. QistBazaar ka **logo, brand name, product images, text/content, blog posts** copy **mat** karo — wo unka IP hai. Apna brand "QistStore" rakho, placeholder/royalty-free images use karo, aur content apna likho. Yeh plan educational/functional-clone ke liye hai.

---

## 1. Business & Product Analysis (Domain Model First)

### 1.1 What QistBazaar actually is

| Aspect | Observation from live site |
|---|---|
| **Model** | BNPL marketplace — customer pays **Advance (down-payment)** + fixed monthly installments (3/6/9/12/18/24 months) |
| **Shariah angle** | SECP-registered Shariah-compliant BNPL; uses **Musawamah agreement** (cost-plus sale) — legal page exists |
| **Credit risk** | Held by platform (vendor gets full payment) — per their own "Become a Vendor" page |
| **Verification** | Offline hybrid: order → sales call in 24h → CNIC + 2 guarantors CNIC + signature form → 48h approval → delivery in 3 business days |
| **Payments received** | JazzCash, EasyPaisa (mobile wallet), online bank transfer, cheque, COD — via "Consumer ID" search on wallet apps |
| **Catalog** | ~1,115 products across ~28 categories + brand subcategories (Samsung, Dawlance, HP, Dell...) |
| **Marketplace** | Multi-vendor: 16+ stores in sitemap (`/store/prime-traders` etc.), "500+ Vendor Partners" claim |
| **Omnichannel** | 40+ physical facilitation centres (`/visit-us` — Karachi 30, Lahore 6, Hyderabad 2, others 1 each) |
| **Fulfillment** | Free delivery nationwide + "Instant Delivery" categories for Karachi/Lahore/Hyderabad |
| **Content/SEO** | Blog, Press page, ~30+ SEO landing pages (e.g. `samsung-mobile-price-in-pakistan-25000-to-30000`) |
| **Mobile app** | Google Play + App Store links (out of scope for web clone) |

### 1.2 Key business flows (must be cloned)

```
B2C Flow:
Browse → Product page (choose installment plan) → Cart → Checkout (address+phone)
  → Order created (status: PENDING_VERIFICATION)
  → Sales call (manual/CRM) → Verification (CNIC + guarantors, offline)
  → APPROVED → Dispatch → Delivery → Installment schedule begins
  → Monthly payment via JazzCash/EasyPaisa (Consumer ID) → [REPAYMENT TRACKING]

B2B Flow (Vendor):
Vendor registers → Admin approves → Vendor adds products (SKU, price, advance, stock)
  → Product goes live on marketplace → Order placed → Vendor ships
  → Vendor paid in full (settlement cycle), platform collects installments
```

### 1.3 Core pricing rule (the "engine")

From live product page (`/product/revoo-c35-young`):

| Plan | Monthly | Months | Advance |
|---|---|---|---|
| 1 | 35,200 | 6 | 79,900 |
| 2 | 20,400 | 9 | 113,900 |
| 3 | 21,550 | 12 | 67,900 |

Cards on listing pages always show the **minimum advance** ("Rs. X Advance").

**Derived formula (to be implemented & validated):**

```
total_payable   = advance + (monthly × months)
markup/interest = total_payable − cash_price      // kept hidden on UI, part of Musawamah cost-plus
monthly         = f(cash_price, advance, months, plan_tier)
```

Plan tiers are per-product configurable (not global) — the clone must store **explicit plan rows per product** (like the original), with an optional auto-generator for new products.

---

## 2. Site Analysis — Complete Route Inventory

### 2.1 Analysis method

- `robots.txt` + full sitemap index crawled (`home_sitemap`, `product_category_sitemap`, `subcategory_sitemap`, `product_sitemap`, `store_pages_sitemap`, `blog_sitemap`)
- Homepage + key pages rendered and content-extracted
- Header/footer/nav DOM + link graph extracted
- Infra headers inspected: `x-powered-by: Next.js`, CloudFront + Cloudflare CDN, GTM (`GTM-WT6HMJS`), GA4 (`G-4J9VL3F2HQ`), Cloudflare email obfuscation

### 2.2 Route map (clone scope)

#### A. Core storefront (P0 — MVP)

| # | Route | Page | Key elements observed |
|---|---|---|---|
| 1 | `/` | Home | Top USP bar (Free Delivery / Easy Verification / No Bank Account / No Docs Charges), app-download banner, category mega strip (17 cats), "Top Categories of the Month" marquee, **Deals of the Day** (countdown timer), category product rails (Mobiles, Refrigerator, Laptops, LED, Washing Machine, AC — each with "View All") |
| 2 | `/shop` | All products | Left sidebar: **price range slider (Rs 1 – Rs 1,000,000)**, category filter, product count ("1,115 Products found"), grid + sort |
| 3 | `/product-category/:slug` | Category listing | Sidebar: price filter, brand subcategory chips (Samsung/Infinix/...), **spec filters (RAM, Storage)**, SEO copy block, product grid |
| 4 | `/product-category/:parent/:brand` | Brand subcategory | e.g. `/product-category/mobiles/samsung-5` |
| 5 | `/product/:slug` | Product detail | Gallery, **Installment Plan selector (Plan 1/2/3: monthly × months + advance)**, vendor block ("Sold And Delivered By"), categories breadcrumb, description + spec table, color variant, trust badges (Company Warranty / Easy Verification / No Documentation / No Bank Card), Related products, Same Brand rail |
| 6 | `/search` | Search results | Header search (aria "Search") |
| 7 | `/cart` | Cart | Cart icon + count in header |
| 8 | `/checkout` | Checkout | Address, phone, plan selection, order placement |
| 9 | `/wishlist` | Wishlist | Wishlist route exists (HTTP 200) |
| 10 | `/account/login` (+ `/register`) | Auth | Header: "Log in / Register"; `/login`, `/register` also resolve |

#### B. Marketplace / Vendors (P1)

| # | Route | Page |
|---|---|---|
| 11 | `/stores` | Vendor directory (16 stores: name, address, "Visit Store") |
| 12 | `/store/:slug` | Vendor storefront (logo, address, bio, "Approved By" badges, "69 Products found", product grid) |
| 13 | `/page/become-vendor` | Vendor marketing + apply CTA (stats: 300k customers, 500+ vendors, 24h approval) |

#### C. Order lifecycle (P1)

| # | Route | Page |
|---|---|---|
| 14 | `/order-tracking` | Track by **Order ID + phone number** (robots.txt: Disallow) |
| 15 | `/account` / `/my-account` | Customer dashboard — orders, installment schedule, profile (robots.txt: Disallow `/account/`) |

#### D. Static / CMS pages (P1 — content-managed)

| # | Route | Notes |
|---|---|---|
| 16 | `/page/about-us` | Stats (17k families, 300k customers), Vision/Mission, Why Choose Us |
| 17 | `/page/contact-us` | Call/Email/HQ, contact form, 3 branch cards, social links |
| 18 | `/page/faqs` | Accordion FAQ (orders, cancellation, payment, warranty) |
| 19 | `/page/verification-process` | **4-step timeline, bilingual EN + Urdu** |
| 20 | `/page/payment-method` | EasyPaisa + JazzCash step-by-step + video tutorial slots |
| 21 | `/page/delivery-policy` | Policy |
| 22 | `/page/refund-return-policy` | Policy |
| 23 | `/page/terms-conditions` | Policy |
| 24 | `/page/privacy-policy` | Policy |
| 25 | `/page/musawamah-agreement` | Shariah sale agreement (legally sensitive) |
| 26 | `/visit-us` | **40+ facilitation centres grouped by city** (Karachi 30, Lahore 6, ...) |
| 27 | `/press` | Press coverage list (Press / Blogs tabs) |
| 28 | `/blogs` + `/blogs/:slug` | Blog listing + posts |
| 29 | SEO landing pages | Pattern: `/{brand}-mobile-price-in-pakistan-{range}` — rule-generated listing pages (P2) |

#### E. Admin (not public — required for clone to function) (P1)

- Dashboard, product/category/brand CRUD, vendor approval, **order verification workflow**, installment schedule + payment recording, CMS pages, deals of the day, blog/press, branches/centers, reports.

### 2.3 Global UI components (reusable)

- **Header:** category "All" mega-menu, search, phone CTA (`111-115-566`), cart w/ count, login/register
- **Footer:** 4 columns (Contact / About / Information / Quick Links) + socials + copyright
- **ProductCard:** image, advance price (`Rs. X Advance`), title, quick view, wishlist
- **TrustBar / USP strip**, **countdown timer (Deals of the Day)**, **category marquee**, **app-install banner**
- **Bilingual (EN/UR) blocks** on key conversion pages

### 2.4 Infra observations (inform our non-functional requirements)

- SSR/ISR via Next.js (`x-nextjs-prerender`, `s-maxage=3600` + `stale-while-revalidate`) → **clone must be SSR'd too** for SEO parity
- CDN in front (CloudFront + Cloudflare) → static asset caching strategy
- GA4 + GTM → analytics hooks (we'll use a configurable analytics abstraction)

---

## 3. Tech Stack Decision

### 3.1 Chosen stack (MERN, production-minded)

| Layer | Choice | Why |
|---|---|---|
| **Client** | **Next.js 14+ (App Router) + React 18 + TypeScript** | Original site is Next.js; e-commerce needs SSR/SEO (product/category pages must be indexable). Still "M" (React). |
| **Styling** | **Tailwind CSS** + headless UI (Radix/shadcn-style components) | Fast, consistent, matches modern e-commerce UI |
| **State** | Zustand (client UI: cart, wishlist, filters) + TanStack Query (server cache) | Minimal boilerplate, clear separation |
| **Forms** | react-hook-form + zod | Checkout/auth validation |
| **Server** | **Node.js + Express (TypeScript)** + layered architecture (routes → controllers → services → repositories) | Testable, senior-grade structure |
| **DB** | **MongoDB (MongoDB Atlas) + Mongoose** | M in MERN; flexible catalog + schema evolution |
| **Search** | Mongo Atlas Search (or Mongo text indexes in MVP) | Faceted search: price, brand, RAM/Storage |
| **Cache** | Redis (ioredis) | Homepage rails, deals countdown, category pages |
| **Auth** | JWT access (15m) + refresh (30d, rotated, httpOnly cookie) + OTP on phone (JWT for logged-in) | Matches phone-first PK market |
| **Media** | Cloudinary (or S3-compatible) | Product images, vendor logos |
| **Queue/Jobs** | BullMQ (Redis) | Order reminders, payment due notifications, sitemap regen, SEO page gen |
| **Validation** | zod (shared package) | One source of truth for API contracts |
| **Logging/Errors** | pino + Sentry | Production-grade observability |
| **Testing** | Vitest/Jest + Supertest (server), RTL + Playwright (client/e2e) | See §9 |
| **Monorepo glue** | npm workspaces: `client/`, `server/`, `shared/` | Shared types & zod schemas |

### 3.2 Alternatives considered

| Option | Verdict |
|---|---|
| CRA/Vite SPA client | ❌ SEO loss on 1,000+ product/category pages — fatal for this clone's purpose |
| REST with plain JS | ❌ No — TS + layered architecture for a system of this size |
| PostgreSQL + Prisma | Strong alternative for financial data, but requirement says M; mitigate money precision with **integer paisa** storage (§6.9) |
| GraphQL | Not needed at this scale; REST + typed contracts is simpler |

---

## 4. Repository Structure

```
QistStore/                       ← root (this repo)
├── plan.md                      ← this document
├── package.json                 ← npm workspaces + scripts (dev, build, test, lint)
├── .editorconfig / .gitignore / .nvmrc
├── docker-compose.yml           ← mongo + redis + server + client (dev parity)
│
├── client/                      ← Next.js storefront + customer/vendor/admin areas
│   ├── package.json
│   ├── next.config.ts           ← rewrites /api/* → server, image domains, ISR config
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── (storefront)/
│   │   │   │   ├── page.tsx                      # Home
│   │   │   │   ├── shop/page.tsx
│   │   │   │   ├── product-category/[...slug]/page.tsx
│   │   │   │   ├── product/[slug]/page.tsx
│   │   │   │   ├── search/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   ├── wishlist/page.tsx
│   │   │   │   ├── stores/page.tsx
│   │   │   │   ├── store/[slug]/page.tsx
│   │   │   │   ├── order-tracking/page.tsx
│   │   │   │   ├── blogs/page.tsx
│   │   │   │   ├── blogs/[slug]/page.tsx
│   │   │   │   ├── press/page.tsx
│   │   │   │   ├── visit-us/page.tsx
│   │   │   │   └── page/[slug]/page.tsx          # CMS static pages (one dynamic route)
│   │   │   ├── (auth)/
│   │   │   │   ├── account/login/page.tsx
│   │   │   │   └── account/register/page.tsx
│   │   │   ├── account/                           # customer dashboard (protected)
│   │   │   │   ├── page.tsx / orders/ / installments/ / profile/ / verification/
│   │   │   ├── vendor/                            # vendor dashboard (role: vendor)
│   │   │   ├── admin/                             # admin panel (role: admin)
│   │   │   ├── sitemap.ts / robots.ts / manifest.ts
│   │   │   └── layout.tsx, not-found.tsx, global-error.tsx
│   │   ├── components/
│   │   │   ├── layout/       # Header, MegaMenu, Footer, AppBanner, USPBar
│   │   │   ├── product/      # ProductCard, PlanSelector, Gallery, SpecTable,
│   │   │   │                 # RelatedRail, VendorBadge, QuickView
│   │   │   ├── listing/      # FilterSidebar, PriceSlider, Breadcrumbs, SortBar, Pagination
│   │   │   ├── checkout/     # AddressForm, PlanSummary, OrderSummary
│   │   │   ├── home/         # HeroStrip, CategoryMarquee, DealsCountdown, CategoryRail
│   │   │   └── ui/           # buttons, dialogs, toast, skeleton, tabs...
│   │   ├── features/         # cart/, auth/, filters/, orders/ (feature-level logic)
│   │   ├── lib/              # api client, query client, seo helpers, money utils
│   │   ├── stores/           # zustand: cart.store, ui.store
│   │   └── types/ (+ imports from ../shared)
│   ├── public/
│   └── tests/ (e2e: playwright)
│
├── server/                      ← Express API
│   ├── package.json
│   ├── src/
│   │   ├── index.ts             # bootstrap
│   │   ├── app.ts               # express app (no listen — testable)
│   │   ├── config/              # env (zod-validated), constants
│   │   ├── db/                  # mongo connection, migrations, seed/
│   │   ├── middlewares/         # auth, rbac, validate(zod), rateLimit, error, upload
│   │   ├── modules/
│   │   │   ├── auth/            # routes, controller, service, schema
│   │   │   ├── users/
│   │   │   ├── categories/
│   │   │   ├── brands/
│   │   │   ├── products/
│   │   │   ├── plans/           # installment plan engine
│   │   │   ├── cart/
│   │   │   ├── orders/          # + verification workflow
│   │   │   ├── payments/        # JazzCash/EasyPaisa/bank reconciliation
│   │   │   ├── vendors/
│   │   │   ├── stores/          # public store pages
│   │   │   ├── reviews/
│   │   │   ├── cms/             # pages, faqs, policies
│   │   │   ├── blog/
│   │   │   ├── branches/        # visit-us centres
│   │   │   ├── tracking/        # order tracking by id+phone
│   │   │   ├── notifications/   # SMS/email/WhatsApp abstraction
│   │   │   ├── search/          # facets, suggestions
│   │   │   ├── uploads/
│   │   │   ├── reports/         # admin analytics
│   │   │   └── health/
│   │   ├── jobs/                # bullmq workers: reminders, sitemap, seo-pages
│   │   ├── utils/               # logger, errors, pagination, money (paisa)
│   │   └── types/
│   ├── tests/                   # unit + integration (supertest)
│   └── seeds/                   # categories, brands, demo products, cms content
│
└── shared/                      ← workspace: zod schemas + TS types + constants
    ├── src/schemas/             # product.schema.ts, checkout.schema.ts ...
    └── src/constants/           # order statuses, plan terms, cities
```

---

## 5. Data Model (MongoDB / Mongoose)

> Conventions: `ObjectId` refs, `slug` unique per collection, `timestamps: true`, money in **paisa (int)**, soft-delete via `status`.

### 5.1 ER overview

```
User ─┬─< Address
      ├─< Order >─ OrderItem >─ Product >─ Brand
      │     │           └─ InstallmentPlan(product snapshot)
      │     ├─ VerificationRequest (CNIC + guarantors)
      │     └─ Payment >─ InstallmentSchedule (per month)
      └─< Review / Wishlist / Cart

Vendor ─< Store ─< Product
Category ─< Category (self ref, 2 levels) ─< Product
CmsPage / BlogPost / PressItem / Branch / DealOfDay / Banner
```

### 5.2 Collections

**User**
```ts
{
  _id, name, email?, phone (unique, E.164), passwordHash?,
  role: 'customer' | 'vendor' | 'admin' | 'staff',
  status: 'active' | 'blocked' | 'pending',
  cnicMasked?, verificationStatus: 'unverified'|'pending'|'verified'|'rejected',
  defaultAddressRef?, isEmailVerified, isPhoneVerified,
  refreshTokenHash?, lastLoginAt, failedLoginCount, lockedUntil?
}
```

**Address** — `{ user, label, line1, line2, city, area, postalCode, geo?: {type:'Point',coordinates}, isDefault }` (2dsphere index for branch/availability checks)

**Category** (2-level, self-ref)
```ts
{ name, nameUr?, slug, parent?: ObjectId, icon?, image?, order, isActive,
  seo: { title, description, keywords },
  filters: [{ key: 'ram', label, type: 'range'|'enum', options: [...] }]  // spec filter defs per category
}
```
*Note:* site ka numbering jaise `mobiles/samsung-5` — hum simple 2-level slugs use karenge (`/product-category/mobiles/samsung`), legacy numeric suffix ki zaroorat nahi.

**Brand** — `{ name, slug, logo?, categories: [ObjectId] }`

**Product**
```ts
{
  name, slug (unique), sku (unique), brand, categories: [ObjectId],
  vendor: ObjectId, store?: ObjectId,
  description, highlights: [String], specs: [{ key, value }],   // spec table on PDP
  images: [{ url, alt, sort }],
  variants?: [{ color, images, stockDelta, priceOverride }],
  cashPrice (paisa),                                         // base price
  minAdvance (paisa),                                        // shown on cards
  stock: { qty, track: boolean, status: 'in_stock'|'out_of_stock'|'pre_order' },
  tags: ['deal-of-day','special-offer','instant-delivery'],
  status: 'draft'|'active'|'inactive', featured: Boolean, ratingStats: {avg,count},
  seo: {title, description}, soldCount, viewCount,
  delivery: { free: true, instantCities: ['Karachi','Lahore'] },
  warranty: 'company'|'seller', 
}
```
Indexes: `slug`, `sku`, `categories+status+minAdvance`, `vendor+status`, text/Atlas-Search on `name, brand, specs.value`.

**InstallmentPlan** (per product, explicit — site jaisa)
```ts
{
  product: ObjectId,
  plans: [{
    term: 6 | 9 | 12 | 18 | 24,
    advance: Number,        // paisa
    monthly: Number,        // paisa
    discountType?: 'percent'|'flat', discountValue?,
    isActive: true, sortOrder
  }],
  // derived at read-time: totalPayable = advance + monthly*term
}
```

**Cart** — `{ user|guestId, items: [{ product, variant?, qty, planTerm? }], updatedAt }`
(Persistent cart for logged-in; guest cart merged on login.)

**Order**
```ts
{
  orderNumber: 'QST-2026-000123' (unique, human-readable for tracking),
  user, phone, items: [{
     product, name snapshot, image snapshot, vendor, store?,
     qty, cashPriceSnapshot, planTerm, advanceSnapshot, monthlySnapshot
  }],
  pricing: { subtotalCash, totalAdvance, totalMonthly, totalPayable, deliveryFee: 0 },
  shippingAddress: {…denormalized snapshot…},
  paymentMethod: 'easypaisa'|'jazzcash'|'bank_transfer'|'cheque'|'cod',
  status: 'pending_verification' | 'verification_in_progress' | 'approved'
        | 'rejected' | 'processing' | 'shipped' | 'delivered'
        | 'cancelled' | 'defaulted' | 'completed',
  verification: ObjectId, schedule: [ObjectId], // installments
  timeline: [{ status, at, by, note }],
  tracking: { courier?, trackingNo?, history: [{status, at, note}] },
  assignedTo (sales rep), notes
}
```

**VerificationRequest** (CNIC + 2 guarantors — site ka exact flow)
```ts
{
  order, status: 'pending'|'in_review'|'approved'|'rejected',
  customer: { cnicNo, cnicFrontUrl, cnicBackUrl, selfieUrl, signatureUrl },
  guarantors: [{ name, relation, cnicNo, cnicCopyUrl, phone, address, ownsHomeOrBusiness: bool }],
  visitedAt?, reviewedBy?, rejectionReason?, approvedAt?
}
```

**InstallmentSchedule** (per order item-month)
```ts
{
  order, user, installmentNo: 1..N, dueDate,
  amount (paisa), status: 'upcoming'|'due'|'paid'|'partial'|'overdue'|'waived',
  paidAmount, paidAt?, method?, txnRef?, consumerId? (wallet Consumer ID),
  reminders: [{ at, channel }]
}
```
Unique index: `(order, installmentNo)`. This powers the customer "Installments" dashboard + admin collection view.

**Payment** — `{ order, schedule?, user, amount, method, status: 'initiated'|'confirmed'|'failed'|'reversed', providerRef?, proofUrl?, confirmedBy? }`
(Manual-confirmation flow first: customer pays via wallet → admin/consumer-ID reconciliation; provider APIs pluggable later.)

**Vendor** — `{ user, businessName, slug, logo, banner, address, bio, phone, email, cnic, bankDetails, status: 'pending'|'approved'|'suspended', commissionPercent, payoutSchedule, docs: [...] , ratingStats }`

**Store** (public store page) — vendor ka public profile: `{ vendor, name, slug, address, about, approvedBadges: [String] }` — `/stores` listing + `/store/:slug`.

**CmsPage** — `{ slug, title, body (rich/MD), template: 'about'|'contact'|'faq'|'policy'|'verification'|'payment'|'become-vendor'|'generic', seo, isPublished, order, faqItems? , bilingual?: { ur: {...} } }`

**BlogPost / PressItem** — `{ slug, title, excerpt, body, cover, author, tags, type: 'blog'|'press', publishedAt, seo }`

**Branch / FacilitationCentre** — `{ name, city, area, address, phone, hours, geo, isActive }` (→ `/visit-us` group-by-city)

**DealOfDay** — `{ title, startsAt, endsAt, products: [ObjectId], isActive }` (countdown ke liye)

**Banner / HomeSection** — home rails configurable: `{ sectionKey: 'mobiles'|'deals'|..., title, productQuery: {...} | productIds, order, isActive }`

**SeoLandingPage** — `{ slug, filters: { brand?, minPrice?, maxPrice?, category? }, title, description, blocks, isPublished }` → `/[slug]` rule (P2)

**AuditLog** — admin actions (`{ actor, action, entity, entityId, diff, at }`) — verification/approval steps ke liye zaroori.

**RefreshToken** (or hash inside user) — rotation + reuse detection.

---

## 6. Installment Engine & Business Rules

### 6.1 Plan resolution
```
GET /api/products/:slug → includes active plans sorted by term
UI: PlanSelector shows [Plan 1: Rs X × 6 months | Rs Y Advance, ...]
```

### 6.2 Pricing computation (server-side, never trust client)

```ts
computePlan(product.cashPrice, plan) → {
  advance      = plan.advance,
  monthly      = plan.monthly,
  term         = plan.term,
  totalPayable = advance + monthly * term,
  markup       = totalPayable - cashPrice,
  aprLike      = markup / cashPrice  // internal reporting only, NOT shown as "interest"
}
```

**Rules:**
1. Order create karte waqt **server se fresh plans fetch** karke snapshot store karo (price-change race avoid).
2. Advance ≥ configured minimum (e.g. 10–15% of cashPrice) — validation.
3. Paisa integers only — floats kabhi use mat karo (money bug #1).
4. Rounded monthly amounts: last installment adjustment (`roundOffAdjustment`) so `Σ schedule == totalPayable` **exactly**.
5. Musawamah: UI par "total payable" dikhao, markup ko alag "interest" label mat do (compliance).

### 6.3 Order state machine

```
pending_verification ─approve→ approved ─→ processing ─→ shipped ─→ delivered ─→ (installments) ─→ completed
        │                    └reject→ rejected                     │
        └─cancel (before verification only — site rule)→ cancelled   └─nonpayment→ defaulted
```
Transitions **only** via service functions with RBAC + AuditLog. (Site FAQ rule: *"orders can be changed only before verification"* — encode as guard.)

### 6.4 Verification workflow
1. Order → `pending_verification`
2. Sales rep assigned → `verification_in_progress` (call logged)
3. CNIC + guarantors docs uploaded → review
4. `approved` → schedule generated (`InstallmentSchedule` rows, first due typically at delivery/30 days — configurable) OR `rejected` with reason
5. SMS/WhatsApp confirmation to customer

### 6.5 Payment collection
- MVP: **manual confirmation** (admin records wallet/bank txn with proof) — realistic for PK market
- v1.1: provider integration abstraction: `PaymentGateway` interface → JazzCash/EasyPaisa/1Link adapters (sandbox first)
- Overdue logic: cron job marks `overdue`, sends reminders (BullMQ), escalation to `defaulted` after N days

### 6.6 Roles & permissions (RBAC)
`customer | vendor | staff | admin` — middleware `requireAuth`, `requireRole(...)`; vendor scoping enforced in service layer (vendor can only touch own products/orders).

---

## 7. API Contract (REST, `/api/v1`)

### Auth
```
POST   /auth/register            { name, phone, password }
POST   /auth/login               → { accessToken } + refresh cookie
POST   /auth/refresh             (rotation)
POST   /auth/logout
POST   /auth/otp/request|verify   (phone verification)
GET    /auth/me
```

### Catalog (public)
```
GET /categories/tree
GET /brands?category=
GET /products?category=&brand=&minPrice=&maxPrice=&specs[ram]=&sort=&page=&limit=
GET /products/:slug                (includes plans, related, sameBrand)
GET /products/:slug/reviews
POST /products/:slug/reviews       (auth)
GET /search/suggestions?q=
GET /deals/active                  (countdown payload)
GET /home/sections                 (rails config → rendered)
```

### Cart / Checkout / Orders
```
GET|POST|PATCH|DELETE /cart/items            (guest via header cartId)
POST /checkout/quote        { items, planTerms, address }  → server-priced quote
POST /checkout/order        → { orderNumber, verificationRequired }
GET  /orders                       (own, paginated)
GET  /orders/:orderNumber
GET  /orders/:orderNumber/schedule         (installment schedule)
GET  /orders/track?orderNumber=&phone=      (public tracking — no auth)
```

### Vendor (role: vendor)
```
POST /vendors/apply                    (become-vendor form)
GET  /vendors/me/products  | CRUD /vendors/me/products/:id
GET  /vendors/me/orders
PATCH /vendors/me/orders/:id/dispatch
GET  /vendors/me/payouts
GET  /stores                          (public directory)  GET /stores/:slug
```

### Admin (role: admin/staff)
```
GET  /admin/dashboard                  (kpis: orders, revenue, due installments)
CRUD /admin/categories | /admin/brands | /admin/products
POST /admin/deals | CRUD /admin/pages | /admin/blog | /admin/press | /admin/branches
GET  /admin/orders?status=
PATCH /admin/orders/:id/status           (state machine)
CRUD /admin/verifications/:id            (approve/reject + docs)
POST /admin/payments/record
GET  /admin/installments?status=overdue
POST /admin/vendors/:id/approve
POST /admin/uploads                       (signed upload)
```

### System
```
GET /health  /ready      |  POST /webhooks/payments/:provider (future)
```

**Conventions:** envelope `{ success, data, meta? , error? { code, message, details } }`, cursor/page pagination, zod validation shared from `shared/`, consistent error codes, request-id logging.

---

## 8. Page-by-Page Build Spec (frontend acceptance criteria)

| Page | Must-have behaviors |
|---|---|
| **Home** | USP bar, category strip (all 17), top-categories marquee (dual row like original), **Deals of the Day with live countdown** (server-provided endsAt), 6 category rails with "View All", app banner, footer links |
| **Shop** | Price slider (1 – 1,000,000 default), category checkboxes, sort (popular/newest/price asc-desc), product count, pagination/infinite, filter state in URL |
| **Category** | Brand chips (subcats), **spec filters (RAM/Storage where defined)**, SEO description block, grid |
| **Product** | Gallery + zoom, **PlanSelector (3 plans: monthly × term + advance)**, vendor block, spec table, color variant switch, trust badges, Related + Same Brand rails, sticky add-to-cart, breadcrumb |
| **Cart** | Qty edit, remove, plan term per item, free-delivery notice, checkout CTA, empty state |
| **Checkout** | Address form (city/area), phone, plan summary, **order → pending_verification**, success page with order number + "what happens next" (verification steps) |
| **Order Tracking** | Order ID + phone → timeline status (no login) |
| **Account** | Orders list, **installment schedule table with due dates & paid status**, profile, addresses, verification status |
| **Stores / Store page** | Directory grid; store page with badge, address, product count + grid |
| **Visit Us** | Cities grouped with counts, centres list, "Directions" (maps link) |
| **Static pages** | CMS-driven; **verification-process bilingual EN/UR**; payment-method steps for both wallets + video slots |
| **FAQ / Contact** | Accordion FAQ; contact form → creates ticket/notification; branches sidebar |
| **Blogs / Press** | Listing + detail, Press/Blogs tab switch |
| **Auth** | Register/login with phone+password, OTP verify, route guards |
| **Admin** | Dashboard KPIs, CRUDs, **verification queue with document viewer**, order state transitions, installment collections, CMS editor |
| **Vendor** | Apply form, product CRUD w/ plan editor, orders, payout view |

**Cross-cutting UI:** loading skeletons, empty/error states, toasts, mobile-first responsive (original heavily used on mobile), WhatsApp float button, sticky header, breadcrumbs.

---

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **SEO** | SSR for all catalog pages; per-page metadata + OG; JSON-LD (`Product` w/ `offers` incl. `price`, `BreadcrumbList`, `FAQPage`, `Organization`); dynamic `sitemap.ts` (products/categories/blogs split sitemaps); `robots.ts` (Disallow `/account/`, `/order-tracking`, `/search` — original ke rules); canonical; 404 page |
| **Performance** | LCP < 2.5s on 4G; image optimization (next/image, AVIF/WebP); ISR for product pages (revalidate 3600 — original `s-maxage=3600` jaisa); Redis cache for rails/categories (TTL 5–60m, tag-invalidation on admin CRUD); route-level code splitting; CDN for static |
| **Security** | Helmet, CORS allowlist, rate limiting (auth: 5/min, global: 120/min), zod validation everywhere, bcrypt/argon2, JWT rotation + reuse detection, RBAC + vendor data scoping, upload MIME/size validation + signed URLs, no PII in public APIs (tracking needs ID+phone match), audit log, secrets via env only, dependency audit in CI |
| **Money safety** | Integer paisa, server-side pricing, idempotency keys on `POST /checkout/order` and `POST /payments/record`, schedule sum invariant test |
| **A11y** | Keyboard nav, focus states, aria labels (site ke `aria-label` patterns), color contrast |
| **i18n** | EN primary + UR blocks on key pages (next-intl optional; MVP: bilingual content fields in CMS) |
| **Observability** | pino structured logs w/ request-id, Sentry errors, `/health`, basic metrics (order funnel) |
| **Legal/compliance** | Placeholder-only branding; no copied content; Shariah disclaimers as "sample content" |

---

## 10. Testing Strategy

| Layer | Tool | Coverage focus |
|---|---|---|
| Unit | Vitest | **installment math**, state machine transitions, price rounding invariants, slug/filters |
| Integration | Vitest + Supertest + mongodb-memory-server | auth flow, checkout quote/order, RBAC denials, vendor scoping |
| API contract | zod schemas from `shared/` | request/response parity |
| Component | React Testing Library | PlanSelector, FilterSidebar, CartDrawer |
| E2E | Playwright | register→browse→filter→product→cart→checkout→track; admin approve→schedule generated; vendor add product |
| Non-func | Lighthouse CI (budgets), basic k6 smoke on `/products` |

**Quality gates:** `tsc --noEmit`, ESLint, unit+integration tests, build — sab CI mein (GitHub Actions).

---

## 11. Delivery Plan (Phases, Sprints, Estimates)

> Assumptions: 1 full-stack dev (you) at ~6 productive hrs/day, or small team. Calendars are sequential; parallel dev cuts ~30%.

### Phase 0 — Foundation (Days 1–3)
- Monorepo workspaces, Next.js + Express TS scaffolds, Tailwind, ESLint/Prettier, docker-compose (mongo+redis), env schema, health endpoint, CI pipeline (lint/type/test/build), `shared` package wired
- **Deliverable:** `npm run dev` runs both apps; CI green

### Phase 1 — Catalog & Content MVP (Week 1–2) ← *public clone ban jayega*
- Schemas: Category, Brand, Product, InstallmentPlan, CmsPage, Blog/Press, Branch, Banner
- Seed script (categories/brands/demo products/plans, apni images)
- APIs: categories tree, products (filters/sort/pagination), product detail, home sections, deals
- Client: Header/MegaMenu/Footer, **Home (all sections incl. countdown)**, Shop, Category page, **Product page with PlanSelector**, static page renderer, 404
- SEO: metadata, sitemap, robots, JSON-LD Product
- **Exit criteria:** original ke homepage/category/PDP layout se visually match (apna branding), Lighthouse SEO ≥ 90, filters URL-driven

### Phase 2 — Auth, Cart, Checkout, Tracking (Week 3–4)
- Auth module (register/login/refresh/OTP), RBAC middleware
- Cart (guest+user merge), checkout quote/order (server pricing), order state machine, order number, tracking endpoint+page
- Account: orders list + order detail
- Notifications abstraction (console/SMS-stub)
- **Exit criteria:** E2E "browse → order → track" passes; idempotent order creation tested

### Phase 3 — Verification + Installments + Admin Core (Week 5–7)
- VerificationRequest flow + docs upload, staff review UI
- Installment schedule generation (invariant tests), payment recording, overdue cron + reminders
- Admin: dashboard KPIs, orders queue, verification queue, installment collections, product/category CRUD, CMS editor, deals manager, branches
- Account: installment schedule view
- **Exit criteria:** full B2C flow from order → approved → schedule → payment recorded, audited

### Phase 4 — Marketplace (Vendor) (Week 8–9)
- Vendor apply/approval, vendor dashboard (product CRUD with plan editor, orders, dispatch, payouts view), `/stores` + `/store/:slug`, become-vendor page (bilingual), vendor scoping security tests
- **Exit criteria:** vendor can list a product and it appears on storefront; cross-vendor access blocked (test)

### Phase 5 — Content, SEO & Polish (Week 10)
- CMS pages (all 10 static routes), FAQ/bilingual verification page, payment-method guide, blogs/press, visit-us map view
- SEO landing page generator (rule-based `/[slug]`), split sitemaps, OG images
- Reviews/ratings, wishlist, search suggestions, empty/error states, mobile polish, a11y pass

### Phase 6 — Hardening & Launch (Week 11–12)
- Load test, cache tuning, security review (OWASP checklist), Sentry, backups (Atlas PITR), staging → prod deploy
- Runbook + admin handbook, data migration if any
- **Launch checklist (§13)**

**MVP (customer-facing clone) = end of Phase 2 (~4 weeks). Full platform = ~11–12 weeks.**

---

## 12. Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | **IP/brand infringement** | Sirf layout/functionality; no copied text/images/logo; apni seed data |
| 2 | Money math bugs | Paisa ints, invariant tests, server-side pricing |
| 3 | Scope creep (1,115 products, 40 centres...) | Seed representative data; CMS-driven content; phased plan |
| 4 | Payment provider integration (JazzCash/EasyPaisa) delays | Manual confirmation MVP → gateway interface → adapters later |
| 5 | Offline verification is manual | Design for human workflow (queues, docs, audit) — automate later (NADRA/eKYC vendor) |
| 6 | SEO parity loss vs original Next.js site | Next.js SSR + ISR + sitemap/JSON-LD from day 1 |
| 7 | Data privacy (CNIC data!) | Encrypt docs at rest (KMS/field-level), access audit, retention policy, masked display |
| 8 | Single-dev bus factor | This doc + ADRs + typed contracts + tests |

---

## 13. Launch Checklist (Definition of Done)

- [ ] All §2.2 P0+P1 routes implemented & responsive (mobile-first)
- [ ] E2E suite green: purchase flow, verification approve → schedule, vendor listing, tracking
- [ ] Money invariants tested; checkout idempotent
- [ ] RBAC + vendor scoping penetration-tested (manual checklist)
- [ ] SEO: sitemap < 50k URLs/chunk, robots rules, JSON-LD validates (Rich Results Test)
- [ ] Lighthouse: Performance ≥ 85 (home/PDP mobile), SEO ≥ 95, A11y ≥ 90
- [ ] Secrets in env; no `.env` committed; rate limits active
- [ ] Monitoring + error alerts wired (Sentry), `/health` on uptime monitor
- [ ] DB backups enabled; restore rehearsed once
- [ ] Admin handbook: verify order, record payment, manage deals
- [ ] **Legal pass:** no third-party branding/content/assets; placeholder disclaimers removed/replaced with real content

---

## 14. Immediate Next Actions

1. Phase 0 scaffolding (`client/`, `server/`, `shared/`, docker-compose, CI)
2. Finalize design tokens (colors/typography) — apni branding ke liye (original se copy nahi)
3. Seed data plan: 17 categories + 20 brands + ~50 demo products with plans
4. Confirm payment approach for MVP (manual recording vs provider sandbox)

---

*Document generated from live analysis of qistbazaar.pk (sitemap crawl, rendered page extraction, header/footer DOM, infra headers). Update this file as decisions are made — treat it as the single source of truth for the QistStore build.*
