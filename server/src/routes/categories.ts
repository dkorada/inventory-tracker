import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({
    data: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, productCount: c._count.products })),
  });
});
