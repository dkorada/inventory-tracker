import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PackagePlus,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { useCategories, useProducts } from '../hooks/queries';
import { useInventoryActions } from '../components/InventoryActions';
import { formatMoney, formatNumber } from '../lib/format';
import type { Product, ProductFilters, ProductSort } from '../lib/types';
import { Button, IconButton } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { CategoryBadge, StockStatus } from '../components/ui/Badge';
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui/States';

const sortOptions: Array<{ value: string; label: string }> = [
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'quantity:asc', label: 'Quantity (low → high)' },
  { value: 'quantity:desc', label: 'Quantity (high → low)' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
];

/** Filters live in the URL so views are shareable and survive a refresh. */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters: ProductFilters = {
    search: params.get('search') ?? '',
    categoryId: params.get('categoryId') ? Number(params.get('categoryId')) : undefined,
    lowStock: params.get('lowStock') === 'true',
    sort: (params.get('sort') as ProductSort) ?? 'name',
    order: (params.get('order') as 'asc' | 'desc') ?? 'asc',
  };
  const update = (
    patch: Partial<Record<'search' | 'categoryId' | 'lowStock' | 'sort' | 'order', string | undefined>>,
  ) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '' || v === 'false') next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  };
  return { filters, update, clear: () => setParams({}, { replace: true }) };
}

