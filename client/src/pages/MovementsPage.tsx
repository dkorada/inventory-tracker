import { useState } from 'react';
import clsx from 'clsx';
import { ArrowLeftRight } from 'lucide-react';
import { useMovements } from '../hooks/queries';
import { useInventoryActions } from '../components/InventoryActions';
import { formatDateTime, formatNumber, signed } from '../lib/format';
import type { MovementType } from '../lib/types';
import { MovementBadge } from '../components/ui/Badge';
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/States';

const tabs: Array<{ value?: MovementType; label: string }> = [
  { label: 'All' },
  { value: 'RECEIPT', label: 'Receipts' },
  { value: 'SALE', label: 'Sales' },
  { value: 'ADJUSTMENT', label: 'Adjustments' },
];

export function MovementsPage() {
  const [type, setType] = useState<MovementType>();
  const [limit, setLimit] = useState(100);
  const { data, isLoading, isFetching, error, refetch } = useMovements({ type, limit });
  const { openDetails } = useInventoryActions();

  return (
    <>
      <PageHeader
        title="Stock movements"
        description="Every receipt, sale and adjustment, newest first. Quantities are never changed without a record here."
      />

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={type === t.value}
              onClick={() => {
                setType(t.value);
                setLimit(100);
              }}
              className={clsx(
                '-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                type === t.value
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.length ? (
          <EmptyState
            icon={<ArrowLeftRight />}
            title="No movements recorded"
            description="Receipts, sales and adjustments will appear here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/80 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th scope="col" className="py-3 pr-4 pl-5">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Change
                    </th>
                    <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell">
                      Balance
                    </th>
                    <th scope="col" className="hidden px-4 py-3 md:table-cell">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 pl-5 whitespace-nowrap text-slate-500">
                        {formatDateTime(m.occurredAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openDetails(m.productId)} className="text-left">
                          <div className="hover:text-brand-700 font-medium text-slate-900">{m.product?.name}</div>
                          <div className="font-mono text-xs text-slate-500">{m.product?.sku}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <MovementBadge type={m.type} />
                      </td>
                      <td
                        className={clsx(
                          'tabular px-4 py-3 text-right font-semibold',
                          m.change > 0 ? 'text-emerald-600' : 'text-slate-900',
                        )}
                      >
                        {signed(m.change)}
                      </td>
                      <td className="tabular hidden px-4 py-3 text-right text-slate-600 sm:table-cell">
                        {formatNumber(m.quantityAfter)}
                      </td>
                      <td className="hidden max-w-xs truncate px-4 py-3 text-slate-500 md:table-cell">
                        {m.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length >= limit && (
              <div className="border-t border-slate-100 p-3 text-center">
                <button
                  type="button"
                  onClick={() => setLimit((l) => Math.min(500, l + 100))}
                  disabled={isFetching || limit >= 500}
                  className="text-brand-600 hover:text-brand-700 text-sm font-medium disabled:text-slate-400"
                >
                  {isFetching ? 'Loading…' : limit >= 500 ? 'Showing the latest 500 movements' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
