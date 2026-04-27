import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Loader2, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";

const SCHOOL_MANAGEMENT_HREF = "/super-admin/dashboard?view=admins";

const resolveLogoUrl = (logoUrl?: string): string => {
  if (!logoUrl) return "";
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
};

type SchoolDetails = {
  doorNo?: string;
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  medium?: string;
  classesFrom?: string;
  classesTo?: string;
  totalStrength?: string;
  schoolType?: string;
};

type Profile = {
  id: string;
  name: string;
  email: string;
  board?: string;
  schoolName?: string;
  schoolLogo?: string;
  contactPerson?: string;
  phone?: string;
  place?: string;
  pin?: string;
  state?: string;
  schoolDetails?: SchoolDetails;
  status?: string;
  joinDate?: string;
};

type BillingPayment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  email: string;
  createdAt: string | null;
};

type BillingSubscription = {
  id: string;
  status: string;
  planId: string;
  customerId: string;
  currentStart: string | null;
  currentEnd: string | null;
  paidCount?: number;
  totalCount?: number;
};

export default function SuperAdminSchoolDetail() {
  const [, params] = useRoute("/super-admin/schools/:id");
  const id = params?.id;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0 });
  const [billing, setBilling] = useState<{
    razorpayConfigured: boolean;
    razorpayError: string | null;
    payments: BillingPayment[];
    subscriptions: BillingSubscription[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${API_BASE_URL}/api/super-admin/admins/${id}/school-detail`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || "Failed to load school");
        }
        setProfile(json.data.profile);
        setStats(json.data.stats || { students: 0, teachers: 0 });
        setBilling(json.data.billing);
      } catch (e) {
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Could not load school details",
          variant: "destructive",
        });
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, toast]);

  if (!id) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-sm">Loading school details…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Link href={SCHOOL_MANAGEMENT_HREF}>
          <Button variant="outline" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to School Management
          </Button>
        </Link>
        <p className="text-slate-600">School could not be loaded.</p>
      </div>
    );
  }

  const sd = profile.schoolDetails || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href={SCHOOL_MANAGEMENT_HREF}>
          <Button variant="outline" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to School Management
          </Button>
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-white shadow-sm">
              {profile.schoolLogo ? (
                <img
                  src={resolveLogoUrl(profile.schoolLogo)}
                  alt=""
                  className="h-11 w-11 object-contain"
                />
              ) : (
                <School className="h-7 w-7 text-orange-500" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {profile.schoolName || profile.name || "School"}
              </h1>
              <p className="text-slate-600">{profile.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.board && <Badge variant="outline">{profile.board}</Badge>}
                {profile.state && <Badge variant="outline">{profile.state}</Badge>}
                <Badge variant={profile.status === "Active" ? "default" : "secondary"}>
                  {profile.status || "—"}
                </Badge>
              </div>
            </div>
          </div>
          <Card className="sm:w-64 border-orange-100 bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">On platform</p>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-slate-600">Students</span>
                <span className="font-semibold text-slate-900">{stats.students}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-slate-600">Teachers</span>
                <span className="font-semibold text-slate-900">{stats.teachers}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Administrator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Name" value={profile.name} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Contact person" value={profile.contactPerson} />
              <DetailRow label="Phone" value={profile.phone} />
              <DetailRow
                label="Joined"
                value={profile.joinDate ? new Date(profile.joinDate).toLocaleString() : "—"}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Address & school</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Door no." value={sd.doorNo} />
              <DetailRow label="Street" value={sd.street} />
              <DetailRow label="Area" value={sd.area} />
              <DetailRow label="City" value={sd.city} />
              <DetailRow label="District" value={sd.district} />
              <DetailRow label="State" value={sd.state || profile.state} />
              <DetailRow label="PIN" value={profile.pin} />
              <DetailRow label="Medium" value={sd.medium} />
              <DetailRow
                label="Classes"
                value={
                  sd.classesFrom || sd.classesTo
                    ? `${sd.classesFrom || "—"} – ${sd.classesTo || "—"}`
                    : undefined
                }
              />
              <DetailRow label="Total strength" value={sd.totalStrength} />
              <DetailRow label="School type" value={sd.schoolType} />
              <DetailRow label="Place (summary)" value={profile.place} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subscription & billing (Razorpay)</CardTitle>
            <p className="text-sm text-slate-500">
              Payments match this school&apos;s admin email. Subscriptions match when the Razorpay customer uses the
              same email.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!billing?.razorpayConfigured && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Razorpay is not configured on the server. Set <code className="text-xs">RAZORPAY_KEY_ID</code> and{" "}
                <code className="text-xs">RAZORPAY_KEY_SECRET</code> to load live billing data.
              </p>
            )}
            {billing?.razorpayError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{billing.razorpayError}</p>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Subscriptions</h3>
              {!billing?.subscriptions?.length ? (
                <p className="text-sm text-slate-500">No matching subscriptions for this admin email.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Current period</th>
                        <th className="px-3 py-2">Paid / Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.subscriptions.map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{s.id}</td>
                          <td className="px-3 py-2">{s.status}</td>
                          <td className="px-3 py-2">{s.planId}</td>
                          <td className="px-3 py-2 text-xs">
                            {s.currentStart && new Date(s.currentStart).toLocaleDateString()} –{" "}
                            {s.currentEnd && new Date(s.currentEnd).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2">
                            {s.paidCount ?? "—"} / {s.totalCount ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Payments</h3>
              {!billing?.payments?.length ? (
                <p className="text-sm text-slate-500">No matching payments for this admin email.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billing.payments.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2 text-xs">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {p.amount} {p.currency}
                          </td>
                          <td className="px-3 py-2">{p.status}</td>
                          <td className="px-3 py-2">{p.method}</td>
                          <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || String(value).trim() === "") return null;
  return (
    <div className="flex gap-2">
      <span className="min-w-[8rem] text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
