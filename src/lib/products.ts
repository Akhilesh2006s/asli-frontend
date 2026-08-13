/** Client helpers for IIT / product categories (built-in + Super Admin custom). */

export const PRODUCT_IIT = 'IIT';

/** Built-in defaults when API has not loaded yet. */
export const IIT_CATEGORIES = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] as const;

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

/** Class numbers from "6"…"10" (inclusive). */
export function classNumbersInRange(classesFrom?: string | null, classesTo?: string | null): string[] {
  const from = parseInt(String(classesFrom || '').trim(), 10);
  const to = parseInt(String(classesTo || '').trim(), 10);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  if (hi - lo > 20) return [];
  const out: string[] = [];
  for (let n = lo; n <= hi; n += 1) out.push(String(n));
  return out;
}

export function normalizeIitCategoriesByClass(
  raw?: Record<string, string[]> | null,
): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    const classKey = String(key || '')
      .trim()
      .replace(/\.0+$/, '');
    if (!classKey || !/^\d{1,2}$/.test(classKey)) continue;
    out[classKey] = normalizeIitCategories(value);
  }
  return out;
}

export function flattenIitCategoriesByClass(byClass?: Record<string, string[]> | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cats of Object.values(normalizeIitCategoriesByClass(byClass))) {
    for (const c of cats) {
      if (seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

/**
 * Legacy schools: seed every class in range with school-wide tracks.
 * If byClass already exists, keep those entries and fill missing classes from legacy.
 */
export function expandIitCategoriesByClass(opts: {
  iitCategories?: string[] | null;
  iitCategoriesByClass?: Record<string, string[]> | null;
  classesFrom?: string | null;
  classesTo?: string | null;
}): Record<string, string[]> {
  const range = classNumbersInRange(opts.classesFrom, opts.classesTo);
  const existing = normalizeIitCategoriesByClass(opts.iitCategoriesByClass);
  const legacy = normalizeIitCategories(opts.iitCategories);
  const map: Record<string, string[]> = {};
  const keys = range.length ? range : Object.keys(existing);
  for (const cn of keys) {
    map[cn] = Array.isArray(existing[cn]) ? existing[cn] : [...legacy];
  }
  return map;
}

/** True for IIT / NEET / JEE style boards where Alpha–Delta tracks apply. */
export function isIitStyleBoard(board?: string | null): boolean {
  const compact = String(board || '')
    .toUpperCase()
    .replace(/[\s/\\-]+/g, '');
  if (!compact) return false;
  return compact.includes('IIT') || compact.includes('NEET') || compact.includes('JEE');
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
