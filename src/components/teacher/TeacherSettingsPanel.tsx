import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  School,
  Shield,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken, getUser as getStoredUser, setUser as persistUser } from '@/lib/auth-utils';
import { resolveSchoolLogoUrl } from '@/lib/school-branding';
import { cn } from '@/lib/utils';

type TeacherProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  qualifications: string;
  schoolName: string;
  schoolLogo: string | null;
  subjects: Array<{ _id?: string; name?: string; displayName?: string }>;
  isActive?: boolean;
};

const emptyForm = {
  fullName: '',
  phone: '',
  department: '',
  qualifications: '',
};

export function TeacherSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load profile');
      }
      const data = json?.data || {};
      const next: TeacherProfile = {
        id: String(data.id || ''),
        fullName: String(data.fullName || ''),
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        department: String(data.department || ''),
        qualifications: String(data.qualifications || ''),
        schoolName: String(data.schoolName || ''),
        schoolLogo: resolveSchoolLogoUrl(data.schoolLogo),
        subjects: Array.isArray(data.subjects) ? data.subjects : [],
        isActive: data.isActive !== false,
      };
      setProfile(next);
      setForm({
        fullName: next.fullName,
        phone: next.phone,
        department: next.department,
        qualifications: next.qualifications,
      });
    } catch (error: any) {
      toast({
        title: 'Could not load settings',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          department: form.department.trim(),
          qualifications: form.qualifications.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to update profile');
      }

      const updated = json?.data || {};
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: updated.fullName ?? form.fullName,
              phone: updated.phone ?? form.phone,
              department: updated.department ?? form.department,
              qualifications: updated.qualifications ?? form.qualifications,
            }
          : prev
      );

      const stored = getStoredUser() || {};
      persistUser({
        ...stored,
        fullName: updated.fullName ?? form.fullName,
        phone: updated.phone ?? form.phone,
        department: updated.department ?? form.department,
        qualifications: updated.qualifications ?? form.qualifications,
      });

      toast({
        title: 'Profile updated',
        description: 'Your teacher details were saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must be the same.',
        variant: 'destructive',
      });
      return;
    }
    const token = getAuthToken();
    if (!token) return;
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teacher/change-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to change password');
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: 'Password updated',
        description: 'Use your new password the next time you sign in.',
      });
    } catch (error: any) {
      toast({
        title: 'Password change failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-2xl border border-indigo-100 bg-white/90">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-blue-600" aria-hidden="true" />
        <span className="sr-only">Loading settings</span>
      </div>
    );
  }

  const initials =
    (profile?.fullName || 'T')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || 'T';

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-blue-100/80 bg-gradient-to-br from-sky-100 via-indigo-blue-50 to-violet-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/50 blur-3xl" aria-hidden="true" />
        <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-blue-600 text-xl font-bold text-white shadow-md">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold text-slate-900 sm:text-2xl">
                {profile?.fullName || 'Teacher'}
              </p>
              <p className="truncate text-sm text-slate-600">{profile?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {profile?.isActive !== false ? (
                  <Badge className="border-0 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
                    Active
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-rose-100 text-rose-800">Inactive</Badge>
                )}
                {profile?.department ? (
                  <Badge className="border-0 bg-white/80 text-indigo-700 ring-1 ring-indigo-100">
                    {profile.department}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          {profile?.schoolName ? (
            <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm">
              {profile.schoolLogo ? (
                <img
                  src={profile.schoolLogo}
                  alt=""
                  className="h-9 w-9 rounded-xl object-contain"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <School className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                  School
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">{profile.schoolName}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Teacher details */}
        <form
          onSubmit={handleSaveDetails}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">Teacher details</h3>
              <p className="text-sm text-slate-500">Update your name, phone, and department.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="teacher-fullName">Full name</Label>
              <Input
                id="teacher-fullName"
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200"
                required
              />
            </div>
            <div>
              <Label htmlFor="teacher-email">Email</Label>
              <Input
                id="teacher-email"
                value={profile?.email || ''}
                readOnly
                disabled
                className="mt-1.5 rounded-xl border-slate-200 bg-slate-50 text-slate-600"
              />
              <p className="mt-1 text-xs text-slate-500">Email is managed by your school admin.</p>
            </div>
            <div>
              <Label htmlFor="teacher-phone">Phone</Label>
              <Input
                id="teacher-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    phone: e.target.value.replace(/\D/g, '').slice(0, 15),
                  }))
                }
                placeholder="Enter phone number"
                className="mt-1.5 rounded-xl border-slate-200"
              />
            </div>
            <div>
              <Label htmlFor="teacher-department">Department</Label>
              <Input
                id="teacher-department"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                placeholder="e.g. Science, Mathematics"
                className="mt-1.5 rounded-xl border-slate-200"
              />
            </div>
            <div>
              <Label htmlFor="teacher-qualifications">Qualifications</Label>
              <Textarea
                id="teacher-qualifications"
                value={form.qualifications}
                onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                placeholder="Degrees, certifications…"
                rows={3}
                className="mt-1.5 rounded-xl border-slate-200"
              />
            </div>

            {profile?.subjects && profile.subjects.length > 0 ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Assigned subjects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.subjects.map((s, i) => (
                    <Badge
                      key={String(s._id || i)}
                      className="border-0 bg-white text-indigo-800 ring-1 ring-indigo-100"
                    >
                      {s.displayName || s.name || 'Subject'}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-indigo-blue-600 text-white hover:bg-indigo-blue-700 sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save details
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Reset password */}
        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900">Reset password</h3>
              <p className="text-sm text-slate-500">
                Enter your current password, then choose a new one.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <PasswordField
              id="teacher-current-password"
              label="Current password"
              value={passwordForm.currentPassword}
              show={showCurrent}
              onToggle={() => setShowCurrent((v) => !v)}
              onChange={(v) => setPasswordForm((p) => ({ ...p, currentPassword: v }))}
              autoComplete="current-password"
            />
            <PasswordField
              id="teacher-new-password"
              label="New password"
              value={passwordForm.newPassword}
              show={showNew}
              onToggle={() => setShowNew((v) => !v)}
              onChange={(v) => setPasswordForm((p) => ({ ...p, newPassword: v }))}
              autoComplete="new-password"
              hint="At least 8 characters"
            />
            <PasswordField
              id="teacher-confirm-password"
              label="Confirm new password"
              value={passwordForm.confirmPassword}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              onChange={(v) => setPasswordForm((p) => ({ ...p, confirmPassword: v }))}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              disabled={
                changingPassword ||
                !passwordForm.currentPassword ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword
              }
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 sm:w-auto"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Update password
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onToggle,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={cn('rounded-xl border-slate-200 pr-10')}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default TeacherSettingsPanel;
