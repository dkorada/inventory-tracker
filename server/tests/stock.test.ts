import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { api, makeCategory, productPayload, resetDb } from './helpers.js';

let categoryId: number;

beforeEach(async () => {
  await resetDb();
  categoryId = (await makeCategory()).id;
});

afterAll(() => prisma.$disconnect());

const create = async (overrides: Record<string, unknown>) =>
  (await api().post('/api/products').send(productPayload(categoryId, overrides)).expect(201)).body.data;

describe('stock movements', () => {
  it('applies receipts, sales and adjustments with a running balance', async () => {
    const p = await create({ quantity: 10 });

    await api()
      .post(`/api/products/${p.id}/movements`)
      .send({ type: 'RECEIPT', quantity: 5, note: 'PO 42' })
      .expect(201);
    await api().post(`/api/products/${p.id}/movements`).send({ type: 'SALE', quantity: 8 }).expect(201);
    const res = await api()
      .post(`/api/products/${p.id}/movements`)
      .send({ type: 'ADJUSTMENT', quantity: -2, note: 'Damaged' })
      .expect(201);

    expect(res.body.data.product.quantity).toBe(5);
    expect(res.body.data.movement).toMatchObject({ type: 'ADJUSTMENT', change: -2, quantityAfter: 5 });

    const log = await api().get(`/api/movements?productId=${p.id}`).expect(200);
    expect(log.body.data.map((m: { change: number }) => m.change)).toEqual([-2, -8, 5, 10]);
  });

  it('refuses a sale that would make stock negative and leaves stock untouched', async () => {
    const p = await create({ quantity: 3 });
    const res = await api().post(`/api/products/${p.id}/movements`).send({ type: 'SALE', quantity: 4 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.quantity).toBe(3);
    expect(await prisma.stockMovement.count({ where: { productId: p.id } })).toBe(1);
  });

  it('refuses a negative adjustment past zero', async () => {
    const p = await create({ quantity: 2 });
    await api().post(`/api/products/${p.id}/movements`).send({ type: 'ADJUSTMENT', quantity: -3 }).expect(422);
  });

  it('validates the movement payload', async () => {
    const p = await create({ quantity: 2 });
    await api().post(`/api/products/${p.id}/movements`).send({ type: 'THEFT', quantity: 1 }).expect(400);
    await api().post(`/api/products/${p.id}/movements`).send({ type: 'SALE', quantity: -1 }).expect(400);
    await api().post(`/api/products/${p.id}/movements`).send({ type: 'RECEIPT', quantity: 1.5 }).expect(400);
    await api().post(`/api/products/${p.id}/movements`).send({ type: 'ADJUSTMENT', quantity: 0 }).expect(400);
    await api().post('/api/products/999/movements').send({ type: 'RECEIPT', quantity: 1 }).expect(404);
  });
});

describe('low-stock rule (quantity <= reorder level)', () => {
  beforeEach(async () => {
    await create({ sku: 'BELOW', name: 'Below', quantity: 3, reorderLevel: 10 });
    await create({ sku: 'EQUAL', name: 'Equal', quantity: 10, reorderLevel: 10 });
    await create({ sku: 'ABOVE', name: 'Above', quantity: 11, reorderLevel: 10 });
    await create({ sku: 'EMPTY', name: 'Empty', quantity: 0, reorderLevel: 0 });
  });

  it('flags products at or below the reorder level', async () => {
    const res = await api().get('/api/products').expect(200);
    const flags = Object.fromEntries(
      res.body.data.map((p: { sku: string; isLowStock: boolean }) => [p.sku, p.isLowStock]),
    );
    expect(flags).toEqual({ BELOW: true, EQUAL: true, ABOVE: false, EMPTY: true });
  });

  it('lists only low-stock products, most urgent first', async () => {
    const res = await api().get('/api/products/low-stock').expect(200);
    expect(res.body.data.map((p: { sku: string }) => p.sku)).toEqual(['EMPTY', 'BELOW', 'EQUAL']);
  });

  it('supports ?lowStock=true on the product list', async () => {
    const res = await api().get('/api/products?lowStock=true').expect(200);
    expect(res.body.data.map((p: { sku: string }) => p.sku).sort()).toEqual(['BELOW', 'EMPTY', 'EQUAL']);
  });

  it('moves a product in and out of low stock as quantity changes', async () => {
    const above = (await api().get('/api/products?search=ABOVE')).body.data[0];

    await api().post(`/api/products/${above.id}/movements`).send({ type: 'SALE', quantity: 1 }).expect(201);
    let low = await api().get('/api/products/low-stock');
    expect(low.body.data.map((p: { sku: string }) => p.sku)).toContain('ABOVE');

    await api().post(`/api/products/${above.id}/movements`).send({ type: 'RECEIPT', quantity: 1 }).expect(201);
    low = await api().get('/api/products/low-stock');
    expect(low.body.data.map((p: { sku: string }) => p.sku)).not.toContain('ABOVE');
  });

  it('re-evaluates when the reorder level changes', async () => {
    const above = (await api().get('/api/products?search=ABOVE')).body.data[0];
    const res = await api().put(`/api/products/${above.id}`).send({ reorderLevel: 20 }).expect(200);
    expect(res.body.data.isLowStock).toBe(true);
  });

  it('feeds the dashboard KPIs', async () => {
    const res = await api().get('/api/dashboard').expect(200);
    expect(res.body.data.totals).toMatchObject({
      productCount: 4,
      lowStockCount: 3,
      outOfStockCount: 1,
      totalUnits: 24,
      // 24 units x $0.45 cost
      stockValue: 10.8,
    });
    expect(res.body.data.lowStock).toHaveLength(3);
  });
});
