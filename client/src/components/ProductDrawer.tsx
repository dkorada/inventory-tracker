import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { History, PackagePlus, Pencil, ShoppingCart, Trash2, X } from 'lucide-react';
import { useProduct } from '../hooks/queries';
import { formatDateTime, formatMoney, formatNumber, margin, signed } from '../lib/format';
import type { MovementType, Product } from '../lib/types';
import { Button } from './ui/Button';
import { CategoryBadge, MovementBadge, StockStatus } from './ui/Badge';
import { EmptyState, ErrorState, Skeleton } from './ui/States';

interface Props {
  productId: number | null;
  onClose: () => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onMove: (p: Product, type: MovementType) => void;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/60">
      <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={clsx('tabular mt-0.5 text-sm font-semibold', tone ?? 'text-slate-900')}>{value}</div>
    </div>
  );
}

/** Slide-over with a product's key numbers and full movement history. */
export function ProductDrawer({ productId, onClose, onEdit, onDelete, onMove }: Props) {
  const open = productId !== null;
  const { data: p, isLoading, error, refetch } = useProduct(productId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Fill level relative to twice the reorder level gives an intuitive "how healthy" bar.
  const fill = p ? Math.min(100, (p.quantity / Math.max(1, p.reorderLevel * 2)) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="animate-fade-in absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Product details"
        className="animate-pop-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <span className="text-sm font-medium text-slate-500">Product details</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
              <Skeleton className="h-40" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : p ? (
            <>
              <div className="space-y-4 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{p.sku}</span>
                    <CategoryBadge category={p.category} />
                    <StockStatus product={p} />
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{p.name}</h2>
                  {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-slate-500">On hand</span>
                    <span className="tabular">
                      <span className="text-xl font-semibold text-slate-900">{formatNumber(p.quantity)}</span>
                      <span className="text-slate-400"> / reorder at {formatNumber(p.reorderLevel)}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        p.quantity === 0 ? 'bg-rose-500' : p.isLowStock ? 'bg-amber-500' : 'bg-emerald-500',
                      )}
                      style={{ width: `${Math.max(fill, p.quantity > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Cost price" value={formatMoney(p.costPrice)} />
                  <Stat label="Sale price" value={formatMoney(p.salePrice)} />
                  <Stat
                    label="Margin"
                    value={`${margin(p.costPrice, p.salePrice).toFixed(1)}%`}
                    tone="text-emerald-700"
                  />
                  <Stat label="Stock value" value={formatMoney(p.stockValue)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onMove(p, 'RECEIPT')}>
                    <PackagePlus className="size-4" /> Receive
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onMove(p, 'SALE')}>
                    <ShoppingCart className="size-4" /> Record sale
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-100">
                <h3 className="flex items-center gap-2 px-5 pt-4 pb-2 text-sm font-semibold text-slate-900">
                  <History className="size-4 text-slate-400" /> Movement history
                </h3>
                {p.movements.length === 0 ? (
                  <EmptyState compact icon={<History />} title="No movements yet" />
                ) : (
                  <ul className="divide-y divide-slate-100 pb-4">
                    {p.movements.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <MovementBadge type={m.type} />
                            <span className="text-xs text-slate-400">{formatDateTime(m.occurredAt)}</span>
                          </div>
                          {m.note && <p className="mt-0.5 truncate text-xs text-slate-500">{m.note}</p>}
                        </div>
                        <div className="tabular text-right">
                          <div
                            className={clsx(
                              'text-sm font-semibold',
                              m.change > 0 ? 'text-emerald-600' : 'text-slate-900',
                            )}
                          >
                            {signed(m.change)}
                          </div>
                          <div className="text-[11px] text-slate-400">→ {formatNumber(m.quantityAfter)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>

        {p && (
          <div className="flex gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => onEdit(p)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onDelete(p)}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
