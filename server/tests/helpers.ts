import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const api = () => request(createApp());

export async function resetDb() {
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
}

export async function makeCategory(name = 'Beverages') {
  return prisma.category.create({ data: { name } });
}

export const productPayload = (categoryId: number, overrides: Record<string, unknown> = {}) => ({
  sku: 'bev-001',
  name: 'Sparkling Water',
  categoryId,
  costPrice: 0.45,
  salePrice: 1.2,
  quantity: 50,
  reorderLevel: 10,
  ...overrides,
});
