import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import {
  idParamSchema,
  movementCreateSchema,
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
} from '../lib/validation.js';
import {
  applyStockChange,
  createProduct,
  lowStockWhere,
  serializeMovement,
  serializeProduct,
  signedChange,
  updateProduct,
} from '../services/inventory.js';

export const productsRouter = Router();

/** GET /api/products?search=&categoryId=&lowStock=true&sort=name|quantity|sku|updatedAt&order=asc|desc */
productsRouter.get('/', async (req, res) => {
  const q = productListQuerySchema.parse(req.query);

  const where: Prisma.ProductWhereInput = {
    AND: [
      q.search ? { OR: [{ name: { contains: q.search } }, { sku: { contains: q.search.toUpperCase() } }] } : {},
      q.categoryId ? { categoryId: q.categoryId } : {},
      q.lowStock ? lowStockWhere() : {},
    ],
  };

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ [q.sort]: q.order }, { id: 'asc' }],
  });
  res.json({ data: products.map(serializeProduct), meta: { count: products.length } });
});

/** GET /api/products/low-stock — products at or below their reorder level, most urgent first. */
productsRouter.get('/low-stock', async (_req, res) => {
  const products = await prisma.product.findMany({
    where: lowStockWhere(),
    include: { category: true },
    orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
  });
  res.json({ data: products.map(serializeProduct), meta: { count: products.length } });
});

productsRouter.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, movements: { orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 50 } },
  });
  if (!product) throw notFound('Product');
  res.json({ data: { ...serializeProduct(product), movements: product.movements.map(serializeMovement) } });
});

productsRouter.post('/', async (req, res) => {
  const input = productCreateSchema.parse(req.body);
  const product = await createProduct(input);
  res.status(201).json({ data: serializeProduct(product) });
});

productsRouter.put('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = productUpdateSchema.parse(req.body);
  const product = await updateProduct(id, input);
  res.json({ data: serializeProduct(product) });
});

productsRouter.delete('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Product');
  // Movements are removed with the product (onDelete: Cascade).
  await prisma.product.delete({ where: { id } });
  res.status(204).end();
});

/** POST /api/products/:id/movements — record a receipt, sale or adjustment. */
productsRouter.post('/:id/movements', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const input = movementCreateSchema.parse(req.body);
  const result = await prisma.$transaction((tx) =>
    applyStockChange(tx, id, input.type, signedChange(input.type, input.quantity), input.note, input.occurredAt),
  );
  const product = await prisma.product.findUniqueOrThrow({ where: { id }, include: { category: true } });
  res.status(201).json({ data: { movement: serializeMovement(result.movement), product: serializeProduct(product) } });
});
