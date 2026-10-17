import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();
const dbAvailable = process.env.MONGO_AVAILABLE === '1';

let accessToken = '';
let adminToken = '';

// ---------------------------------------------------------------------------
// HTTP layer — runs everywhere, no database required.
// ---------------------------------------------------------------------------
describe('HTTP layer (no database required)', () => {
  it('GET /health reports db state', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(['ok', 'degraded']).toContain(res.body.data.status);
    expect(['connected', 'disconnected']).toContain(res.body.data.db);
  });

  it('unknown route returns a 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects a malformed registration payload with 400 before touching the DB', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'X', phone: '12345', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a malformed order payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/checkout/order')
      .send({ customer: { name: 'A', phone: 'nope' }, items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when tracking params are missing', async () => {
    const res = await request(app).get('/api/v1/orders/track');
    expect(res.status).toBe(400);
  });

  it('protects authenticated routes', async () => {
    const res = await request(app).get('/api/v1/orders/mine');
    expect(res.status).toBe(401);
  });

  it.skipIf(dbAvailable)('DB-backed routes answer 503 (not 500) while the DB is down', async () => {
    const res = await request(app).get('/api/v1/categories/tree');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DB_UNAVAILABLE');
  });
});

/**
 * These integration tests need a running MongoDB (an in-memory server is
 * started in tests/globalSetup.ts). If it cannot start on this machine they
 * self-skip instead of failing — pure unit tests (engine.test.ts) still run.
 */
