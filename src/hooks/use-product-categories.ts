import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import {
  IIT_CATEGORIES,
  formatIitCategoryLabel,
  type ProductCategoryRow,
} from '@/lib/products';

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('superAdminToken') ||
    localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FALLBACK: ProductCategoryRow[] = IIT_CATEGORIES.map((code, i) => ({
  code,
  label: formatIitCategoryLabel(code),
  isActive: true,
  isBuiltIn: true,
  sortOrder: i + 1,
}));

/**
 * Loads product categories.
 * - Active list: public GET /api/product-categories (register + pickers)
 * - Full list (incl. inactive): Super Admin GET .../product-categories?includeInactive=true
 */
export function useProductCategories(opts?: { includeInactive?: boolean }) {
  const includeInactive = opts?.includeInactive === true;
  const [categories, setCategories] = useState<ProductCategoryRow[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let rows: ProductCategoryRow[] = [];

      if (includeInactive) {
        const res = await fetch(
          `${API_BASE_URL}/api/super-admin/product-categories?includeInactive=true`,
          { headers: authHeaders() },
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load categories');
        }
        rows = Array.isArray(json.data) ? json.data : [];
      } else {
        const res = await fetch(`${API_BASE_URL}/api/product-categories`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load categories');
        }
        rows = Array.isArray(json.data) ? json.data : [];
      }

      setCategories(rows.length ? rows : FALLBACK);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setCategories(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const active = categories.filter((c) => c.isActive !== false);
  const codes = active.map((c) => c.code);
  const labelMap = Object.fromEntries(
    categories.map((c) => [c.code, c.label || formatIitCategoryLabel(c.code)]),
  );

  return { categories, codes, labelMap, loading, error, reload };
}
