import type {
  Category,
  Dashboard,
  MovementInput,
  MovementType,
  Product,
  ProductDetail,
  ProductFilters,
  ProductInput,
  StockMovement,
} from './types';

export interface FieldError {
  field: string;
  message: string;
}

/** Error thrown for any non-2xx response, carrying the API's error envelope. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: FieldError[] = [],
  ) {
    super(message);
  }

  /** Field errors keyed by field name, ready to show under form inputs. */
  fieldMap(): Record<string, string> {
    return Object.fromEntries(this.fields.map((f) => [f.field, f.message]));
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Is the API running?');
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? `Request failed (${res.status})`,
      Array.isArray(err?.details) ? err.details : [],
    );
  }
  return body.data as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== false) s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

export const api = {
  health: () => fetch(`${BASE}/health`).then((r) => r.json() as Promise<{ status: string; demo?: boolean }>),
  dashboard: () => request<Dashboard>('/dashboard'),
  categories: () => request<Category[]>('/categories'),
  products: (f: ProductFilters = {}) => request<Product[]>(`/products${qs({ ...f })}`),
  lowStock: () => request<Product[]>('/products/low-stock'),
  product: (id: number) => request<ProductDetail>(`/products/${id}`),
  createProduct: (input: ProductInput) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(input) }),
  updateProduct: (id: number, input: Partial<ProductInput>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteProduct: (id: number) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  recordMovement: (productId: number, input: MovementInput) =>
    request<{ movement: StockMovement; product: Product }>(`/products/${productId}/movements`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  movements: (f: { productId?: number; type?: MovementType; limit?: number } = {}) =>
    request<StockMovement[]>(`/movements${qs(f)}`),
};
