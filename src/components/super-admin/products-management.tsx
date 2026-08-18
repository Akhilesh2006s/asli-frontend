import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAuthToken } from '@/lib/auth-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/api-config';
import { PRODUCT_IIT, formatIitCategoryLabel, normalizeCategoryCode } from '@/lib/products';
import { useProductCategories } from '@/hooks/use-product-categories';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { Layers, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function authHeaders(): HeadersInit {
  const token =
    getAuthToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

/**
 * Super Admin Products — manage IIT tracks (Alpha/Beta/Gamma + your own custom categories).
 */
export default function ProductsManagement() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { categories, loading, reload } = useProductCategories({ includeInactive: true });
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', code: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const active = categories.filter((c) => c.isActive !== false);
  const inactive = categories.filter((c) => c.isActive === false);

  const openAdd = () => {
    setForm({ label: '', code: '', description: '' });
    setAddOpen(true);
  };

  const openEdit = (row: (typeof categories)[0]) => {
    setEditingId(row.id || null);
    setForm({
      label: row.label || '',
      code: row.code,
      description: row.description || '',
    });
    setEditOpen(true);
  };

  const createCategory = async () => {
    const label = form.label.trim();
    if (!label) {
      toast({ title: 'Label required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/product-categories`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          label,
          code: form.code.trim() || normalizeCategoryCode(label),
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Create failed');
      toast({ title: 'Category added', description: json.message });
      setAddOpen(false);
      await reload();
    } catch (e) {
      toast({
        title: 'Could not add category',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/product-categories/${editingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          label: form.label.trim(),
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      toast({ title: 'Category updated' });
      setEditOpen(false);
      await reload();
    } catch (e) {
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (row: (typeof categories)[0]) => {
    if (!row.id) return;
    const isActiveBuiltIn = row.isBuiltIn && row.isActive !== false;
    if (isActiveBuiltIn) {
      toast({
        title: 'Cannot delete',
        description: 'Built-in categories (Alpha / Beta / Gamma / Delta) cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }
    const name = row.label || formatIitCategoryLabel(row.code);
    const ok = await confirm({
      title: 'Delete this category?',
      description: `Delete “${name}” permanently? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/product-categories/${row.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed');
      toast({ title: json.message || `${name} deleted` });
      await reload();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Products</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Product tracks under {PRODUCT_IIT}. Use <span className="font-medium">Add your own category</span> below
          (e.g. Delta, Foundation+) — then assign them to schools and tag subjects / books.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-orange-50 p-2 text-orange-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{PRODUCT_IIT}</CardTitle>
              <CardDescription className="mt-1">
                Alpha, Beta, Gamma ship built-in. Add more tracks anytime — Maths can exist once per
                category without colliding.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {active.map((cat) => (
                <div
                  key={cat.code}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">
                        {cat.label || formatIitCategoryLabel(cat.code)}
                      </p>
                      <p className="mt-0.5 font-mono text-micro uppercase tracking-wide text-slate-500">
                        {cat.code}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-micro uppercase tracking-wide',
                        cat.isBuiltIn && 'bg-orange-100 text-orange-900',
                      )}
                    >
                      {cat.isBuiltIn ? 'Built-in' : 'Custom'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {cat.description ||
                      `Tag subjects, content, and books with ${cat.label || cat.code} so only schools assigned this track can see them.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-700 hover:text-red-800"
                      disabled={saving || (cat.isBuiltIn && cat.isActive !== false)}
                      title={
                        cat.isBuiltIn && cat.isActive !== false
                          ? 'Built-in categories cannot be deleted'
                          : `Delete ${cat.label || cat.code}`
                      }
                      onClick={() => void deleteCategory(cat)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={openAdd}
                className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50/40 p-4 text-center transition hover:border-orange-400 hover:bg-orange-50"
              >
                <Plus className="h-6 w-6 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">Add your own category</p>
                <p className="text-xs text-orange-800/80">e.g. Delta, Sigma, Foundation+</p>
              </button>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Previously deactivated — delete permanently
              </p>
              <div className="flex flex-wrap gap-2">
                {inactive.map((cat) => (
                  <div
                    key={cat.code}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-slate-600">
                      {cat.label} <span className="font-mono text-micro">({cat.code})</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-red-700"
                      disabled={saving}
                      onClick={() => void deleteCategory(cat)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add product category</DialogTitle>
            <DialogDescription>
              Create a new track under {PRODUCT_IIT}. Code is stored on subjects and books (letters,
              numbers, underscore).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Display name *</Label>
              <Input
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setForm((p) => ({
                    ...p,
                    label,
                  }));
                }}
                placeholder="e.g. Delta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: normalizeCategoryCode(e.target.value) }))
                }
                placeholder="DELTA"
                className="font-mono uppercase"
              />
              <p className="text-mini text-slate-500">Cannot change after create.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Optional note for your team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void createCategory()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Code <span className="font-mono">{form.code}</span> stays the same (already used on
              content).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void saveEdit()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
