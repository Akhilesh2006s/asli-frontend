import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createCatalogProduct,
  deleteCatalogProduct,
  fetchOrderCatalog,
  updateCatalogProduct,
} from '@/lib/order-catalog-api';
import type { ProductBundle } from './types';

type OrderCatalogContextValue = {
  catalogBundles: ProductBundle[];
  catalogLoading: boolean;
  catalogError: string | null;
  reloadCatalog: () => Promise<void>;
  updateCatalogBundle: (
    id: string,
    patch: Partial<Pick<ProductBundle, 'name' | 'classLabel' | 'price'>>,
  ) => Promise<{ success: boolean; message?: string }>;
  removeCatalogBundle: (id: string) => Promise<{ success: boolean; message?: string }>;
  addCatalogBundle: (
    bundle: ProductBundle & { isCustom?: boolean },
  ) => Promise<{ success: boolean; message?: string; data?: ProductBundle }>;
};

const OrderCatalogContext = createContext<OrderCatalogContextValue | null>(null);

export function OrderCatalogProvider({ children }: { children: ReactNode }) {
  const [catalogBundles, setCatalogBundles] = useState<ProductBundle[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const reloadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await fetchOrderCatalog();
      setCatalogBundles(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load catalog';
      setCatalogError(message);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadCatalog();
  }, [reloadCatalog]);

  const updateCatalogBundle = useCallback(
    async (id: string, patch: Partial<Pick<ProductBundle, 'name' | 'classLabel' | 'price'>>) => {
      const result = await updateCatalogProduct(id, patch);
      if (result.success) {
        const next = result.data ?? ({ id, ...patch } as ProductBundle);
        setCatalogBundles((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...next, id } : b)),
        );
      }
      return result;
    },
    [],
  );

  const removeCatalogBundle = useCallback(async (id: string) => {
    const result = await deleteCatalogProduct(id);
    if (result.success) {
      setCatalogBundles((prev) => prev.filter((b) => b.id !== id));
    }
    return result;
  }, []);

  const addCatalogBundle = useCallback(
    async (bundle: ProductBundle & { isCustom?: boolean }) => {
      const result = await createCatalogProduct(bundle);
      if (result.success) {
        const saved = result.data ?? bundle;
        setCatalogBundles((prev) => {
          if (prev.some((b) => b.id === saved.id)) return prev;
          return [...prev, saved];
        });
      }
      return result;
    },
    [],
  );

  return (
    <OrderCatalogContext.Provider
      value={{
        catalogBundles,
        catalogLoading,
        catalogError,
        reloadCatalog,
        updateCatalogBundle,
        removeCatalogBundle,
        addCatalogBundle,
      }}
    >
      {children}
    </OrderCatalogContext.Provider>
  );
}

export function useOrderCatalog() {
  const ctx = useContext(OrderCatalogContext);
  if (!ctx) {
    throw new Error('useOrderCatalog must be used within OrderCatalogProvider');
  }
  return ctx;
}
