import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  displayMcqQuestionSerial,
  extractMcqQuestionsFromRecord,
  isMcqTool,
  isStructuredPaperTool,
  isWorksheetMcqTool,
  type McqQuestion,
} from "@/lib/mcq-record-utils";
import { normalizeAiToolSlug } from "@/lib/normalize-ai-tool-slug";
import {
  aiToolRecordListPreview,
  type AiToolRecordPreviewInput,
} from "@/lib/ai-tool-record-list-preview";

export type AiToolRecordPreviewBodyProps = {
  toolSlug: string;
  record: AiToolRecordPreviewInput;
  className?: string;
  textClassName?: string;
  /** When set, each MCQ card shows a delete control (AI Tool Data list). */
  onDeleteQuestion?: (questionIndex: number) => void;
  deletingQuestionKey?: string | null;
  recordId?: string;
};

function isPracticeQaTool(slug: string): boolean {
  return normalizeAiToolSlug(slug) === "smart-qa-practice-generator";
}

export function AiToolRecordPreviewBody({
  toolSlug,
  record,
  className,
  textClassName,
  onDeleteQuestion,
  deletingQuestionKey,
  recordId = "",
}: AiToolRecordPreviewBodyProps) {
  const slug = normalizeAiToolSlug(toolSlug);
  const previewText = aiToolRecordListPreview(slug, record);

  if (isWorksheetMcqTool(slug)) {
    return (
      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm",
          className,
        )}
      >
        <p
          className={cn(
            "text-xs sm:text-sm text-slate-700 line-clamp-4 leading-relaxed",
            textClassName,
          )}
        >
          {previewText}
        </p>
      </div>
    );
  }

  const parsedMcqs: McqQuestion[] =
    isMcqTool(slug) && !isPracticeQaTool(slug) && !isStructuredPaperTool(slug)
      ? extractMcqQuestionsFromRecord({
          toolName: slug,
          generatedContent: String(record.generatedContent || record.content || ""),
          content: String(record.content || record.generatedContent || ""),
          metadata: record.metadata,
        })
      : [];

  if (parsedMcqs.length > 0) {
    return (
      <div className={cn("space-y-3", className)}>
        {parsedMcqs.map((q, i) => (
          <div
            key={`${recordId}-mcq-${i}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm font-medium text-slate-900 leading-relaxed flex-1">
                Q{displayMcqQuestionSerial(q, i)}. {q.question}
              </p>
              {onDeleteQuestion ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deletingQuestionKey === `${recordId}:${i}`}
                  onClick={() => onDeleteQuestion(i)}
                  aria-label="Delete question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            {q.options.length > 0 ? (
              <ul className="mt-3 space-y-2.5 pl-0.5">
                {q.options.map((opt, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700"
                  >
                    <span
                      className="mt-1.5 h-3.5 w-3.5 rounded-full border border-slate-400 shrink-0 bg-white"
                      aria-hidden
                    />
                    <span>{opt}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {q.answer ? (
              <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                <span className="font-semibold">Answer:</span> {q.answer}
              </p>
            ) : null}
            {q.explanation ? (
              <p className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                <span className="font-semibold">Explanation:</span> {q.explanation}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm",
        className,
      )}
    >
      <p
        className={cn(
          "text-xs sm:text-sm text-slate-700 line-clamp-4 leading-relaxed",
          textClassName,
        )}
      >
        {previewText}
      </p>
    </div>
  );
}
