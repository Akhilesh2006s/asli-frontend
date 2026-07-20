import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Loader2, School, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { queueSuperAdminViewRestore } from "@/lib/super-admin-nav";

const SUPER_ADMIN_DASHBOARD_HREF = "/super-admin/dashboard";

const resolveLogoUrl = (logoUrl?: string): string => {
  if (!logoUrl) return "";
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL}${logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`}`;
};

const PORTAL_FEATURE_LABELS = [
  "User Management",
  "Content Management",
  "Analytics",
  "Subscriptions",
  "Settings",
] as const;

function isFullPortalAccess(perms: string[] | undefined): boolean {
  if (!perms?.length) return true;
  const set = new Set(perms);
  return PORTAL_FEATURE_LABELS.every((f) => set.has(f));
}

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
  permissions?: string[];
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
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { toast } = useToast();

  const backToSchoolManagement = () => {
    queueSuperAdminViewRestore("admins");
    setLocation(SUPER_ADMIN_DASHBOARD_HREF);
  };
  const [loading, setLoading] = useState(true);
  const [savingSeats, setSavingSeats] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    licensedStudents: 0,
    licensedTeachers: 0,
    accountSeatsNotes: "",
  });
  const [seatDraft, setSeatDraft] = useState({
    licensedStudents: "0",
    licensedTeachers: "0",
    accountSeatsNotes: "",
  });
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
        const nextStats = {
          students: json.data.stats?.students || 0,
          teachers: json.data.stats?.teachers || 0,
          licensedStudents: json.data.stats?.licensedStudents || 0,
          licensedTeachers: json.data.stats?.licensedTeachers || 0,
          accountSeatsNotes: json.data.stats?.accountSeatsNotes || "",
        };
        setStats(nextStats);
        setSeatDraft({
          licensedStudents: String(nextStats.licensedStudents),
          licensedTeachers: String(nextStats.licensedTeachers),
          accountSeatsNotes: nextStats.accountSeatsNotes,
        });
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

  const saveAccountSeats = async () => {
    if (!id) return;
    setSavingSeats(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins/${id}/account-seats`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licensedStudents: Math.max(0, Math.floor(Number(seatDraft.licensedStudents) || 0)),
          licensedTeachers: Math.max(0, Math.floor(Number(seatDraft.licensedTeachers) || 0)),
          accountSeatsNotes: seatDraft.accountSeatsNotes,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to save account seats");
      }
      setStats((prev) => ({
        ...prev,
        students: json.data.usedStudents ?? prev.students,
        teachers: json.data.usedTeachers ?? prev.teachers,
        licensedStudents: json.data.licensedStudents ?? 0,
        licensedTeachers: json.data.licensedTeachers ?? 0,
        accountSeatsNotes: json.data.accountSeatsNotes ?? "",
      }));
      setSeatDraft({
        licensedStudents: String(json.data.licensedStudents ?? 0),
        licensedTeachers: String(json.data.licensedTeachers ?? 0),
        accountSeatsNotes: String(json.data.accountSeatsNotes ?? ""),
      });
      toast({ title: "Saved", description: "Licensed teacher and student seats updated." });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not save seats",
        variant: "destructive",
      });
    } finally {
      setSavingSeats(false);
    }
  };

  if (!id) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          <p className="text-xs sm:text-sm">Loading school details…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-3 sm:p-4 lg:p-6">
        <Button variant="outline" className="mb-6 gap-2" onClick={backToSchoolManagement}>
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          Back to School Management
        </Button>
        <p className="text-slate-600">School could not be loaded.</p>
      </div>
    );
  }

  const sd = profile.schoolDetails || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6 lg:py-8">
        <Button variant="outline" className="mb-6 gap-2" onClick={backToSchoolManagement}>
          <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          Back to School Management
        </Button>

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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
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
          <Card className="sm:w-72 border-orange-100 bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account usage
              </p>
              <div className="mt-2 flex justify-between text-xs sm:text-sm">
                <span className="text-slate-600">Students used / licensed</span>
                <span className="font-semibold text-slate-900">
                  {stats.students} / {stats.licensedStudents}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-xs sm:text-sm">
                <span className="text-slate-600">Teachers used / licensed</span>
                <span className="font-semibold text-slate-900">
                  {stats.teachers} / {stats.licensedTeachers}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Licensed account seats</CardTitle>
            <p className="text-xs sm:text-sm text-slate-500">
              Enter subscribed teacher and student seat counts separately. Used counts update
              automatically from registered accounts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="licensed-students">Student seats (licensed)</Label>
                <Input
                  id="licensed-students"
                  type="number"
                  min={0}
                  value={seatDraft.licensedStudents}
                  onChange={(e) =>
                    setSeatDraft((prev) => ({ ...prev, licensedStudents: e.target.value }))
                  }
                />
                <p className="text-xs text-slate-500">Currently using {stats.students}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensed-teachers">Teacher seats (licensed)</Label>
                <Input
                  id="licensed-teachers"
                  type="number"
                  min={0}
                  value={seatDraft.licensedTeachers}
                  onChange={(e) =>
                    setSeatDraft((prev) => ({ ...prev, licensedTeachers: e.target.value }))
                  }
                />
                <p className="text-xs text-slate-500">Currently using {stats.teachers}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seat-notes">Notes (optional)</Label>
              <Input
                id="seat-notes"
                placeholder="e.g. Annual plan 2026 — 200 students, 15 teachers"
                value={seatDraft.accountSeatsNotes}
                onChange={(e) =>
                  setSeatDraft((prev) => ({ ...prev, accountSeatsNotes: e.target.value }))
                }
              />
            </div>
            <Button onClick={saveAccountSeats} disabled={savingSeats} className="gap-2">
              {savingSeats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save seat limits
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:p-4 lg:p-6 md:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Administrator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm">
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
              <CardTitle className="text-base sm:text-lg">Address & school</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs sm:text-sm">
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
            <CardTitle className="text-base sm:text-lg">Admin portal access</CardTitle>
            <p className="text-xs sm:text-sm text-slate-500">
              Modules enabled for this school&apos;s admin dashboard. Edit the school in School Management to change
              access.
            </p>
          </CardHeader>
          <CardContent className="text-xs sm:text-sm">
            {isFullPortalAccess(profile.permissions) ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                <span className="font-medium">Full portal access</span> — all modules are enabled.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                  <span className="font-medium">Limited access</span> — only the modules below are stored for this
                  school.
                </p>
                <ul className="list-inside list-disc text-slate-700">
                  {(profile.permissions || []).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Subscription & billing (Razorpay)</CardTitle>
            <p className="text-xs sm:text-sm text-slate-500">
              Payments match this school&apos;s admin email. Subscriptions match when the Razorpay customer uses the
              same email.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 lg:space-y-6">
            {!billing?.razorpayConfigured && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-900">
                Razorpay is not configured on the server. Set <code className="text-xs">RAZORPAY_KEY_ID</code> and{" "}
                <code className="text-xs">RAZORPAY_KEY_SECRET</code> to load live billing data.
              </p>
            )}
            {billing?.razorpayError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-800">{billing.razorpayError}</p>
            )}

            <div>
              <h3 className="mb-2 text-xs sm:text-sm font-semibold text-slate-800">Subscriptions</h3>
              {!billing?.subscriptions?.length ? (
                <p className="text-xs sm:text-sm text-slate-500">No matching subscriptions for this admin email.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-xs sm:text-sm">
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
              <h3 className="mb-2 text-xs sm:text-sm font-semibold text-slate-800">Payments</h3>
              {!billing?.payments?.length ? (
                <p className="text-xs sm:text-sm text-slate-500">No matching payments for this admin email.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-xs sm:text-sm">
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