describe.skipIf(!dbAvailable)('API integration (requires MongoDB)', () => {
  beforeAll(async () => {
    const { connectDb, disconnectDb } = await import('../src/config/db.js');
    const { Category, Brand } = await import('../src/models/Category.js');
    const { Product } = await import('../src/models/Product.js');
    const { User } = await import('../src/models/User.js');
    const { Order } = await import('../src/models/Order.js');
    const bcrypt = await import('bcryptjs');

    await connectDb(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/qiststore-test');

    await Promise.all([
      Category.deleteMany({}),
      Brand.deleteMany({}),
      Product.deleteMany({}),
      User.deleteMany({}),
      Order.deleteMany({}),
    ]);

    const cat = await Category.create({ name: 'Mobiles', slug: 'mobiles' });
    const brand = await Brand.create({ name: 'Nova', slug: 'nova' });
    await Product.create({
      name: 'Nova X5 | 6GB-128GB',
      slug: 'nova-x5',
      sku: 'SKU-1',
      category: cat._id,
      brand: brand._id,
      cashPrice: 4299900,
      minAdvance: 1299900,
      plans: [
        { term: 6, advance: 1299900, monthly: 620000, isActive: true, sortOrder: 1 },
        { term: 12, advance: 1599900, monthly: 390000, isActive: true, sortOrder: 2 },
      ] as never,
      status: 'active',
    });

    await User.create([
      { name: 'Admin User', phone: '03000000001', role: 'admin', passwordHash: await bcrypt.hash('Admin@123', 10) },
      { name: 'Test Customer', phone: '03001112222', passwordHash: await bcrypt.hash('Pass@123', 10) },
    ]);

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '03000000001', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    const custLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ phone: '03001112222', password: 'Pass@123' });
    accessToken = custLogin.body.data.accessToken;
  }, 120000);

  afterAll(async () => {
    const { disconnectDb } = await import('../src/config/db.js');
    await disconnectDb();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  describe('catalog', () => {
    it('GET /api/v1/categories/tree', async () => {
      const res = await request(app).get('/api/v1/categories/tree');
      expect(res.status).toBe(200);
      expect(res.body.data[0].slug).toBe('mobiles');
    });

    it('GET /api/v1/products with category filter + pagination meta', async () => {
      const res = await request(app).get('/api/v1/products?category=mobiles');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].minAdvance).toBe(1299900);
    });

    it('GET /api/v1/products/:slug returns plans + related', async () => {
      const res = await request(app).get('/api/v1/products/nova-x5');
      expect(res.status).toBe(200);
      expect(res.body.data.plans).toHaveLength(2);
      expect(res.body.data.plans[0].term).toBe(6);
      expect(Array.isArray(res.body.data.related)).toBe(true);
    });

    it('404 for unknown product', async () => {
      const res = await request(app).get('/api/v1/products/nope');
      expect(res.status).toBe(404);
    });
  });

  describe('auth', () => {
    it('rejects duplicate registration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Dup', phone: '03001112222', password: 'whatever1' });
      expect(res.status).toBe(409);
    });

    it('rejects bad phone format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Bad Phone', phone: '12345', password: 'whatever1' });
      expect(res.status).toBe(400);
    });

    it('GET /me with token returns profile', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.phone).toBe('03001112222');
    });

    it('GET /me without token -> 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('checkout', () => {
    it('POST /checkout/quote prices lines server-side', async () => {
      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .send({ items: [{ slug: 'nova-x5', qty: 1, term: 12 }] });
      expect(res.status).toBe(200);
      expect(res.body.data.totals.totalAdvance).toBe(1599900);
      expect(res.body.data.totals.totalMonthlyPerMonth).toBe(390000);
      expect(res.body.data.totals.totalPayable).toBe(1599900 + 390000 * 12);
    });

    it('rejects quote for unavailable term', async () => {
      const res = await request(app)
        .post('/api/v1/checkout/quote')
        .send({ items: [{ slug: 'nova-x5', qty: 1, term: 9 }] });
      expect(res.status).toBe(400);
    });

    it('POST /checkout/order creates pending_verification order + schedule invariant', async () => {
      const res = await request(app)
        .post('/api/v1/checkout/order')
        .send({
          customer: { name: 'Test Customer', phone: '03001112222' },
          shippingAddress: { line1: 'House 1, Street 2', city: 'Karachi', area: 'DHA' },
          paymentMethod: 'easypaisa',
          items: [{ slug: 'nova-x5', qty: 1, term: 12 }],
        });
      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toMatch(/^QST-\d{4}-\d{6}$/);
      expect(res.body.data.status).toBe('pending_verification');

      const { Order } = await import('../src/models/Order.js');
      const order = await Order.findOne({ orderNumber: res.body.data.orderNumber }).lean();
      expect(order).toBeTruthy();
      const sum = order!.schedule.reduce((s, e) => s + e.amount, 0);
      expect(sum).toBe(order!.pricing.totalMonthlyPerMonth * 12);
    });

    it('GET /orders/track matches orderNumber+phone, rejects wrong phone', async () => {
      const created = await request(app)
        .post('/api/v1/checkout/order')
        .send({
          customer: { name: 'Track Test', phone: '03009998888' },
          shippingAddress: { line1: 'House 9, Street 9', city: 'Lahore', area: 'Model Town' },
          items: [{ slug: 'nova-x5', qty: 1, term: 6 }],
        });
      const orderNumber = created.body.data.orderNumber;

      const good = await request(app).get(`/api/v1/orders/track?orderNumber=${orderNumber}&phone=03009998888`);
      expect(good.status).toBe(200);
      expect(good.body.data.status).toBe('pending_verification');

      const bad = await request(app).get(`/api/v1/orders/track?orderNumber=${orderNumber}&phone=03000000000`);
      expect(bad.status).toBe(404);
    });
  });

  describe('admin', () => {
    it('rejects non-admin on /admin/orders', async () => {
      const res = await request(app).get('/api/v1/admin/orders').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(403);
    });

    it('admin can move order through the state machine and approve verification', async () => {
      const created = await request(app)
        .post('/api/v1/checkout/order')
        .send({
          customer: { name: 'Admin Flow', phone: '03005556666' },
          shippingAddress: { line1: 'House 5', city: 'Karachi', area: 'Gulshan' },
          items: [{ slug: 'nova-x5', qty: 1, term: 12 }],
        });
      const orderNumber = created.body.data.orderNumber;

      const toProgress = await request(app)
        .patch(`/api/v1/admin/orders/${orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'verification_in_progress' });
      expect(toProgress.status).toBe(200);

      const approve = await request(app)
        .patch(`/api/v1/admin/orders/${orderNumber}/verification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' });
      expect(approve.status).toBe(200);
      expect(approve.body.data.status).toBe('approved');

      // illegal transition: approved -> shipped must fail (processing must come first)
      const illegal = await request(app)
        .patch(`/api/v1/admin/orders/${orderNumber}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' });
      expect(illegal.status).toBe(409);
      expect(illegal.body.error.code).toBe('CONFLICT');
    });

    it('GET /admin/stats returns dashboard totals and a 14-day series', async () => {
      const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totals.orders).toBeGreaterThan(0);
      expect(res.body.data.salesSeries).toHaveLength(14);
      expect(res.body.data.statusCounts).toBeTypeOf('object');
    });

    it('GET /admin/products supports search + pagination and hides nothing from staff', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products?q=nova&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].slug).toBe('nova-x5');
      expect(res.body.meta.total).toBe(1);
    });

    it('creates, updates, archives and permanently deletes a product', async () => {
      const cats = await request(app).get('/api/v1/admin/categories').set('Authorization', `Bearer ${adminToken}`);
      const categoryId = cats.body.data[0].id;

      const created = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Test Phone',
          cashPrice: 5000000,
          category: categoryId,
          plans: [
            { term: 6, advance: 1000000, monthly: 750000 },
            { term: 12, advance: 1200000, monthly: 400000 },
          ],
          stock: { qty: 4, track: true, status: 'in_stock' },
          images: [{ url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', alt: 'test' }],
        });
      expect(created.status).toBe(201);
      expect(created.body.data.slug).toBe('admin-test-phone');
      expect(created.body.data.sku).toMatch(/^QS-/);

      const slug = created.body.data.slug;
      const updated = await request(app)
        .patch(`/api/v1/admin/products/${slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ featured: true, stock: { qty: 3, track: true, status: 'in_stock' } });
      expect(updated.status).toBe(200);

      const detail = await request(app).get(`/api/v1/admin/products/${slug}`).set('Authorization', `Bearer ${adminToken}`);
      expect(detail.body.data.featured).toBe(true);
      expect(detail.body.data.minAdvance).toBe(1000000);
      expect(detail.body.data.stock.qty).toBe(3);

      const archived = await request(app)
        .delete(`/api/v1/admin/products/${slug}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(archived.status).toBe(200);
      expect(archived.body.data.archived).toBe(true);

      const removed = await request(app)
        .delete(`/api/v1/admin/products/${slug}?permanent=true`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(removed.status).toBe(200);
      const gone = await request(app).get(`/api/v1/admin/products/${slug}`).set('Authorization', `Bearer ${adminToken}`);
      expect(gone.status).toBe(404);
    });

    it('rejects a plan whose advance is below 10% of the cash price', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Bad Margin', cashPrice: 100000, plans: [{ term: 6, advance: 1000, monthly: 20000 }] });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/advance/i);
    });

    it('blocks and unblocks a customer account', async () => {
      const list = await request(app)
        .get('/api/v1/admin/customers?q=03001112222')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(list.status).toBe(200);
      const customerId = list.body.data[0].id;

      const blocked = await request(app)
        .patch(`/api/v1/admin/customers/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'blocked' });
      expect(blocked.status).toBe(200);
      expect(blocked.body.data.status).toBe('blocked');

      const loginBlocked = await request(app)
        .post('/api/v1/auth/login')
        .send({ phone: '03001112222', password: 'Pass@123' });
      expect(loginBlocked.status).toBe(403);

      const unblocked = await request(app)
        .patch(`/api/v1/admin/customers/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });
      expect(unblocked.status).toBe(200);
      expect(unblocked.body.data.status).toBe('active');
    });

    it('records and resets an installment payment', async () => {
      const created = await request(app)
        .post('/api/v1/checkout/order')
        .send({
          customer: { name: 'Payment Test', phone: '03007778888' },
          shippingAddress: { line1: 'House 7', city: 'Karachi', area: 'Clifton' },
          items: [{ slug: 'nova-x5', qty: 1, term: 12 }],
        });
      const orderNumber = created.body.data.orderNumber;

      const paid = await request(app)
        .patch(`/api/v1/admin/orders/${orderNumber}/schedule/1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'paid', method: 'cash', txnRef: 'TEST-1' });
      expect(paid.status).toBe(200);
      expect(paid.body.data.status).toBe('paid');

      const detail = await request(app)
        .get(`/api/v1/admin/orders/${orderNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(detail.body.data.payments.collected).toBe(390000);

      const reset = await request(app)
        .patch(`/api/v1/admin/orders/${orderNumber}/schedule/1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'upcoming' });
      expect(reset.status).toBe(200);
      expect(reset.body.data.paidAmount).toBe(0);
    });

    it('exports orders as CSV', async () => {
      const res = await request(app)
        .get('/api/v1/admin/orders/export.csv')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text.split('\n')[0]).toContain('Order Number');
    });

    it('denies product CRUD to customers', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Nope', cashPrice: 1000 });
      expect(res.status).toBe(403);
    });
  });
});

describe.skipIf(dbAvailable)('API integration skipped (MongoDB unavailable on this machine)', () => {
  it('is skipped, not failed', () => {
    expect(true).toBe(true);
  });
});
