/** Mirrors backend/constants/products.js for Super Admin + teacher UI. */
export const PRODUCT_IIT = 'IIT';

export const IIT_CATEGORIES = ['ALPHA', 'BETA', 'GAMMA'] as const;

export type IitCategory = (typeof IIT_CATEGORIES)[number];

export const IIT_FUTURE_CATEGORY_SLOT = {
  id: 'FUTURE',
  label: 'Future curriculum',
  enabled: false,
} as const;

export const PRODUCT_CATEGORY_NONE = '';

export function normalizeIitCategory(value?: string | null): string {
  if (!value) return PRODUCT_CATEGORY_NONE;
  const u = String(value).toUpperCase().trim();
  return (IIT_CATEGORIES as readonly string[]).includes(u) ? u : PRODUCT_CATEGORY_NONE;
}

export function normalizeIitCategories(list?: unknown): IitCategory[] {
  if (!Array.isArray(list)) return [];
  const out: IitCategory[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const c = normalizeIitCategory(String(item ?? ''));
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c as IitCategory);
  }
  return out;
}

export function formatIitCategoryLabel(value?: string | null): string {
  const c = normalizeIitCategory(value);
  if (!c) return 'General';
  return c.charAt(0) + c.slice(1).toLowerCase();
}

export function schoolCanAccessProductCategory(
  schoolIitCategories: string[] | undefined,
  productCategory?: string | null,
): boolean {
  const cat = normalizeIitCategory(productCategory);
  if (!cat) return true;
  return normalizeIitCategories(schoolIitCategories).includes(cat as IitCategory);
}

export function filterByProductCategory<T extends {
  productCategory?: string | null;
  subject?: { productCategory?: string | null } | null;
}>(rows: T[], schoolIitCategories?: string[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) =>
    schoolCanAccessProductCategory(
      schoolIitCategories,
      row.productCategory || row.subject?.productCategory || '',
    ),
  );
}
