import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useDeleteProduct } from '../hooks/queries';
import type { MovementType, Product } from '../lib/types';
import { ProductFormModal } from './ProductFormModal';
import { MovementModal } from './MovementModal';
import { ProductDrawer } from './ProductDrawer';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface Actions {
  openCreate: () => void;
  openEdit: (p: Product) => void;
  openMovement: (p: Product, type?: MovementType) => void;
  openDetails: (id: number) => void;
  confirmDelete: (p: Product) => void;
}

const Ctx = createContext<Actions | null>(null);

/**
 * Owns every product dialog so any screen (dashboard, product list, drawer)
 * can trigger the same add / edit / delete / stock-movement flows.
 */
export function InventoryActionsProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [movement, setMovement] = useState<{ product: Product | null; type: MovementType }>({
    product: null,
    type: 'RECEIPT',
  });
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const del = useDeleteProduct();

  const actions = useMemo<Actions>(
    () => ({
      openCreate: () => setForm({ open: true, product: null }),
      openEdit: (product) => setForm({ open: true, product }),
      openMovement: (product, type = 'RECEIPT') => setMovement({ product, type }),
      openDetails: (id) => setDetailsId(id),
      confirmDelete: (product) => setToDelete(product),
    }),
    [],
  );

  const closeForm = useCallback(() => setForm((f) => ({ ...f, open: false })), []);
  const closeMovement = useCallback(() => setMovement((m) => ({ ...m, product: null })), []);
  const closeDetails = useCallback(() => setDetailsId(null), []);
  const cancelDelete = useCallback(() => setToDelete(null), []);

  async function onConfirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success('Product deleted', { description: `${toDelete.name} (${toDelete.sku})` });
      if (detailsId === toDelete.id) setDetailsId(null);
      setToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete product');
    }
  }

  return (
    <Ctx.Provider value={actions}>
      {children}
      <ProductDrawer
        productId={detailsId}
        onClose={closeDetails}
        onEdit={actions.openEdit}
        onDelete={actions.confirmDelete}
        onMove={actions.openMovement}
      />
      <ProductFormModal open={form.open} product={form.product} onClose={closeForm} />
      <MovementModal
        open={!!movement.product}
        product={movement.product}
        initialType={movement.type}
        onClose={closeMovement}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete product?"
        confirmLabel="Delete product"
        loading={del.isPending}
        onCancel={cancelDelete}
        onConfirm={onConfirmDelete}
        message={
          toDelete && (
            <>
              <strong className="font-semibold text-slate-900">{toDelete.name}</strong> ({toDelete.sku}) and its entire
              stock movement history will be permanently removed. This cannot be undone.
            </>
          )
        }
      />
    </Ctx.Provider>
  );
}

export function useInventoryActions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useInventoryActions must be used inside InventoryActionsProvider');
  return ctx;
}
