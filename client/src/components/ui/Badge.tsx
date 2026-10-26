import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import type { Category, MovementType, Product } from '../../lib/types';

export function CategoryBadge({ category }: { category?: Pick<Category, 'name' | 'color'> }) {
  if (!category) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
      {category.name}
    </span>
  );
}

export function StockStatus({ product }: { product: Pick<Product, 'quantity' | 'reorderLevel' | 'isLowStock'> }) {
  const [label, cls] =
    product.quantity === 0
      ? ['Out of stock', 'bg-rose-50 text-rose-700 ring-rose-600/20']
      : product.isLowStock
        ? ['Low stock', 'bg-amber-50 text-amber-800 ring-amber-600/20']
        : ['In stock', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'];
  return (
    <span
      className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', cls)}
    >
      {label}
    </span>
  );
}

const movementStyles: Record<MovementType, { label: string; cls: string; Icon: typeof ArrowUpRight }> = {
  RECEIPT: { label: 'Receipt', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', Icon: ArrowDownRight },
  SALE: { label: 'Sale', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20', Icon: ArrowUpRight },
  ADJUSTMENT: { label: 'Adjustment', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20', Icon: SlidersHorizontal },
};

export const movementLabel = (t: MovementType) => movementStyles[t].label;

export function MovementBadge({ type }: { type: MovementType }) {
  const { label, cls, Icon } = movementStyles[type];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        cls,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
