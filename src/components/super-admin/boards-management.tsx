import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BoardKind = 'curriculum' | 'state' | 'iit';

export type BoardRow = {
  _id?: string;
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
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function kindLabel(kind: string) {
  if (kind === 'state') return 'State';
  if (kind === 'iit') return 'IIT';
  return 'Curriculum';
}

/**
 * Super Admin Boards — create curriculum / state / IIT boards with display names
 * (e.g. TELANGANA → "Telangana State Board").
 */
export default function BoardsManagement() {
  const { toast } = useToast();
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    kind: 'state' as BoardKind,
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/boards?all=1`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load boards');
      setBoards(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      toast({
        title: 'Could not load boards',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openAdd = () => {
    setForm({ code: '', name: '', description: '', kind: 'state' });
    setAddOpen(true);
  };

  const openEdit = (row: BoardRow) => {
    setEditingCode(row.code);
    setForm({
      code: row.code,
      name: row.name || '',
      description: row.description || '',
      kind: (row.kind as BoardKind) || 'curriculum',
    });
    setEditOpen(true);
  };

  const createBoard = async () => {
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '_');
    if (!name || !code) {
      toast({ title: 'Code and display name are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/boards`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code,
          name,
          description: form.description.trim(),
          kind: form.kind,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Create failed');
      toast({ title: 'Board created', description: `${name} (${code})` });
      setAddOpen(false);
      await reload();
    } catch (e) {
      toast({
        title: 'Could not create board',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingCode) return;
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Display name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/boards/${encodeURIComponent(editingCode)}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            name,
            description: form.description.trim(),
            kind: form.kind,
            isActive: true,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      toast({ title: 'Board updated' });
      setEditOpen(false);
      await reload();
    } catch (e) {
      toast({
        title: 'Could not update board',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: BoardRow) => {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/super-admin/boards/${encodeURIComponent(row.code)}`,
        {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ isActive: row.isActive === false }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      toast({
        title: row.isActive === false ? 'Board activated' : 'Board deactivated',
      });
      await reload();
    } catch (e) {
      toast({
        title: 'Could not update board',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const active = boards.filter((b) => b.isActive !== false);
  const inactive = boards.filter((b) => b.isActive === false);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Board Management</h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Create each board yourself (CBSE, ICSE, IB, Telangana State Board, …). Every board is
            separate — add subjects and content under that board only. Board type only helps school
            assign (curriculum vs state vs IIT); it does not merge content.
          </p>
        </div>
        <Button type="button" onClick={openAdd} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          Create board
        </Button>
      </div>

      <Card className="border-slate-200/80 bg-white/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-sky-600" />
            Boards
          </CardTitle>
          <CardDescription>
            Display names appear in school assign, Subject &amp; Content, and AI tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading boards…
            </div>
          ) : boards.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No boards yet.</p>
          ) : (
            <div className="space-y-6">
              <BoardTable
                rows={active}
                onEdit={openEdit}
                onToggle={toggleActive}
                busy={saving}
              />
              {inactive.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inactive
                  </p>
                  <BoardTable
                    rows={inactive}
                    onEdit={openEdit}
                    onToggle={toggleActive}
                    busy={saving}
                  />
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create board</DialogTitle>
            <DialogDescription>
              Each board is separate. Example: code <code className="text-xs">TELANGANA</code>, name{' '}
              <strong>Telangana State Board</strong>. Then add subjects and content under that board only.
            </DialogDescription>
          </DialogHeader>
          <BoardFormFields form={form} setForm={setForm} codeEditable />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createBoard()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit board</DialogTitle>
            <DialogDescription>
              Code <code className="text-xs">{editingCode}</code> cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <BoardFormFields form={form} setForm={setForm} codeEditable={false} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardFormFields({
  form,
  setForm,
  codeEditable,
}: {
  form: { code: string; name: string; description: string; kind: BoardKind };
  setForm: Dispatch<
    SetStateAction<{ code: string; name: string; description: string; kind: BoardKind }>
  >;
  codeEditable: boolean;
}) {
  return (
    <div className="space-y-3 py-2">
      {codeEditable ? (
        <div className="space-y-1.5">
          <Label htmlFor="board-code">Code</Label>
          <Input
            id="board-code"
            placeholder="TELANGANA"
            value={form.code}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                code: e.target.value.toUpperCase().replace(/\s+/g, '_'),
              }))
            }
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="board-name">Display name</Label>
        <Input
          id="board-name"
          placeholder="Telangana State Board"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Board type</Label>
        <Select
          value={form.kind}
          onValueChange={(v) => setForm((f) => ({ ...f, kind: v as BoardKind }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="curriculum">
              Curriculum board (one board you create, e.g. CBSE or ICSE — not combined)
            </SelectItem>
            <SelectItem value="state">State board (one board per state, e.g. Telangana)</SelectItem>
            <SelectItem value="iit">IIT board (IIT materials / EduOTT videos)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          Type only groups the board for school assign filters. Content is always per board code —
          create CBSE, ICSE, IB as separate boards if you want them separate.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="board-desc">Description (optional)</Label>
        <Textarea
          id="board-desc"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
    </div>
  );
}

function BoardTable({
  rows,
  onEdit,
  onToggle,
  busy,
}: {
  rows: BoardRow[];
  onEdit: (row: BoardRow) => void;
  onToggle: (row: BoardRow) => void;
  busy: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rows.map((row) => (
        <li
          key={row.code}
          className={cn(
            'flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
            row.isActive === false && 'bg-slate-50 opacity-80'
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">{row.name}</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {row.code}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {kindLabel(row.kind)}
              </Badge>
            </div>
            {row.description ? (
              <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{row.description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onEdit(row)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onToggle(row)}
            >
              {row.isActive === false ? 'Activate' : 'Deactivate'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