function SortHeader({
  label,
  field,
  filters,
  onSort,
  className,
}: {
  label: string;
  field: ProductSort;
  filters: ProductFilters;
  onSort: (field: ProductSort) => void;
  className?: string;
}) {
  const active = filters.sort === field;
  const Icon = !active ? ArrowUpDown : filters.order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={clsx('px-4 py-3', className)}
      aria-sort={active ? (filters.order === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={clsx('inline-flex items-center gap-1 uppercase hover:text-slate-900', active && 'text-slate-900')}
      >
        {label}
        <Icon className={clsx('size-3.5', !active && 'text-slate-300')} />
      </button>
    </th>
  );
}

function RowActions({ p }: { p: Product }) {
  const { openMovement, openEdit, confirmDelete } = useInventoryActions();
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      <IconButton label={`Receive stock for ${p.name}`} onClick={() => openMovement(p, 'RECEIPT')}>
        <PackagePlus className="size-4" />
      </IconButton>
      <IconButton label={`Record sale of ${p.name}`} onClick={() => openMovement(p, 'SALE')}>
        <ShoppingCart className="size-4" />
      </IconButton>
      <IconButton label={`Edit ${p.name}`} onClick={() => openEdit(p)}>
        <Pencil className="size-4" />
      </IconButton>
      <IconButton
        label={`Delete ${p.name}`}
        onClick={() => confirmDelete(p)}
        className="hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  );
}

export function ProductsPage() {
  const { filters, update, clear } = useFilters();
  const [search, setSearch] = useState(filters.search ?? '');
  const { data: categories } = useCategories();
  const { data: products, isLoading, isFetching, error, refetch } = useProducts(filters);
  const { openCreate, openDetails } = useInventoryActions();

  // Debounce typing into the URL / query.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== filters.search) update({ search: search.trim() || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onSort = (field: ProductSort) =>
    update({ sort: field, order: filters.sort === field && filters.order === 'asc' ? 'desc' : 'asc' });

  const hasFilters = !!(filters.search || filters.categoryId || filters.lowStock);
  const lowCount = products?.filter((p) => p.isLowStock).length ?? 0;

  return (
    <>
      <PageHeader
        title="Products"
        description="Search, filter and manage everything you stock."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by name or SKU…"
              aria-label="Search products"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select
              aria-label="Filter by category"
              value={filters.categoryId ?? ''}
              onChange={(e) => update({ categoryId: e.target.value || undefined })}
              className="sm:w-48"
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.productCount})
                </option>
              ))}
            </Select>
            <Select
              aria-label="Sort products"
              value={`${filters.sort}:${filters.order}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split(':');
                update({ sort, order });
              }}
              className="sm:w-52"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {!sortOptions.some((o) => o.value === `${filters.sort}:${filters.order}`) && (
                <option value={`${filters.sort}:${filters.order}`}>Custom</option>
              )}
            </Select>
            <button
              type="button"
              onClick={() => update({ lowStock: filters.lowStock ? undefined : 'true' })}
              aria-pressed={filters.lowStock}
              className={clsx(
                'col-span-2 inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap ring-1 transition-colors ring-inset',
                filters.lowStock
                  ? 'bg-amber-50 text-amber-800 ring-amber-300'
                  : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50',
              )}
            >
              <AlertTriangle className="size-4" /> Low stock only
            </button>
          </div>
        </div>

        {/* Result summary */}
        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-500">
          <span>
            {products ? (
              <>
                {formatNumber(products.length)} product{products.length === 1 ? '' : 's'}
                {lowCount > 0 && !filters.lowStock && (
                  <span className="text-amber-700"> · {lowCount} low on stock</span>
                )}
              </>
            ) : (
              ' '
            )}
            {isFetching && !isLoading && <span className="ml-2 text-slate-400">Updating…</span>}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                clear();
              }}
              className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 font-medium"
            >
              <X className="size-3.5" /> Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4 pt-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !products?.length ? (
          hasFilters ? (
            <EmptyState
              icon={<PackageSearch />}
              title="No products match your filters"
              description="Try a different search term or category."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    clear();
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<PackageSearch />}
              title="No products yet"
              description="Add your first product to start tracking stock."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" /> Add product
                </Button>
              }
            />
          )
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="border-y border-slate-100 bg-slate-50/80 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <tr>
                    <SortHeader label="Product" field="name" filters={filters} onSort={onSort} className="pl-5" />
                    <th scope="col" className="hidden px-4 py-3 xl:table-cell">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Cost
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Price
                    </th>
                    <SortHeader label="Qty" field="quantity" filters={filters} onSort={onSort} className="text-right" />
                    <th scope="col" className="hidden px-4 py-3 text-right lg:table-cell">
                      Reorder at
                    </th>
                    <th scope="col" className="hidden px-4 py-3 text-right lg:table-cell">
                      Value
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => openDetails(p.id)}
                      className={clsx(
                        'group cursor-pointer transition-colors',
                        p.quantity === 0
                          ? 'bg-rose-50/50 hover:bg-rose-50'
                          : p.isLowStock
                            ? 'bg-amber-50/50 hover:bg-amber-50'
                            : 'hover:bg-slate-50',
                      )}
                    >
                      <td
                        className={clsx(
                          'border-l-[3px] py-3 pr-4 pl-4',
                          p.quantity === 0
                            ? 'border-rose-500'
                            : p.isLowStock
                              ? 'border-amber-400'
                              : 'border-transparent',
                        )}
                      >
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="font-mono text-xs text-slate-500">{p.sku}</div>
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">
                        <CategoryBadge category={p.category} />
                      </td>
                      <td className="tabular px-4 py-3 text-right text-slate-600">{formatMoney(p.costPrice)}</td>
                      <td className="tabular px-4 py-3 text-right text-slate-900">{formatMoney(p.salePrice)}</td>
                      <td
                        className={clsx(
                          'tabular px-4 py-3 text-right font-semibold',
                          p.quantity === 0 ? 'text-rose-600' : p.isLowStock ? 'text-amber-700' : 'text-slate-900',
                        )}
                      >
                        {formatNumber(p.quantity)}
                      </td>
                      <td className="tabular hidden px-4 py-3 text-right text-slate-500 lg:table-cell">
                        {formatNumber(p.reorderLevel)}
                      </td>
                      <td className="tabular hidden px-4 py-3 text-right text-slate-600 lg:table-cell">
                        {formatMoney(p.stockValue)}
                      </td>
                      <td className="px-4 py-3">
                        <StockStatus product={p} />
                      </td>
                      <td className="py-2 pr-3 pl-2">
                        <RowActions p={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
              {products.map((p) => (
                <li
                  key={p.id}
                  className={clsx(
                    'border-l-[3px] px-4 py-3',
                    p.quantity === 0
                      ? 'border-rose-500 bg-rose-50/40'
                      : p.isLowStock
                        ? 'border-amber-400 bg-amber-50/40'
                        : 'border-transparent',
                  )}
                >
                  <button type="button" onClick={() => openDetails(p.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">{p.name}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">{p.sku}</span>
                          <CategoryBadge category={p.category} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={clsx(
                            'tabular text-lg font-semibold',
                            p.quantity === 0 ? 'text-rose-600' : p.isLowStock ? 'text-amber-700' : 'text-slate-900',
                          )}
                        >
                          {formatNumber(p.quantity)}
                        </div>
                        <div className="text-[11px] text-slate-400">reorder at {p.reorderLevel}</div>
                      </div>
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <StockStatus product={p} />
                      <span className="tabular">{formatMoney(p.salePrice)}</span>
                    </div>
                    <RowActions p={p} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
