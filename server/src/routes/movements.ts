import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { movementListQuerySchema } from '../lib/validation.js';
import { serializeMovement } from '../services/inventory.js';

export const movementsRouter = Router();

/** GET /api/movements?productId=&type=&limit= — newest first. */
movementsRouter.get('/', async (req, res) => {
  const q = movementListQuerySchema.parse(req.query);
  const movements = await prisma.stockMovement.findMany({
    where: { productId: q.productId, type: q.type },
    include: { product: { select: { id: true, sku: true, name: true } } },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: q.limit,
  });
  res.json({ data: movements.map(serializeMovement), meta: { count: movements.length } });
});
