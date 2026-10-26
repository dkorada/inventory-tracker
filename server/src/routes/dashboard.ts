import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { fromCents } from '../lib/money.js';
import { isLowStock, serializeMovement, serializeProduct } from '../services/inventory.js';

export const dashboardRouter = Router();

/** GET /api/dashboard — headline KPIs plus the data behind the dashboard widgets. */
dashboardRouter.get('/', async (_req, res) => {
  const [products, categories, recent] = await Promise.all([
    prisma.product.findMany({ include: { category: true } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockMovement.findMany({
      include: { product: { select: { id: true, sku: true, name: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 8,
    }),
  ]);

  // Aggregated in JS: the catalogue of a small shop comfortably fits in memory,
  // and it keeps the stock-value maths identical to the per-product figure.
  let costCents = 0;
  let retailCents = 0;
  let totalUnits = 0;
  const byCategory = new Map<number, { valueCents: number; units: number; products: number }>();

  for (const p of products) {
    costCents += p.costCents * p.quantity;
    retailCents += p.saleCents * p.quantity;
    totalUnits += p.quantity;
    const c = byCategory.get(p.categoryId) ?? { valueCents: 0, units: 0, products: 0 };
    c.valueCents += p.costCents * p.quantity;
    c.units += p.quantity;
    c.products += 1;
    byCategory.set(p.categoryId, c);
  }

  const lowStock = products
    .filter(isLowStock)
    .sort((a, b) => a.quantity - a.reorderLevel - (b.quantity - b.reorderLevel) || a.name.localeCompare(b.name));

  res.json({
    data: {
      totals: {
        stockValue: fromCents(costCents),
        retailValue: fromCents(retailCents),
        potentialProfit: fromCents(retailCents - costCents),
        productCount: products.length,
        totalUnits,
        lowStockCount: lowStock.length,
        outOfStockCount: products.filter((p) => p.quantity === 0).length,
      },
      valueByCategory: categories
        .map((c) => {
          const agg = byCategory.get(c.id) ?? { valueCents: 0, units: 0, products: 0 };
          return {
            id: c.id,
            name: c.name,
            color: c.color,
            value: fromCents(agg.valueCents),
            units: agg.units,
            products: agg.products,
          };
        })
        .filter((c) => c.products > 0)
        .sort((a, b) => b.value - a.value),
      lowStock: lowStock.map(serializeProduct),
      recentMovements: recent.map(serializeMovement),
    },
  });
});
