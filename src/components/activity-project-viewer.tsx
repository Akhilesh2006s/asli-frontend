import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, ClipboardList, ListChecks, Target } from 'lucide-react';

type ActivityProject = {
  sl_no?: number;
  title?: string;
  name?: string;
  objective?: string;
  materials?: string[] | string;
  materials_required?: string[] | string;
  steps?: string[] | string;
  instructions?: string[] | string;
  learning_outcome?: string;
  learning_outcomes?: string;
  expected_outcome?: string;
  evaluation?: string | string[];
  assessment?: string | string[];
};

export function ActivityProjectViewer({
  activities,
  className,
}: {
  activities: ActivityProject[];
  className?: string;
}) {
  if (!activities || activities.length === 0) {
    return (
      <div className={cn('rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600', className)}>
        No activities/projects found for this selection.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activities.map((a, idx) => {
        const title = a.title || a.name || `Activity ${idx + 1}`;
        const materials = a.materials ?? a.materials_required;
        const steps = a.steps ?? a.instructions;
        const learningOutcome = a.learning_outcome ?? a.learning_outcomes ?? a.expected_outcome;
        const evaluation = a.evaluation ?? a.assessment;
        const sl = a.sl_no ?? idx + 1;

        return (
          <Card key={`${sl}-${title}-${idx}`} className="overflow-hidden border-gray-100 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-violet-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base font-bold text-gray-900 sm:text-lg">
                    Activity {sl}: {title}
                  </CardTitle>
                  {a.objective ? (
                    <p className="mt-1 flex items-start gap-2 text-sm text-gray-700">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                      <span>
                        <span className="font-semibold">Objective:</span> {a.objective}
                      </span>
                    </p>
                  ) : null}
                </div>
                <Badge className="rounded-full border-0 bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  A&amp;G
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              {materials ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <ClipboardList className="h-4 w-4 text-gray-500" aria-hidden />
                    Materials
                  </p>
                  {Array.isArray(materials) ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {materials.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-700">{materials}</p>
                  )}
                </div>
              ) : null}

              {steps ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <ListChecks className="h-4 w-4 text-gray-500" aria-hidden />
                    Steps / Procedure
                  </p>
                  {Array.isArray(steps) ? (
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                      {steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-700">{steps}</p>
                  )}
                </div>
              ) : null}

              {learningOutcome ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="flex items-start gap-2 text-sm text-gray-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span>
                      <span className="font-semibold">Learning outcome:</span> {learningOutcome}
                    </span>
                  </p>
                </div>
              ) : null}

              {evaluation ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                  <p className="text-sm font-semibold text-gray-900">Evaluation</p>
                  {Array.isArray(evaluation) ? (
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                      {evaluation.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-gray-700">{evaluation}</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

