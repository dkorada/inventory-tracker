import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MovementInput, MovementType, ProductFilters, ProductInput } from '../lib/types';

export const keys = {
  dashboard: ['dashboard'] as const,
  categories: ['categories'] as const,
  products: (f: ProductFilters) => ['products', f] as const,
  product: (id: number) => ['product', id] as const,
  movements: (f: object) => ['movements', f] as const,
};

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard });
export const useCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: api.categories, staleTime: 5 * 60_000 });
export const useProducts = (f: ProductFilters) =>
  useQuery({ queryKey: keys.products(f), queryFn: () => api.products(f), placeholderData: (prev) => prev });
export const useProduct = (id: number | null) =>
  useQuery({ queryKey: keys.product(id ?? 0), queryFn: () => api.product(id!), enabled: id !== null });
export const useMovements = (f: { type?: MovementType; productId?: number; limit?: number }) =>
  useQuery({ queryKey: keys.movements(f), queryFn: () => api.movements(f), placeholderData: (prev) => prev });

/** Any stock or catalogue change can affect every view, so refresh them all. */
function useInvalidateInventory() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['products'] }),
      qc.invalidateQueries({ queryKey: ['product'] }),
      qc.invalidateQueries({ queryKey: ['movements'] }),
      qc.invalidateQueries({ queryKey: keys.dashboard }),
      qc.invalidateQueries({ queryKey: keys.categories }),
    ]);
}

export function useSaveProduct() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ProductInput }) =>
      id ? api.updateProduct(id, input) : api.createProduct(input),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateInventory();
  return useMutation({ mutationFn: (id: number) => api.deleteProduct(id), onSuccess: invalidate });
}

export function useRecordMovement() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: number; input: MovementInput }) =>
      api.recordMovement(productId, input),
    onSuccess: invalidate,
  });
}
