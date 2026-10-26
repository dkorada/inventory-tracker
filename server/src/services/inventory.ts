import type { Category, Prisma, Product, StockMovement } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { HttpError, notFound } from '../lib/errors.js';
import { fromCents, toCents } from '../lib/money.js';
import type { MovementType } from '../lib/validation.js';

type Tx = Prisma.TransactionClient;

/** The single source of truth for the low-stock rule. */
export const isLowStock = (p: Pick<Product, 'quantity' | 'reorderLevel'>) => p.quantity <= p.reorderLevel;

/** Prisma filter equivalent of `isLowStock`, compared column-to-column in SQL. */
export const lowStockWhere = (): Prisma.ProductWhereInput => ({
  quantity: { lte: prisma.product.fields.reorderLevel },
});

// ---------------------------------------------------------------------------
// Serialisers: keep DB shapes (cents, internal columns) out of the API
// ---------------------------------------------------------------------------

export const serializeProduct = (p: Product & { category?: Category | null }) => ({
  id: p.id,
  sku: p.sku,
  name: p.name,
  description: p.description,
  categoryId: p.categoryId,
  category: p.category ? { id: p.category.id, name: p.category.name, color: p.category.color } : undefined,
  costPrice: fromCents(p.costCents),
  salePrice: fromCents(p.saleCents),
  quantity: p.quantity,
  reorderLevel: p.reorderLevel,
  stockValue: fromCents(p.costCents * p.quantity),
  isLowStock: isLowStock(p),
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

export const serializeMovement = (m: StockMovement & { product?: Pick<Product, 'id' | 'sku' | 'name'> | null }) => ({
  id: m.id,
  productId: m.productId,
  product: m.product ? { id: m.product.id, sku: m.product.sku, name: m.product.name } : undefined,
  type: m.type as MovementType,
  change: m.change,
  quantityAfter: m.quantityAfter,
  note: m.note,
  occurredAt: m.occurredAt,
  createdAt: m.createdAt,
});

// ---------------------------------------------------------------------------
// Stock changes
// ---------------------------------------------------------------------------

/**
 * Apply a signed change to a product's quantity and append the matching
 * ledger row, atomically. Rejects anything that would make stock negative.
 */
export async function applyStockChange(
  tx: Tx,
  productId: number,
  type: MovementType,
  change: number,
  note?: string | null,
  occurredAt?: Date,
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw notFound('Product');

  const next = product.quantity + change;
  if (next < 0) {
    throw new HttpError(422, 'INSUFFICIENT_STOCK', `Only ${product.quantity} in stock; cannot remove ${-change}`, [
      { field: 'quantity', message: 'Quantity cannot go below zero' },
    ]);
  }

  const updated = await tx.product.update({ where: { id: productId }, data: { quantity: next } });
  const movement = await tx.stockMovement.create({
    data: { productId, type, change, quantityAfter: next, note: note || null, occurredAt: occurredAt ?? new Date() },
  });
  return { product: updated, movement };
}

/** Translate a user-facing movement (type + units) into a signed change. */
export const signedChange = (type: MovementType, quantity: number) =>
  type === 'SALE' ? -Math.abs(quantity) : type === 'RECEIPT' ? Math.abs(quantity) : quantity;

// ---------------------------------------------------------------------------
// Product CRUD
// ---------------------------------------------------------------------------

export interface ProductInput {
  sku: string;
  name: string;
  description?: string | null;
  categoryId: number;
  costPrice: number;
  salePrice: number;
  quantity: number;
  reorderLevel: number;
}

async function assertCategory(tx: Tx, categoryId: number) {
  const exists = await tx.category.findUnique({ where: { id: categoryId } });
  if (!exists) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Some fields are invalid', [
      { field: 'categoryId', message: 'Category does not exist' },
    ]);
  }
}

async function assertSkuFree(tx: Tx, sku: string, exceptId?: number) {
  const clash = await tx.product.findUnique({ where: { sku } });
  if (clash && clash.id !== exceptId) {
    throw new HttpError(409, 'CONFLICT', 'A product with this SKU already exists', [
      { field: 'sku', message: 'This SKU is already in use' },
    ]);
  }
}

export async function createProduct(input: ProductInput) {
  return prisma.$transaction(async (tx) => {
    await assertCategory(tx, input.categoryId);
    await assertSkuFree(tx, input.sku);

    const product = await tx.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description ?? null,
        categoryId: input.categoryId,
        costCents: toCents(input.costPrice),
        saleCents: toCents(input.salePrice),
        reorderLevel: input.reorderLevel,
        quantity: 0,
      },
    });

    // Opening stock goes through the ledger like any other receipt.
    if (input.quantity > 0) {
      await applyStockChange(tx, product.id, 'RECEIPT', input.quantity, 'Opening stock');
    }
    return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { category: true } });
  });
}

export async function updateProduct(id: number, input: Partial<ProductInput> & { note?: string }) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw notFound('Product');

    if (input.categoryId !== undefined) await assertCategory(tx, input.categoryId);
    if (input.sku !== undefined) await assertSkuFree(tx, input.sku, id);

    await tx.product.update({
      where: { id },
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        costCents: input.costPrice !== undefined ? toCents(input.costPrice) : undefined,
        saleCents: input.salePrice !== undefined ? toCents(input.salePrice) : undefined,
        reorderLevel: input.reorderLevel,
      },
    });

    // Editing the quantity directly is recorded as an adjustment.
    if (input.quantity !== undefined && input.quantity !== existing.quantity) {
      await applyStockChange(
        tx,
        id,
        'ADJUSTMENT',
        input.quantity - existing.quantity,
        input.note || 'Manual quantity edit',
      );
    }
    return tx.product.findUniqueOrThrow({ where: { id }, include: { category: true } });
  });
}
