import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  formatHandoffNumber,
  formatHandoffPct,
  type HandoffIndividualReport,
} from '@/lib/exam-analytics-handoff';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individual: HandoffIndividualReport | null;
  examTitle?: string;
};

export function StudentExamHandoffModal({ open, onOpenChange, individual, examTitle }: Props) {
  if (!individual) return null;
  const { student, subjectDiagnostics, behaviour, actions } = individual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-left">
            {student.name} · Individual exam analysis
          </DialogTitle>
          {examTitle ? <p className="text-xs text-slate-500 text-left">{examTitle}</p> : null}
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Rank #{student.rank}</Badge>
            <Badge variant="outline">Percentile {formatHandoffNumber(student.percentile, 2)}</Badge>
            <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">{student.cohortBand}</Badge>
            <Badge variant="secondary">{student.paceAccuracyProfile}</Badge>
          </div>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Performance snapshot
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ['Total', student.total],
                ['Correct', student.correct],
                ['Wrong', student.wrong],
                ['Left', student.left],
                ['Accuracy', formatHandoffPct(student.accuracy)],
                ['Attempt rate', formatHandoffPct(student.attemptRate)],
                ['Precision', formatHandoffPct(student.precision)],
                ['Avg time/Q', `${formatHandoffNumber(student.avgTimeSec)}s`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
                  <p className="text-base font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Subject diagnostic
            </h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-left">Student</th>
                    <th className="px-3 py-2 text-left">Class</th>
                    <th className="px-3 py-2 text-left">Gap</th>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectDiagnostics.map((row) => (
                    <tr key={row.subjectKey} className="border-t">
                      <td className="px-3 py-2 font-medium">{row.label}</td>
                      <td className="px-3 py-2">{formatHandoffPct(row.studentAccuracy)}</td>
                      <td className="px-3 py-2">{formatHandoffPct(row.classAccuracy)}</td>
                      <td className="px-3 py-2">{formatHandoffPct(row.gap)}</td>
                      <td className="px-3 py-2">#{row.subjectRank}</td>
                      <td className="px-3 py-2">{row.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Exam behaviour vs class
            </h3>
            <ul className="space-y-2">
              {behaviour.map((row) => (
                <li key={row.metric} className="rounded-lg border px-3 py-2">
                  <p className="font-semibold text-slate-800">{row.metric}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{row.reading}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Priority action plan
            </h3>
            <ol className="space-y-2">
              {actions.map((action) => (
                <li key={action.priority} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <p className="font-semibold text-amber-900">
                    {action.priority}. {action.focus}
                  </p>
                  <p className="text-slate-700 mt-0.5">{action.action}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StudentExamHandoffModal;
