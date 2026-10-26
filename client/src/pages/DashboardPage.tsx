import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  History,
  Package,
  PackagePlus,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import { useDashboard } from '../hooks/queries';
import { useInventoryActions } from '../components/InventoryActions';
import { formatMoney, formatMoneyCompact, formatNumber, formatRelative, signed } from '../lib/format';
import { Button } from '../components/ui/Button';
import { MovementBadge } from '../components/ui/Badge';
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/States';

function Kpi({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
  highlight,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'emerald' | 'amber' | 'sky';
  highlight?: boolean;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <Card className={clsx('p-5', highlight && 'bg-amber-50/40 ring-amber-300/70')}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={clsx('flex size-9 items-center justify-center rounded-lg [&>svg]:size-[18px]', tones[tone])}>
          {icon}
        </div>
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { openCreate, openMovement, openDetails } = useInventoryActions();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live snapshot of your stock, its value and what needs reordering."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : data && data.totals.productCount === 0 ? (
        <Card>
          <EmptyState
            icon={<Package />}
            title="Your catalogue is empty"
            description="Add your first product to start tracking stock levels, value and reorder alerts."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Add product
              </Button>
            }
          />
        </Card>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Total stock value"
              value={formatMoney(data.totals.stockValue)}
              sub={<>At cost · {formatMoney(data.totals.retailValue)} at retail</>}
              icon={<DollarSign />}
            />
            <Kpi
              label="Products"
              value={formatNumber(data.totals.productCount)}
              sub={<>{formatNumber(data.totals.totalUnits)} units on hand</>}
              icon={<Package />}
              tone="sky"
            />
            <Kpi
              label="Low stock"
              value={formatNumber(data.totals.lowStockCount)}
              sub={
                data.totals.outOfStockCount > 0 ? (
                  <span className="font-medium text-rose-600">{data.totals.outOfStockCount} out of stock</span>
                ) : (
                  'At or below reorder level'
                )
              }
              icon={<AlertTriangle />}
              tone="amber"
              highlight={data.totals.lowStockCount > 0}
            />
            <Kpi
              label="Potential gross profit"
              value={formatMoney(data.totals.potentialProfit)}
              sub="If all current stock sells at list price"
              icon={<TrendingUp />}
              tone="emerald"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Low-stock panel */}
            <Card className="flex flex-col lg:col-span-2 lg:row-span-2">
              <CardHeader
                title="Low-stock alerts"
                description="Products at or below their reorder level"
                action={
                  <Link
                    to="/products?lowStock=true"
                    className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-xs font-medium"
                  >
                    View all <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {data.lowStock.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CheckCircle2 />}
                  title="All stocked up"
                  description="Nothing needs reordering right now."
                />
              ) : (
                <div className="relative min-h-0 flex-1">
                  <ul className="divide-y divide-slate-100 overflow-y-auto max-lg:max-h-[480px] lg:absolute lg:inset-0">
                    {data.lowStock.map((p) => {
                      const pct = Math.min(100, (p.quantity / Math.max(1, p.reorderLevel)) * 100);
                      return (
                        <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                          <button type="button" onClick={() => openDetails(p.id)} className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="hover:text-brand-700 truncate text-sm font-medium text-slate-900">
                                {p.name}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={clsx(
                                    'h-full rounded-full',
                                    p.quantity === 0 ? 'bg-rose-500' : 'bg-amber-500',
                                  )}
                                  style={{ width: `${Math.max(pct, p.quantity ? 6 : 0)}%` }}
                                />
                              </div>
                              <span
                                className={clsx(
                                  'tabular text-xs',
                                  p.quantity === 0 ? 'font-medium text-rose-600' : 'text-slate-500',
                                )}
                              >
                                {p.quantity === 0 ? 'Out of stock' : `${p.quantity} left`} · reorder at {p.reorderLevel}
                              </span>
                            </div>
                          </button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openMovement(p, 'RECEIPT')}
                            aria-label={`Receive stock for ${p.name}`}
                          >
                            <PackagePlus className="size-4" />
                            <span className="hidden sm:inline">Receive</span>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Card>

            {/* Stock value by category */}
            <Card className="lg:col-span-3">
              <CardHeader title="Stock value by category" description="Inventory value at cost price" />
              <div className="h-72 px-2 py-4 sm:px-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.valueByCategory} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <XAxis
                      type="number"
                      tickFormatter={formatMoneyCompact}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: '#f1f5f9' }}
                      formatter={(v: number) => [formatMoney(v), 'Stock value']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={26}>
                      {data.valueByCategory.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Recent activity */}
            <Card className="lg:col-span-3">
              <CardHeader
                title="Recent stock movements"
                action={
                  <Link
                    to="/movements"
                    className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-xs font-medium"
                  >
                    Full log <ArrowRight className="size-3.5" />
                  </Link>
                }
              />
              {data.recentMovements.length === 0 ? (
                <EmptyState compact icon={<History />} title="No movements yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentMovements.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <MovementBadge type={m.type} />
                      <button
                        type="button"
                        onClick={() => openDetails(m.productId)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="hover:text-brand-700 truncate text-sm font-medium text-slate-900">
                          {m.product?.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{m.note ?? '—'}</p>
                      </button>
                      <div className="tabular text-right">
                        <p
                          className={clsx(
                            'text-sm font-semibold',
                            m.change > 0 ? 'text-emerald-600' : 'text-slate-900',
                          )}
                        >
                          {signed(m.change)}
                        </p>
                        <p className="text-[11px] whitespace-nowrap text-slate-400">{formatRelative(m.occurredAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
