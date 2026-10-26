import { z } from 'zod';

export const MOVEMENT_TYPES = ['RECEIPT', 'SALE', 'ADJUSTMENT'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

const money = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Cannot be negative')
  .max(1_000_000, 'Is unrealistically large');

const nonNegativeInt = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .min(0, 'Cannot be negative');

export const productCreateSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(2, 'SKU must be at least 2 characters')
      .max(32, 'SKU must be at most 32 characters')
      .regex(/^[A-Za-z0-9][A-Za-z0-9-_]*$/, 'Use letters, numbers, dashes or underscores')
      .transform((s) => s.toUpperCase()),
    name: z.string().trim().min(1, 'Name is required').max(120),
    description: z.string().trim().max(500).optional().nullable(),
    categoryId: z.coerce.number().int().positive('Category is required'),
    costPrice: money,
    salePrice: money,
    quantity: nonNegativeInt.default(0),
    reorderLevel: nonNegativeInt.default(0),
  })
  .strict();

export const productUpdateSchema = productCreateSchema
  .partial()
  .extend({ note: z.string().trim().max(200).optional() })
  .strict();

export const productListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['name', 'quantity', 'sku', 'updatedAt']).default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export const movementCreateSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES, { errorMap: () => ({ message: 'Type must be RECEIPT, SALE or ADJUSTMENT' }) }),
    /**
     * RECEIPT / SALE: a positive number of units.
     * ADJUSTMENT: a signed correction (e.g. -2 for breakage, +1 for a recount).
     */
    quantity: z.coerce.number().int('Must be a whole number'),
    note: z.string().trim().max(200).optional(),
    occurredAt: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.type !== 'ADJUSTMENT' && v.quantity <= 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Must be greater than zero' });
    }
    if (v.type === 'ADJUSTMENT' && v.quantity === 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Adjustment cannot be zero' });
    }
  });

export const movementListQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
