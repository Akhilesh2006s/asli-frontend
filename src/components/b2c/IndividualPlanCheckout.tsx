import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api-config';
import { getAuthToken } from '@/lib/auth-utils';
import { INDIVIDUAL_CLASS_OPTIONS } from '@/lib/individual-signup';
import {
  B2C_BOARD_PRICE,
  B2C_IIT_PRICE,
  CLASS_TRACK_MATRIX,
  IIT_TRACK_SPECS,
  classNumbersFromLabel,
  recommendedTrackForClass,
  tracksForClass,
  type IitTrackCode,
} from '@/lib/iit-track-specs';

export type PlanPackage = 'board' | 'iit';

export type IndividualPlanValue = {
  classLabel: string;
  packageType: PlanPackage;
  track: IitTrackCode | '';
};

function supportMailto(plan: IndividualPlanValue) {
  const track = IIT_TRACK_SPECS.find((t) => t.code === plan.track);
  const packageLabel =
    plan.packageType === 'iit'
      ? `IIT Foundation ₹${B2C_IIT_PRICE}/month · ${track?.book || plan.track}`
      : `Board Learning ₹${B2C_BOARD_PRICE}/month`;
  const subject = encodeURIComponent(`AsliLearn B2C subscribe — ${plan.classLabel} ${packageLabel}`);
  const body = encodeURIComponent(
    [
      'I want to subscribe to AsliLearn.ai.',
      '',
      `Class: ${plan.classLabel}`,
      `Package: ${packageLabel}`,
      plan.track ? `IIT material: ${track?.book} (${track?.classes})` : 'IIT material: none (Board only)',
      '',
      'Please send payment details.',
    ].join('\n'),
  );
  return `mailto:info@aslilearn.ai?subject=${subject}&body=${body}`;
}

export function IndividualPlanCheckout({
  initialClass = '',
  initialTrack = '',
  initialPackage = 'iit',
  userId,
  variant = 'page',
}: {
  initialClass?: string;
  initialTrack?: string;
  initialPackage?: PlanPackage;
  userId?: string | null;
  variant?: 'page' | 'card';
}) {
  const [classLabel, setClassLabel] = useState(initialClass || 'Class 6');
  const [packageType, setPackageType] = useState<PlanPackage>(initialPackage);
  const classNumber = classNumbersFromLabel(classLabel) || 6;
  const allowedTracks = tracksForClass(classNumber);
  const defaultTrack = (allowedTracks.some((t) => t.code === initialTrack)
    ? initialTrack
    : recommendedTrackForClass(classNumber)) as IitTrackCode;
  const [track, setTrack] = useState<IitTrackCode>(defaultTrack);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const selectedTrack = IIT_TRACK_SPECS.find((t) => t.code === track);
  const matrix = CLASS_TRACK_MATRIX.find((row) => row.classNumber === classNumber);
  const price = packageType === 'iit' ? B2C_IIT_PRICE : B2C_BOARD_PRICE;

  const plan: IndividualPlanValue = useMemo(
    () => ({
      classLabel,
      packageType,
      track: packageType === 'iit' ? track : '',
    }),
    [classLabel, packageType, track],
  );

  const onClassChange = (value: string) => {
    setClassLabel(value);
    const n = classNumbersFromLabel(value) || 6;
    const nextAllowed = tracksForClass(n);
    if (!nextAllowed.some((t) => t.code === track)) {
      setTrack(recommendedTrackForClass(n));
    }
    setSaved(false);
  };

  const persist = async () => {
    if (!userId) return true;
    setSaving(true);
    setError('');
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          classNumber: classLabel,
          iitCategories: packageType === 'iit' && track ? [track] : [],
          interestedCourses:
            packageType === 'iit' ? ['IIT Foundation', 'Board Exams'] : ['Board Exams'],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Could not save your plan.');
      }
      setSaved(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your plan.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    const ok = await persist();
    if (!ok) return;
    window.location.href = supportMailto(plan);
  };

  return (
    <div className={cn(variant === 'card' ? '' : 'space-y-6')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Class</Label>
          <Select value={classLabel} onValueChange={onClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {INDIVIDUAL_CLASS_OPTIONS.filter((c) => classNumbersFromLabel(c)! <= 10).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Package</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['board', `Board ₹${B2C_BOARD_PRICE}`],
                ['iit', `IIT ₹${B2C_IIT_PRICE}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setPackageType(id);
                  setSaved(false);
                }}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-semibold',
                  packageType === id
                    ? 'border-sky-400 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-600',
                )}
              >
                {label}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-500">/ month</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {packageType === 'iit' ? (
        <div className="space-y-3">
          <Label>IIT material for {classLabel}</Label>
          <p className="text-xs text-slate-500">
            Pick the Asli Prep book your quizzes, Vidya AI and practice exams will follow.
            {matrix ? (
              <>
                {' '}
                Recommended for Class {classNumber}:{' '}
                <strong>{IIT_TRACK_SPECS.find((t) => t.code === matrix.recommended)?.name}</strong>.
              </>
            ) : null}
          </p>
          <div className="grid gap-3">
            {IIT_TRACK_SPECS.map((spec) => {
              const allowed = spec.classNumbers.includes(classNumber);
              const selected = track === spec.code;
              return (
                <button
                  key={spec.code}
                  type="button"
                  disabled={!allowed}
                  onClick={() => {
                    if (!allowed) return;
                    setTrack(spec.code);
                    setSaved(false);
                  }}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    spec.tone.bg,
                    selected && allowed ? `${spec.tone.border} ring-2 ring-sky-400` : spec.tone.border,
                    !allowed && 'cursor-not-allowed opacity-45 grayscale',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={cn('text-xs font-bold uppercase tracking-wide', spec.tone.badge)}>
                        {spec.classes}
                      </p>
                      <p className="mt-0.5 font-display text-lg font-bold text-slate-900">{spec.book}</p>
                      <p className="mt-1 text-sm text-slate-600">{spec.headline}</p>
                    </div>
                    {selected && allowed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-sky-600" /> : null}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{spec.forWhom}</p>
                  {!allowed ? (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Not offered for {classLabel}. Choose a class in {spec.classes}.
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Board package covers school-syllabus videos, notes, quizzes and practice exams. Upgrade to IIT
          Foundation anytime to unlock Asli Prep Alpha / Beta / Gamma books and the tools tied to them.
        </p>
      )}

      {selectedTrack && packageType === 'iit' ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <GraduationCap className="h-4 w-4 text-sky-700" />
            What you get on {selectedTrack.book}
          </p>
          <ul className="mt-3 space-y-1.5">
            {selectedTrack.points.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your plan</p>
          <p className="font-display text-2xl font-extrabold text-slate-900">
            ₹{price}
            <span className="text-sm font-medium text-slate-500"> / month</span>
          </p>
          <p className="text-sm text-slate-600">
            {classLabel}
            {packageType === 'iit' && selectedTrack ? ` · ${selectedTrack.book}` : ' · Board Learning'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[220px]">
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {saved ? <p className="text-xs text-emerald-700">Plan saved on your account.</p> : null}
          <Button className="h-11 w-full bg-sky-600 text-white hover:bg-sky-700" onClick={handlePay} disabled={saving}>
            {saving ? 'Saving…' : 'Continue to pay'}
          </Button>
          {!userId ? (
            <Link href={`/auth/register?class=${encodeURIComponent(classLabel)}&track=${track}&package=${packageType}`}>
              <Button variant="outline" className="h-11 w-full">
                Start 7-day free trial first
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
