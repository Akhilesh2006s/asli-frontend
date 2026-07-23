/** Client helpers for IIT / product categories (built-in + Super Admin custom). */

export const PRODUCT_IIT = 'IIT';

/** Built-in defaults when API has not loaded yet. */
export const IIT_CATEGORIES = ['ALPHA', 'BETA', 'GAMMA'] as const;

export type IitCategory = string;

export const PRODUCT_CATEGORY_NONE = '';

export function normalizeCategoryCode(raw?: string | null): string {
  return String(raw || '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

export function normalizeIitCategory(value?: string | null): string {
  if (!value) return PRODUCT_CATEGORY_NONE;
  let u = normalizeCategoryCode(value);
  if (!u) return PRODUCT_CATEGORY_NONE;
  // UI labels like "IIT Alpha" / "IIT_ALPHA" → ALPHA
  if (u.startsWith('IIT_')) u = u.slice(4);
  if (u === 'GENERAL' || u === 'NONE' || u === 'ALL') return PRODUCT_CATEGORY_NONE;
  return u;
}

export function normalizeIitCategories(list?: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const c = normalizeIitCategory(String(item ?? ''));
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

export function formatIitCategoryLabel(value?: string | null, labelMap?: Record<string, string>): string {
  const c = normalizeIitCategory(value);
  if (!c) return 'General';
  if (labelMap?.[c]) return labelMap[c];
  return c
    .split('_')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
}

export function schoolCanAccessProductCategory(
  schoolIitCategories: string[] | undefined,
  productCategory?: string | null,
): boolean {
  const cat = normalizeIitCategory(productCategory);
  if (!cat) return true;
  return normalizeIitCategories(schoolIitCategories).includes(cat);
}

export type ProductCategoryRow = {
  id?: string;
  code: string;
  label: string;
  product?: string;
  description?: string;
  isActive?: boolean;
  isBuiltIn?: boolean;
  sortOrder?: number;
};
