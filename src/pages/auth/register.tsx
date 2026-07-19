import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  Phone,
  School,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { formatIitCategoryLabel } from '@/lib/products';
import { useProductCategories } from '@/hooks/use-product-categories';
import {
  CURRICULUM_BOARD_OPTIONS,
  INDIVIDUAL_CLASS_OPTIONS,
  INDIVIDUAL_COURSE_OPTIONS,
  INDIVIDUAL_SUBJECT_OPTIONS,
  INDIVIDUAL_TRIAL_DAYS,
} from '@/lib/individual-signup';
import { cn } from '@/lib/utils';

type RoleType = 'student' | 'teacher';

const Register = () => {
  const [, setLocation] = useLocation();
  const { codes: iitCategoryCodes, labelMap: iitLabelMap } = useProductCategories();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as RoleType,
    schoolName: '',
    phone: '',
    classNumber: '',
    curriculumBoard: 'CBSE',
    interestedCourses: [] as string[],
    interestedSubjects: [] as string[],
    iitCategories: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const toggleInList = (key: 'interestedCourses' | 'interestedSubjects' | 'iitCategories', value: string) => {
    setFormData((prev) => {
      const list = prev[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      setIsLoading(false);
      return;
    }
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      setIsLoading(false);
      return;
    }
    if (formData.role === 'student' && !formData.classNumber) {
      setError('Please select your class');
      setIsLoading(false);
      return;
    }
    if (formData.interestedCourses.length === 0) {
      setError('Select at least one course you are interested in');
      setIsLoading(false);
      return;
    }
    if (formData.interestedSubjects.length === 0) {
      setError('Select at least one subject');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          schoolName: formData.schoolName.trim(),
          phone: phoneDigits,
          classNumber: formData.classNumber,
          curriculumBoard: formData.curriculumBoard,
          interestedCourses: formData.interestedCourses,
          interestedSubjects: formData.interestedSubjects,
          iitCategories: formData.iitCategories,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          data.message ||
            `Account created. Your ${INDIVIDUAL_TRIAL_DAYS}-day free trial has started.`,
        );
        setSuccess(true);
        setTimeout(() => setLocation('/auth/login'), 2500);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-orange-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-slate-900">Account created</h2>
          <p className="mb-6 text-slate-600">{successMessage}</p>
          <p className="mb-6 text-sm text-slate-500">
            After {INDIVIDUAL_TRIAL_DAYS} days you will be asked to subscribe to continue.
          </p>
          <Link href="/auth/login">
            <Button className="bg-gradient-to-r from-orange-500 to-sky-500 text-white">
              Go to Sign In
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-50 via-white to-orange-50 px-4 py-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto w-full max-w-3xl"
      >
        <Card className="border-white/40 bg-white/90 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-3 px-5 text-center sm:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-sky-500">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Individual signup
            </CardTitle>
            <p className="text-sm text-slate-600 sm:text-base">
              Teachers and students — start a free {INDIVIDUAL_TRIAL_DAYS}-day trial. We store your
              profile so we can match products, class, and subjects.
            </p>
          </CardHeader>

          <CardContent className="space-y-5 px-5 pb-8 sm:px-8">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>I am a *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, role: v as RoleType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="pl-10"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName">School name *</Label>
                  <div className="relative">
                    <School className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="schoolName"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="pl-10"
                      placeholder="School / coaching name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="phone"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      className="pl-10"
                      placeholder="10-digit mobile"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Class {formData.role === 'student' ? '*' : '(optional)'}</Label>
                  <Select
                    value={formData.classNumber || undefined}
                    onValueChange={(v) => setFormData({ ...formData, classNumber: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIVIDUAL_CLASS_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Curriculum board *</Label>
                  <Select
                    value={formData.curriculumBoard}
                    onValueChange={(v) => setFormData({ ...formData, curriculumBoard: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRICULUM_BOARD_OPTIONS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <Label className="text-sm font-semibold text-slate-900">
                  Course interested in *
                </Label>
                <p className="text-xs text-slate-500">Select one or more pathways.</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {INDIVIDUAL_COURSE_OPTIONS.map((course) => {
                    const checked = formData.interestedCourses.includes(course);
                    return (
                      <label
                        key={course}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                          checked
                            ? 'border-orange-300 bg-orange-50 text-orange-950'
                            : 'border-slate-200 bg-white text-slate-700',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleInList('interestedCourses', course)}
                        />
                        {course}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <Label className="text-sm font-semibold text-slate-900">
                  IIT product tracks (optional)
                </Label>
                <p className="text-xs text-slate-500">
                  Pick the product tracks you want access to. Leave empty for general curriculum only.
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {iitCategoryCodes.map((cat) => {
                    const checked = formData.iitCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                          checked
                            ? 'border-sky-300 bg-sky-50 text-sky-950'
                            : 'border-slate-200 bg-white text-slate-700',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleInList('iitCategories', cat)}
                        />
                        IIT {formatIitCategoryLabel(cat, iitLabelMap)}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <Label className="text-sm font-semibold text-slate-900">Subjects *</Label>
                <p className="text-xs text-slate-500">Which subjects do you want to study or teach?</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {INDIVIDUAL_SUBJECT_OPTIONS.map((subj) => {
                    const checked = formData.interestedSubjects.includes(subj);
                    return (
                      <label
                        key={subj}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                          checked
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                            : 'border-slate-200 bg-white text-slate-700',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleInList('interestedSubjects', subj)}
                        />
                        {subj}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password *</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                By creating an account you get {INDIVIDUAL_TRIAL_DAYS} days free. After that,
                payment is required to continue using ASLILEARN individually.
              </p>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full bg-gradient-to-r from-orange-500 to-sky-500 text-white"
              >
                {isLoading ? 'Creating account…' : `Start ${INDIVIDUAL_TRIAL_DAYS}-day free trial`}
              </Button>
            </form>

            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-sky-700 hover:underline">
                Sign in
              </Link>
            </div>
            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
