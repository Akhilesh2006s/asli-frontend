import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api-config';
import { clearAuthData, getAuthToken } from '@/lib/auth-utils';
import { INDIVIDUAL_TRIAL_DAYS } from '@/lib/individual-signup';
import { IndividualPlanCheckout } from '@/components/b2c/IndividualPlanCheckout';
import { CreditCard, Clock, LogOut } from 'lucide-react';

/**
 * Shown when an individual trial has ended and payment is required.
 * Boards ₹99/month, IIT ₹249/month (students) or ₹3999/year (teachers), or both.
 */
export default function SubscribePage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<{
    _id?: string;
    id?: string;
    fullName?: string;
    email?: string;
    role?: string;
    classNumber?: string;
    iitCategories?: string[];
    trialEndsAt?: string;
    trialDaysLeft?: number;
    paymentRequired?: boolean;
    subscriptionStatus?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLocation('/auth/login');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) {
          clearAuthData();
          setLocation('/auth/login');
          return;
        }
        const data = await res.json();
        const u = data.user || data;
        setUser(u);
        if (u?.isIndividualAccount && !u?.paymentRequired) {
          if (u.role === 'teacher') setLocation('/teacher/dashboard');
          else setLocation('/dashboard');
        }
      } catch {
        setLocation('/auth/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [setLocation]);

  const handleLogout = () => {
    clearAuthData();
    setLocation('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Checking subscription…
      </div>
    );
  }

  const initialTrack = Array.isArray(user?.iitCategories) ? String(user.iitCategories[0] || '') : '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-orange-50 p-4 2xl:p-8 board:p-12">
      <Card className="w-full max-w-2xl border-slate-200 shadow-lg 2xl:max-w-3xl board:shadow-2xl">
        <CardHeader className="space-y-2 text-center board:space-y-3 board:px-10 board:pt-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700 board:h-14 board:w-14">
            <CreditCard className="h-6 w-6 board:h-7 board:w-7" />
          </div>
          <CardTitle className="text-xl board:text-3xl">Choose Boards, IIT, or both</CardTitle>
          <p className="text-sm text-slate-600 board:text-base">
            Hi {user?.fullName || 'there'} — your {INDIVIDUAL_TRIAL_DAYS}-day trial has ended. Pick Boards, IIT
            Foundation (Alpha/Beta), or both. Monthly and yearly prices (including any yearly discount) are shown
            on the plan below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 board:space-y-5 board:px-10 board:pb-10">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Trial status: expired</p>
              {user?.trialEndsAt && (
                <p className="mt-1 text-xs">
                  Ended on {new Date(user.trialEndsAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <IndividualPlanCheckout
            userId={user?._id || user?.id || null}
            role={user?.role}
            userName={user?.fullName}
            userEmail={user?.email}
            initialClass={user?.classNumber || ''}
            initialTrack={initialTrack}
            initialPackage={initialTrack ? 'iit' : 'board'}
          />

          <Link href="/resources">
            <Button variant="ghost" className="w-full text-slate-600">
              See which IIT books and tools you get
            </Button>
          </Link>

          <Button variant="ghost" className="w-full text-slate-600" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
