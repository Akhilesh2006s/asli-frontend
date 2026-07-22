import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-config';

export type BoardKind = 'curriculum' | 'state' | 'iit';

export type BoardOption = {
  code: string;
  name: string;
  description?: string;
  kind: BoardKind;
  isActive?: boolean;
};

function authHeaders(): HeadersInit {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('superAdminToken') ||
    localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Active boards from Super Admin API (curriculum / state / iit).
 */
export function useBoards(options?: { includeInactive?: boolean }) {
  const includeInactive = options?.includeInactive === true;
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = includeInactive ? '?all=1' : '';
      const res = await fetch(`${API_BASE_URL}/api/super-admin/boards${q}`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to load boards');
      }
      const rows = (Array.isArray(json.data) ? json.data : []).map((b: any) => ({
        code: String(b.code || '')
          .toUpperCase()
          .trim(),
        name: String(b.name || b.code || '').trim(),
        description: b.description || '',
        kind: ((b.kind || 'curriculum') as BoardKind),
        isActive: b.isActive !== false,
      }));
      setBoards(rows.filter((b: BoardOption) => b.code));
    } catch (e) {
      // Keep page usable if boards API is down (e.g. backend not redeployed yet).
      setError(e instanceof Error ? e.message : 'Failed to load boards');
      setBoards([
        { code: 'CBSE', name: 'CBSE', kind: 'curriculum', isActive: true },
        { code: 'STATE', name: 'State Board (generic)', kind: 'state', isActive: true },
        { code: 'SSC', name: 'SSC', kind: 'curriculum', isActive: true },
        { code: 'ICSE', name: 'ICSE', kind: 'curriculum', isActive: true },
        { code: 'IB', name: 'IB', kind: 'curriculum', isActive: true },
        { code: 'CAMBRIDGE', name: 'Cambridge', kind: 'curriculum', isActive: true },
        { code: 'IIT', name: 'IIT', kind: 'iit', isActive: true },
        {
          code: 'ASLI_EXCLUSIVE_SCHOOLS',
          name: 'Asli Exclusive Schools',
          kind: 'curriculum',
          isActive: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** School curriculum dropdown: curriculum + state (not hub / IIT). */
  const curriculumOptions = useMemo(
    () =>
      boards.filter(
        (b) =>
          b.isActive !== false &&
          b.code !== 'ASLI_EXCLUSIVE_SCHOOLS' &&
          b.code !== 'IIT' &&
          (b.kind === 'curriculum' || b.kind === 'state')
      ),
    [boards]
  );

  /** Subject / content / AI tools: all active boards including IIT. */
  const catalogOptions = useMemo(
    () => boards.filter((b) => b.isActive !== false),
    [boards]
  );

  return { boards, curriculumOptions, catalogOptions, loading, error, reload };
}

export function boardLabel(code: string, boards: BoardOption[]): string {
  const key = String(code || '')
    .toUpperCase()
    .trim();
  const hit = boards.find((b) => b.code === key);
  return hit?.name || key;
}
