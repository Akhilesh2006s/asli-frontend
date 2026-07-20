import { useCallback, useEffect, useState } from 'react';
import CreateOrderModal from '@/components/CreateOrder/CreateOrderModal';
import { OrderCatalogProvider } from '@/components/CreateOrder/OrderCatalogContext';
import OrderListPanel from '@/components/CreateOrder/OrderListPanel';
import type { SavedOrder } from '@/lib/create-order-api';
import { orderBtnPrimary, orderPageHero, orderTabActive, orderSpinner } from '@/components/CreateOrder/create-order-theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  IndianRupee,
  Repeat,
  AlertTriangle,
  ShoppingBag,
  Receipt,
  Users,
  UserRound,
} from 'lucide-react';
import AccountSeatsPanel from '@/components/super-admin/account-seats-panel';
import IndividualSubscriptionsPanel from '@/components/super-admin/individual-subscriptions-panel';

type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  email: string;
  contact: string;
  createdAt: string | null;
  description?: string;
  orderId?: string | null;
};

type SubscriptionRow = {
  id: string;
  status: string;
  planId: string;
  customerId: string;
  currentStart: string | null;
  currentEnd: string | null;
  paidCount?: number;
  remainingCount?: number;
};

type BillingPayload = {
  razorpayConfigured: boolean;
  razorpayError: string | null;
  summary: {
    paymentsListed: number;
    subscriptionsListed: number;
    capturedAmountInr: number;
    activeSubscriptions: number;
  };
  payments: PaymentRow[];
  subscriptions: SubscriptionRow[];
};

const emptyBillingPayload = (): BillingPayload => ({
  razorpayConfigured: false,
  razorpayError: null,
  summary: {
    paymentsListed: 0,
    subscriptionsListed: 0,
    capturedAmountInr: 0,
    activeSubscriptions: 0,
  },
  payments: [],
  subscriptions: [],
});

function normalizeBillingPayload(raw: unknown): BillingPayload {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyBillingPayload();
  }
  const r = raw as Partial<BillingPayload> & { summary?: Partial<BillingPayload['summary']> };
  const s = r.summary;
  return {
    razorpayConfigured: Boolean(r.razorpayConfigured),
    razorpayError: r.razorpayError ?? null,
    summary: {
      paymentsListed: Number(s?.paymentsListed ?? 0),
      subscriptionsListed: Number(s?.subscriptionsListed ?? 0),
      capturedAmountInr: Number(s?.capturedAmountInr ?? 0),
      activeSubscriptions: Number(s?.activeSubscriptions ?? 0),
    },
    payments: Array.isArray(r.payments) ? r.payments : [],
    subscriptions: Array.isArray(r.subscriptions) ? r.subscriptions : [],
  };
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN');
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'captured' || s === 'active' || s === 'authenticated')
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">{status}</Badge>;
  if (s === 'failed' || s === 'cancelled' || s === 'halted')
    return <Badge variant="destructive">{status}</Badge>;
  if (s === 'authorized' || s === 'created' || s === 'pending')
    return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function BillingLoader() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className={cn('h-8 w-8 animate-spin', orderSpinner)} />
    </div>
  );
}

