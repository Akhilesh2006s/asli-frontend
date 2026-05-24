import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_BASE_URL } from '@/lib/api-config';
import type { TimetableEntry, TimetableFilters } from '@/types/timetable';

function buildQueryString(filters: TimetableFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function useTimetableEntries(filters: TimetableFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['timetable', filters],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const res = await apiFetch(`/api/timetable${buildQueryString(filters)}`);
      const data = await parseJson<{ data: TimetableEntry[] }>(res);
      return data.data || [];
    },
  });
}

export function useCreateTimetable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TimetableEntry> & { forceSave?: boolean }) => {
      const res = await apiFetch('/api/timetable', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return parseJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function useUpdateTimetable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TimetableEntry> & { id: string; forceSave?: boolean }) => {
      const res = await apiFetch(`/api/timetable/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return parseJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function usePatchTimetableStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TimetableEntry['status'] }) => {
      const res = await apiFetch(`/api/timetable/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return parseJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function useDeleteTimetable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/timetable/${id}`, { method: 'DELETE' });
      return parseJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function useBulkDeleteTimetable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (filters: TimetableFilters) => {
      const res = await apiFetch(`/api/timetable/bulk-delete${buildQueryString(filters)}`, { method: 'POST' });
      return parseJson<{ deleted: number }>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function useBulkDeleteTimetableGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiFetch(`/api/timetable/group/${groupId}`, { method: 'DELETE' });
      return parseJson<{ deleted: number }>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function useImportTimetableCSV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, mode }: { file: File; mode?: 'import' | 'replace' | 'merge' }) => {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', file);
      if (mode) formData.append('mode', mode);
      const res = await fetch(`${API_BASE_URL}/api/timetable/import/csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return parseJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export function useValidateTimetableCSV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/timetable/validate/csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      return parseJson<{ imported: number; skipped: number; errors: Array<{ row: number; reason: string; status?: string }> }>(res);
    },
  });
}

export function useCopyPreviousWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetWeekStart: string) => {
      const res = await apiFetch('/api/timetable/copy-week', {
        method: 'POST',
        body: JSON.stringify({ targetWeekStart }),
      });
      return parseJson(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  });
}

export async function downloadTimetableTemplate() {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE_URL}/api/timetable/template/csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timetable-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportTimetableCSV(filters: TimetableFilters = {}) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${API_BASE_URL}/api/timetable/export/csv${buildQueryString(filters)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timetable-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}
