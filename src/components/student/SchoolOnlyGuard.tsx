import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getUser as getStoredUser } from '@/lib/auth-utils';
import { isIndividualAccount } from '@/lib/individual-signup';

/**
 * Wraps school-only student pages (Timetable, Offline Results, Teacher Reports,
 * Homework). B2C / individual students have no school, so they are redirected
 * to the dashboard instead of seeing an empty screen.
 */
export function SchoolOnlyGuard({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const individual = isIndividualAccount(getStoredUser());

  useEffect(() => {
    if (individual) setLocation('/dashboard');
  }, [individual, setLocation]);

  if (individual) return null;
  return <>{children}</>;
}

export default SchoolOnlyGuard;
