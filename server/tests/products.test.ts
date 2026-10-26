import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, makeCategory, productPayload, resetDb } from './helpers.js';

let categoryId: number;

beforeEach(async () => {
  await resetDb();
  categoryId = (await makeCategory()).id;
});

afterAll(() => prisma.$disconnect());

describe('POST /api/products', () => {
  it('creates a product, normalises the SKU and records opening stock as a receipt', async () => {
    const res = await api().post('/api/products').send(productPayload(categoryId));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      sku: 'BEV-001',
      name: 'Sparkling Water',
      costPrice: 0.45,
      salePrice: 1.2,
      quantity: 50,
      reorderLevel: 10,
      stockValue: 22.5,
      isLowStock: false,
      category: { id: categoryId, name: 'Beverages' },
    });

    const movements = await prisma.stockMovement.findMany({ where: { productId: res.body.data.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: 'RECEIPT', change: 50, quantityAfter: 50, note: 'Opening stock' });
  });

  it('rejects a duplicate SKU (case-insensitive) with 409', async () => {
    await api().post('/api/products').send(productPayload(categoryId)).expect(201);
    const res = await api()
      .post('/api/products')
      .send(productPayload(categoryId, { sku: 'BEV-001', name: 'Other' }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.details[0].field).toBe('sku');
  });

  it.each([
    ['quantity', -1],
    ['reorderLevel', -5],
    ['costPrice', -0.01],
    ['salePrice', -3],
  ])('rejects a negative %s', async (field, value) => {
    const res = await api()
      .post('/api/products')
      .send(productPayload(categoryId, { [field]: value }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('rejects missing required fields and unknown categories', async () => {
    const missing = await api().post('/api/products').send({ sku: 'X1' });
    expect(missing.status).toBe(400);
    const fields = missing.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'categoryId', 'costPrice', 'salePrice']));

    const badCategory = await api().post('/api/products').send(productPayload(9999));
    expect(badCategory.status).toBe(400);
    expect(badCategory.body.error.details[0].field).toBe('categoryId');
  });
});

describe('GET /api/products', () => {
  beforeEach(async () => {
    const snacks = await makeCategory('Snacks');
    await api()
      .post('/api/products')
      .send(productPayload(categoryId, { sku: 'B1', name: 'Cola', quantity: 5 }));
    await api()
      .post('/api/products')
      .send(productPayload(categoryId, { sku: 'B2', name: 'Apple Juice', quantity: 40 }));
    await api()
      .post('/api/products')
      .send(productPayload(snacks.id, { sku: 'S1', name: 'Pretzels', quantity: 20 }));
  });

  it('lists products sorted by name by default', async () => {
    const res = await api().get('/api/products').expect(200);
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Apple Juice', 'Cola', 'Pretzels']);
    expect(res.body.meta.count).toBe(3);
  });

  it('sorts by quantity descending', async () => {
    const res = await api().get('/api/products?sort=quantity&order=desc').expect(200);
    expect(res.body.data.map((p: { quantity: number }) => p.quantity)).toEqual([40, 20, 5]);
  });

  it('searches by name or SKU, case-insensitively', async () => {
    const byName = await api().get('/api/products?search=juice').expect(200);
    expect(byName.body.data.map((p: { sku: string }) => p.sku)).toEqual(['B2']);

    const bySku = await api().get('/api/products?search=s1').expect(200);
    expect(bySku.body.data.map((p: { sku: string }) => p.sku)).toEqual(['S1']);
  });

  it('filters by category', async () => {
    const res = await api().get(`/api/products?categoryId=${categoryId}`).expect(200);
    expect(res.body.data.map((p: { sku: string }) => p.sku).sort()).toEqual(['B1', 'B2']);
  });

  it('rejects an unknown sort field', async () => {
    await api().get('/api/products?sort=price').expect(400);
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product with its movement history', async () => {
    const { body } = await api().post('/api/products').send(productPayload(categoryId));
    const res = await api().get(`/api/products/${body.data.id}`).expect(200);
    expect(res.body.data.sku).toBe('BEV-001');
    expect(res.body.data.movements).toHaveLength(1);
  });

  it('returns 404 for a missing product', async () => {
    const res = await api().get('/api/products/12345').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PUT /api/products/:id', () => {
  it('updates fields and records a quantity edit as an adjustment', async () => {
    const { body } = await api().post('/api/products').send(productPayload(categoryId));
    const id = body.data.id;

    const res = await api()
      .put(`/api/products/${id}`)
      .send({ name: 'Sparkling Water 500ml', salePrice: 1.35, quantity: 47, note: 'Shelf recount' })
      .expect(200);

    expect(res.body.data).toMatchObject({ name: 'Sparkling Water 500ml', salePrice: 1.35, quantity: 47 });
    const adj = await prisma.stockMovement.findFirst({ where: { productId: id, type: 'ADJUSTMENT' } });
    expect(adj).toMatchObject({ change: -3, quantityAfter: 47, note: 'Shelf recount' });
  });

  it('does not create a movement when quantity is unchanged', async () => {
    const { body } = await api().post('/api/products').send(productPayload(categoryId));
    await api().put(`/api/products/${body.data.id}`).send({ name: 'Renamed', quantity: 50 }).expect(200);
    expect(await prisma.stockMovement.count({ where: { productId: body.data.id } })).toBe(1);
  });

  it('allows keeping its own SKU but rejects another product’s SKU', async () => {
    const a = await api()
      .post('/api/products')
      .send(productPayload(categoryId, { sku: 'A-1' }));
    await api()
      .post('/api/products')
      .send(productPayload(categoryId, { sku: 'B-1' }));

    await api().put(`/api/products/${a.body.data.id}`).send({ sku: 'a-1' }).expect(200);
    const clash = await api().put(`/api/products/${a.body.data.id}`).send({ sku: 'b-1' });
    expect(clash.status).toBe(409);
  });

  it('rejects a negative quantity', async () => {
    const { body } = await api().post('/api/products').send(productPayload(categoryId));
    await api().put(`/api/products/${body.data.id}`).send({ quantity: -1 }).expect(400);
  });

  it('returns 404 for a missing product', async () => {
    await api().put('/api/products/999').send({ name: 'Ghost' }).expect(404);
  });
});

describe('DELETE /api/products/:id', () => {
  it('deletes the product and its movement history', async () => {
    const { body } = await api().post('/api/products').send(productPayload(categoryId));
    await api().delete(`/api/products/${body.data.id}`).expect(204);
    await api().get(`/api/products/${body.data.id}`).expect(404);
    expect(await prisma.stockMovement.count()).toBe(0);
  });

  it('returns 404 for a missing product', async () => {
    await api().delete('/api/products/999').expect(404);
  });
});
