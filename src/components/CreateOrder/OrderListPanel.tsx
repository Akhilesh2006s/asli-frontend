import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { deleteOrder, fetchOrders, type SavedOrder } from '@/lib/create-order-api';
import { formatInr } from '@/components/CreateOrder/types';
import {
  orderBtnPrimary,
  orderCard,
  orderFilterActive,
  orderFilterInactive,
  orderAccentText,
  orderSpinner,
} from '@/components/CreateOrder/create-order-theme';
import OrderDetailDialog from '@/components/CreateOrder/OrderDetailDialog';

type OrderListPanelProps = {
  refreshKey?: number;
  onEditOrder?: (order: SavedOrder) => void;
  onCreateOrder?: () => void;
};

type StatusFilter = 'all' | 'confirmed' | 'draft';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: SavedOrder['status'] }) {
  if (status === 'confirmed') {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium">
        Confirmed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
      Draft
    </Badge>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={cn(orderCard, 'p-4')}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', accent || 'text-slate-900')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function OrderListPanel({
  refreshKey = 0,
  onEditOrder,
  onCreateOrder,
}: OrderListPanelProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load orders',
        variant: 'destructive',
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const stats = useMemo(() => {
    const confirmed = orders.filter((o) => o.status === 'confirmed');
    const drafts = orders.filter((o) => o.status === 'draft');
    const revenue = confirmed.reduce((s, o) => s + (o.computed.grandTotal || 0), 0);
    return { total: orders.length, confirmed: confirmed.length, drafts: drafts.length, revenue };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.schoolName.toLowerCase().includes(q) ||
        o.brand.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) {
      toast({
        title: 'Cannot delete order',
        description: 'This order is missing an id. Refresh the list and try again.',
        variant: 'destructive',
      });
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteOrder(deleteTarget.id);
      if (result.success) {
        toast({ title: 'Deleted', description: result.message });
        setDeleteTarget(null);
        if (selectedOrder?.id === deleteTarget.id) {
          setDetailOpen(false);
          setSelectedOrder(null);
        }
        await load();
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete order',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { id: 'draft', label: 'Drafts', count: stats.drafts },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={stats.total} />
        <StatCard
          label="Confirmed"
          value={stats.confirmed}
          accent="text-emerald-600"
          sub="Live orders"
        />
        <StatCard label="Drafts" value={stats.drafts} accent="text-amber-600" sub="Pending review" />
        <StatCard
          label="Confirmed revenue"
          value={formatInr(stats.revenue)}
          accent={orderAccentText}
          sub="Grand total sum"
        />
      </div>

      <Card className={cn(orderCard, 'border-slate-200/80 shadow-sm overflow-hidden')}>
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === f.id ? orderFilterActive : orderFilterInactive,
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                    statusFilter === f.id ? 'bg-white/20' : 'bg-slate-100',
                  )}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search orders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 bg-white"
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className={cn('h-8 w-8 animate-spin', orderSpinner)} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 mb-4">
                <ShoppingBag className={cn('h-7 w-7', orderAccentText, 'opacity-60')} />
              </div>
              <p className="font-medium text-slate-700">
                {orders.length === 0 ? 'No orders yet' : 'No matching orders'}
              </p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                {orders.length === 0
                  ? 'Create your first school order to track products, pricing, and payment terms.'
                  : 'Try a different search or filter.'}
              </p>
              {orders.length === 0 && onCreateOrder && (
                <Button className={cn('mt-5', orderBtnPrimary)} onClick={onCreateOrder}>
                  Create Order
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {filtered.map((order) => (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-orange-50/30"
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedOrder(order);
                        setDetailOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDate(order.createdAt)} · {order.products.length} item
                          {order.products.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">{order.schoolName}</p>
                    <p className="text-xs text-slate-400">{order.brand}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Total
                        </p>
                        <p className="font-semibold tabular-nums text-slate-900">
                          {formatInr(order.computed.grandTotal)}
                        </p>
                        {order.computed.balance > 0 && (
                          <p className="text-xs text-amber-600 tabular-nums">
                            Bal {formatInr(order.computed.balance)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => onEditOrder?.(order)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(order)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="font-semibold text-slate-600">Order</TableHead>
                    <TableHead className="font-semibold text-slate-600">School</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-right">Total</TableHead>
                    <TableHead className="font-semibold text-slate-600 text-right w-[72px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow
                      key={order.id}
                      className="group cursor-pointer hover:bg-orange-50/30"
                      onClick={() => {
                        setSelectedOrder(order);
                        setDetailOpen(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-900">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(order.createdAt)} · {order.products.length} item
                            {order.products.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-slate-800 max-w-[200px] truncate">
                          {order.schoolName}
                        </p>
                        <p className="text-xs text-slate-400">{order.brand}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-semibold tabular-nums text-slate-900">
                          {formatInr(order.computed.grandTotal)}
                        </p>
                        {order.computed.balance > 0 && (
                          <p className="text-xs text-amber-600 tabular-nums">
                            Bal {formatInr(order.computed.balance)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-70 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrder(order);
                                setDetailOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditOrder?.(order)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(order)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={onEditOrder}
        onDelete={(order) => setDeleteTarget(order)}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.orderNumber}</strong> for{' '}
              <strong>{deleteTarget?.schoolName}</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