export default function SubscriptionManagement() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingPayload | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SavedOrder | null>(null);
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);
  const [mainTab, setMainTab] = useState('school-orders');

  const openCreateOrder = useCallback(() => {
    setEditOrder(null);
    setCreateOrderOpen(true);
  }, []);

  const openEditOrder = useCallback((order: SavedOrder) => {
    if (!order.id) {
      toast({
        title: 'Cannot edit order',
        description: 'This order is missing an id. Refresh the list and try again.',
        variant: 'destructive',
      });
      return;
    }
    setEditOrder(order);
    setCreateOrderOpen(true);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/super-admin/subscriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
      if (json.success) setData(normalizeBillingPayload(json.data));
      else throw new Error(json.message || 'Invalid response');
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load billing data',
        variant: 'destructive',
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <OrderCatalogProvider>
    <div className="space-y-6">
      {/* Page header */}
      <div className={cn('relative overflow-hidden p-5 sm:p-6', orderPageHero)}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Receipt className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Finance
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Payments &amp; Subscriptions
            </h2>
            <p className="text-slate-600 mt-1 max-w-xl text-sm">
              School orders &amp; seats, individual (B2C) converted subscriptions, and Razorpay
              billing — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
            {mainTab === 'school-orders' && (
              <Button size="sm" className={cn('flex-1 sm:flex-none', orderBtnPrimary)} onClick={openCreateOrder}>
                <Plus className="h-4 w-4" />
                <span className="ml-2">Create Order</span>
              </Button>
            )}
            {(mainTab === 'payments' || mainTab === 'subscriptions') && (
              <>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://dashboard.razorpay.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Razorpay
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="inline-flex h-auto w-full max-w-none flex-wrap justify-start gap-1 rounded-xl bg-slate-100/80 p-1 sm:w-auto">
          <TabsTrigger value="school-orders" className={cn('gap-2 rounded-lg', orderTabActive)}>
            <ShoppingBag className="h-4 w-4" />
            School Orders
          </TabsTrigger>
          <TabsTrigger
            value="account-seats"
            className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4" />
            Account seats
          </TabsTrigger>
          <TabsTrigger
            value="individual"
            className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <UserRound className="h-4 w-4" />
            Individual
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger
            value="subscriptions"
            className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Repeat className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="school-orders" className="mt-5 focus-visible:outline-none">
          <OrderListPanel
            refreshKey={orderRefreshKey}
            onCreateOrder={openCreateOrder}
            onEditOrder={openEditOrder}
          />
        </TabsContent>

        <TabsContent value="account-seats" className="mt-5 focus-visible:outline-none">
          <AccountSeatsPanel />
        </TabsContent>

        <TabsContent value="individual" className="mt-5 focus-visible:outline-none">
          <IndividualSubscriptionsPanel />
        </TabsContent>

        <TabsContent value="payments" className="mt-5 space-y-4 focus-visible:outline-none">
          {loading && !data ? (
            <BillingLoader />
          ) : data ? (
            <>
              {!data.razorpayConfigured && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Razorpay not connected</AlertTitle>
                  <AlertDescription className="text-sm">
                    Add <code className="rounded bg-muted px-1">RAZORPAY_KEY_ID</code> and{' '}
                    <code className="rounded bg-muted px-1">RAZORPAY_KEY_SECRET</code> to your server
                    .env, then restart the API.
                  </AlertDescription>
                </Alert>
              )}
              {data.razorpayError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Razorpay error</AlertTitle>
                  <AlertDescription>{data.razorpayError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Captured revenue',
                    value: formatInr(data.summary.capturedAmountInr),
                    icon: IndianRupee,
                    color: 'text-emerald-600',
                  },
                  {
                    label: 'Payments',
                    value: data.summary.paymentsListed,
                    icon: CreditCard,
                    color: 'text-sky-600',
                  },
                  {
                    label: 'Subscriptions',
                    value: data.summary.subscriptionsListed,
                    icon: Repeat,
                    color: 'text-orange-600',
                  },
                  {
                    label: 'Active subs',
                    value: data.summary.activeSubscriptions,
                    icon: Repeat,
                    color: 'text-slate-700',
                  },
                ].map((stat) => (
                  <Card key={stat.label} className="rounded-xl border-slate-200/80 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardDescription>{stat.label}</CardDescription>
                      <CardTitle className={cn('flex items-center gap-2 text-xl', stat.color)}>
                        <stat.icon className="h-5 w-5" />
                        {stat.value}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              <Card className="rounded-xl border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle>Recent payments</CardTitle>
                  <CardDescription>From Razorpay — latest 50 transactions</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {data.payments.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No payments returned from Razorpay.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead>Date</TableHead>
                          <TableHead>Payment ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Customer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {formatDate(p.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[140px] truncate">
                              {p.id}
                            </TableCell>
                            <TableCell>{formatInr(p.amount)}</TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                            <TableCell className="capitalize">{p.method}</TableCell>
                            <TableCell className="text-xs">
                              <div>{p.email}</div>
                              <div className="text-muted-foreground">{p.contact}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Could not load Razorpay data.
            </p>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-5 focus-visible:outline-none">
          {loading && !data ? (
            <BillingLoader />
          ) : data ? (
            <Card className="rounded-xl border-slate-200/80 shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle>Subscriptions</CardTitle>
                <CardDescription>Recurring plans from Razorpay</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {data.subscriptions.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No subscriptions yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Paid / left</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.subscriptions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs max-w-[140px] truncate">
                            {s.id}
                          </TableCell>
                          <TableCell>{statusBadge(s.status)}</TableCell>
                          <TableCell className="font-mono text-xs">{s.planId}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[100px] truncate">
                            {s.customerId}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(s.currentStart)} → {formatDate(s.currentEnd)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {s.paidCount ?? '—'} / {s.remainingCount ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Could not load subscription data.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <CreateOrderModal
        open={createOrderOpen}
        onOpenChange={(open) => {
          setCreateOrderOpen(open);
          if (!open) setEditOrder(null);
        }}
        editOrder={editOrder}
        onOrderSaved={() => {
          setOrderRefreshKey((k) => k + 1);
          setMainTab('school-orders');
        }}
      />
    </div>
    </OrderCatalogProvider>
  );
}
