export type MovementType = 'RECEIPT' | 'SALE' | 'ADJUSTMENT';

export interface Category {
  id: number;
  name: string;
  color: string;
  productCount?: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number;
  category?: Category;
  costPrice: number;
  salePrice: number;
  quantity: number;
  reorderLevel: number;
  stockValue: number;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  productId: number;
  product?: Pick<Product, 'id' | 'sku' | 'name'>;
  type: MovementType;
  change: number;
  quantityAfter: number;
  note: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface ProductDetail extends Product {
  movements: StockMovement[];
}

export interface Dashboard {
  totals: {
    stockValue: number;
    retailValue: number;
    potentialProfit: number;
    productCount: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  valueByCategory: Array<Category & { value: number; units: number; products: number }>;
  lowStock: Product[];
  recentMovements: StockMovement[];
}

export interface ProductInput {
  sku: string;
  name: string;
  description?: string | null;
  categoryId: number;
  costPrice: number;
  salePrice: number;
  quantity: number;
  reorderLevel: number;
  note?: string;
}

export interface MovementInput {
  type: MovementType;
  quantity: number;
  note?: string;
  occurredAt?: string;
}

export type ProductSort = 'name' | 'quantity' | 'sku' | 'updatedAt';
export interface ProductFilters {
  search?: string;
  categoryId?: number;
  lowStock?: boolean;
  sort?: ProductSort;
  order?: 'asc' | 'desc';
}
