import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MarketingShell, MarketingPageHero } from "@/components/marketing/MarketingShell";
import { INDIAN_STATES, usePageSeo } from "@/components/marketing/seo";
import { API_BASE_URL } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "school_admin" | "teacher" | "student_parent";

const CLASSES = ["6", "7", "8", "9", "10"];
const BOARDS = ["CBSE", "CISCE/ICSE", "State Board/SSC", "Other"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "Reasoning"];

export default function BookADemoPage() {
  usePageSeo({
    title: "Book a Demo | AsliLearn.ai for Schools, Teachers and Students",
    description:
      "Book a personalised AsliLearn.ai demonstration for your school, teaching requirements or child. Explore Board learning, IIT Foundation programmes and teacher tools.",
    path: "/book-a-demo",
  });

  const { toast } = useToast();
  const [role, setRole] = useState<Role>("school_admin");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [multi, setMulti] = useState<Record<string, string[]>>({});

  const roleMeta = useMemo(
    () =>
      ({
        school_admin: {
          label: "School Admin",
          color: "bg-emerald-600 border-emerald-600",
          soft: "border-emerald-200 bg-emerald-50 text-emerald-900",
          cta: "Request School Demo",
          blurb: "For principals, directors, coordinators and school-management teams.",
        },
        teacher: {
          label: "Teacher",
          color: "bg-sky-600 border-sky-600",
          soft: "border-sky-200 bg-sky-50 text-sky-900",
          cta: "Request Teacher Demo",
          blurb: "For subject teachers and academic faculty.",
        },
        student_parent: {
          label: "Student / Parent",
          color: "bg-teal-600 border-teal-600",
          soft: "border-teal-200 bg-teal-50 text-teal-900",
          cta: "Request Student Demo",
          blurb: "For individual student learning subscriptions.",
        },
      })[role],
    [role],
  );

  const setField = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const toggleMulti = (key: string, value: string) => {
    setMulti((p) => {
      const cur = p[key] || [];
      return {
        ...p,
        [key]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value],
      };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({
        title: "Consent required",
        description: "Please agree to be contacted about the demonstration.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        role,
        ...form,
        classesRequired: multi.classesRequired || [],
        academicBoards: multi.academicBoards || [],
        programmeInterest: multi.programmeInterest || [],
        subjectsTaught: multi.subjectsTaught || [],
        classesTaught: multi.classesTaught || [],
        boardSupport: multi.boardSupport || [],
        iitSupport: multi.iitSupport || [],
        subjectsNeedingSupport: multi.subjectsNeedingSupport || [],
        sourcePage: "/book-a-demo",
        campaign: typeof window !== "undefined" ? window.location.search : "",
      };
      const res = await fetch(`${API_BASE_URL}/api/public/demo-leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Could not submit. Please try again.");
      }
      setSuccessId(String(json?.data?.leadId || json?.data?.id || "OK"));
      toast({ title: "Submitted", description: "Our team will contact you shortly." });
    } catch (err: unknown) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <MarketingShell>
        <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-4 font-display text-3xl font-bold text-slate-900">Thank you</h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Thank you for your interest in AsliLearn.ai. Your details have been submitted successfully. A member of
            our team will contact you shortly to understand your requirements and arrange a personalised
            demonstration.
          </p>
          <p className="mt-2 text-xs text-slate-400">Reference: {successId}</p>
          <Link href="/" className="mt-8 inline-block">
            <Button className="rounded-full bg-sky-500 px-6 text-white hover:bg-sky-600">Return to Home</Button>
          </Link>
        </section>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Personalised Demo"
        title="See AsliLearn.ai in Action"
        subtitle="Choose your role, share your requirements and our team will contact you for a personalised platform demonstration."
      >
        <p className="w-full text-center text-sm text-white/70">
          A focused 20-minute walkthrough for your school, teaching or learning needs.
        </p>
      </MarketingPageHero>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["school_admin", "School Admin"],
              ["teacher", "Teacher"],
              ["student_parent", "Student / Parent"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setRole(id);
                setForm({});
                setMulti({});
              }}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition",
                role === id
                  ? id === "school_admin"
                    ? "border-emerald-500 bg-emerald-50"
                    : id === "teacher"
                      ? "border-sky-500 bg-sky-50"
                      : "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <p className="font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {id === "school_admin"
                  ? "Principals & school teams"
                  : id === "teacher"
                    ? "Subject teachers & faculty"
                    : "Student learning plans"}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={onSubmit} className={cn("rounded-2xl border p-5 sm:p-6", roleMeta.soft)}>
            <p className="text-sm font-medium">{roleMeta.blurb}</p>

            <div className="mt-6 space-y-4">
              {role === "school_admin" ? (
                <>
                  <Field label="School name *" id="schoolName">
                    <Input required value={form.schoolName || ""} onChange={(e) => setField("schoolName", e.target.value)} />
                  </Field>
                  <Field label="Contact person’s name *" id="contactName">
                    <Input required value={form.contactName || ""} onChange={(e) => setField("contactName", e.target.value)} />
                  </Field>
                  <Field label="Designation *" id="designation">
                    <Select value={form.designation || ""} onValueChange={(v) => setField("designation", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {["Principal", "Director", "Coordinator", "Administrator", "Other"].map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Official email *" id="email">
                    <Input type="email" required value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
                  </Field>
                  <Field label="Mobile / WhatsApp *" id="phone">
                    <Input required value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
                  </Field>
                  <Field label="Complete school address *" id="address">
                    <Textarea required rows={3} value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City *" id="city">
                      <Input required value={form.city || ""} onChange={(e) => setField("city", e.target.value)} />
                    </Field>
                    <Field label="PIN code *" id="pin">
                      <Input required pattern="\d{6}" value={form.pin || ""} onChange={(e) => setField("pin", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="State *" id="state">
                    <Select value={form.state || ""} onValueChange={(v) => setField("state", v)}>
                      <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <ChipGroup
                    label="Classes required *"
                    options={CLASSES.map((c) => `Class ${c}`)}
                    values={multi.classesRequired || []}
                    onToggle={(v) => toggleMulti("classesRequired", v)}
                  />
                  <ChipGroup
                    label="Academic board *"
                    options={BOARDS}
                    values={multi.academicBoards || []}
                    onToggle={(v) => toggleMulti("academicBoards", v)}
                  />
                  <ChipGroup
                    label="Programme interest *"
                    options={["Board Learning", "IIT Foundation", "Board + IIT Foundation", "Teacher Plan", "Institutional Plan"]}
                    values={multi.programmeInterest || []}
                    onToggle={(v) => toggleMulti("programmeInterest", v)}
                  />
                </>
              ) : null}

              {role === "teacher" ? (
                <>
                  <Field label="Teacher’s name *" id="teacherName">
                    <Input required value={form.teacherName || ""} onChange={(e) => setField("teacherName", e.target.value)} />
                  </Field>
                  <Field label="School name *" id="schoolName">
                    <Input required value={form.schoolName || ""} onChange={(e) => setField("schoolName", e.target.value)} />
                  </Field>
                  <Field label="Email *" id="email">
                    <Input type="email" required value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
                  </Field>
                  <Field label="Mobile / WhatsApp *" id="phone">
                    <Input required value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
                  </Field>
                  <Field label="School address *" id="address">
                    <Textarea required rows={3} value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City *" id="city">
                      <Input required value={form.city || ""} onChange={(e) => setField("city", e.target.value)} />
                    </Field>
                    <Field label="State *" id="state">
                      <Select value={form.state || ""} onValueChange={(v) => setField("state", v)}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <ChipGroup label="Subjects taught *" options={SUBJECTS} values={multi.subjectsTaught || []} onToggle={(v) => toggleMulti("subjectsTaught", v)} />
                  <ChipGroup label="Classes taught *" options={CLASSES.map((c) => `Class ${c}`)} values={multi.classesTaught || []} onToggle={(v) => toggleMulti("classesTaught", v)} />
                  <ChipGroup label="Academic board *" options={BOARDS} values={multi.academicBoards || []} onToggle={(v) => toggleMulti("academicBoards", v)} />
                  <Field label="Plan interest *" id="planInterest">
                    <Select value={form.planInterest || ""} onValueChange={(v) => setField("planInterest", v)}>
                      <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                      <SelectContent>
                        {["Board Support", "IIT Foundation", "Board + IIT Foundation", "Teacher Annual Plan"].map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : null}

              {role === "student_parent" ? (
                <>
                  <Field label="Student’s name *" id="studentName">
                    <Input required value={form.studentName || ""} onChange={(e) => setField("studentName", e.target.value)} />
                  </Field>
                  <Field label="Parent / guardian’s name *" id="parentName">
                    <Input required value={form.parentName || ""} onChange={(e) => setField("parentName", e.target.value)} />
                  </Field>
                  <Field label="School name *" id="schoolName">
                    <Input required value={form.schoolName || ""} onChange={(e) => setField("schoolName", e.target.value)} />
                  </Field>
                  <Field label="Parent email *" id="email">
                    <Input type="email" required value={form.email || ""} onChange={(e) => setField("email", e.target.value)} />
                  </Field>
                  <Field label="Parent mobile / WhatsApp *" id="phone">
                    <Input required value={form.phone || ""} onChange={(e) => setField("phone", e.target.value)} />
                  </Field>
                  <Field label="Residential address *" id="address">
                    <Textarea required rows={3} value={form.address || ""} onChange={(e) => setField("address", e.target.value)} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City *" id="city">
                      <Input required value={form.city || ""} onChange={(e) => setField("city", e.target.value)} />
                    </Field>
                    <Field label="State *" id="state">
                      <Select value={form.state || ""} onValueChange={(v) => setField("state", v)}>
                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Class *" id="classNumber">
                    <Select value={form.classNumber || ""} onValueChange={(v) => setField("classNumber", v)}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {CLASSES.map((c) => (
                          <SelectItem key={c} value={c}>Class {c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Academic board *" id="academicBoard">
                    <Select value={form.academicBoard || ""} onValueChange={(v) => setField("academicBoard", v)}>
                      <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                      <SelectContent>
                        {BOARDS.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Learning plan *" id="learningPlan">
                    <Select value={form.learningPlan || ""} onValueChange={(v) => setField("learningPlan", v)}>
                      <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Board Learning ₹99/month">Board Learning ₹99/month</SelectItem>
                        <SelectItem value="Board + IIT Foundation ₹249/month">Board + IIT Foundation ₹249/month</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : null}

              <Field label="Message (optional)" id="message">
                <Textarea rows={3} maxLength={500} value={form.message || ""} onChange={(e) => setField("message", e.target.value)} />
              </Field>

              <label className="flex items-start gap-2 text-sm text-slate-700">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>
                  I agree to be contacted about this demonstration. See our{" "}
                  <Link href="/privacy-policy" className="font-semibold text-sky-700 underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className={cn("h-12 w-full rounded-full font-semibold text-white", roleMeta.color)}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : roleMeta.cta}
              </Button>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-slate-900">Plans at a glance</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>
                  <strong>Board Learning</strong> — ₹99/month per child
                </li>
                <li>
                  <strong>Board + IIT Foundation</strong> — ₹249/month per child
                </li>
                <li>
                  <strong>Teacher Plan</strong> — ₹3,999/year per teacher
                </li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Customised institutional and school-wide plans are available on request.
              </p>
              <Link href="/pricing" className="mt-3 inline-block text-sm font-semibold text-sky-700">
                View full pricing →
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">What to expect</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                After you submit, our team routes your enquiry to the right sales or academic-support queue and
                typically follows up within one business day for a 20-minute walkthrough.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </MarketingShell>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: string[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-800">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
