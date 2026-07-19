import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api-config';
import { clearAuthData } from '@/lib/auth-utils';
import { INDIVIDUAL_TRIAL_DAYS } from '@/lib/individual-signup';
import { CreditCard, Clock, LogOut } from 'lucide-react';

/**
 * Shown when an individual trial has ended and payment is required.
 */
export default function SubscribePage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<{
    fullName?: string;
    email?: string;
    role?: string;
    trialEndsAt?: string;
    trialDaysLeft?: number;
    paymentRequired?: boolean;
    subscriptionStatus?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLocation('/auth/login');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
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
          // Still on trial or paid — send them to their dashboard
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-orange-50 p-4">
      <Card className="w-full max-w-lg border-slate-200 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <CreditCard className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Your free trial has ended</CardTitle>
          <p className="text-sm text-slate-600">
            Hi {user?.fullName || 'there'} — your {INDIVIDUAL_TRIAL_DAYS}-day ASLILEARN trial is over.
            Subscribe to keep using your individual {user?.role || 'account'}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <p className="text-sm text-slate-600">
            Complete payment to unlock AI tools, content, and your selected products / subjects
            again. For school plans, contact us for institutional pricing.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/contact" className="flex-1">
              <Button className="h-11 w-full bg-gradient-to-r from-orange-500 to-sky-500 text-white">
                Contact to subscribe
              </Button>
            </Link>
            <Link href="/#pricing" className="flex-1">
              <Button variant="outline" className="h-11 w-full">
                View pricing
              </Button>
            </Link>
          </div>

          <Button variant="ghost" className="w-full text-slate-600" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
