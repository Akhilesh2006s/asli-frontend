import {
  isLanguageExcludedTool,
  isStoryPassageLanguageSubject,
  LANGUAGE_EXCLUDED_TOOL_ERROR,
} from '@/lib/ai-tool-subject-rules';

/** HTML date inputs require YYYY-MM-DD; anything else is rejected. */
const AI_TOOL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidAiToolDate(value: unknown): boolean {
  const raw = String(value ?? '').trim();
  if (!AI_TOOL_DATE_RE.test(raw)) return false;
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Keep only a real calendar date — strips junk like !@#$%!@#$%. */
export function sanitizeAiToolDateValue(value: unknown): string {
  const raw = String(value ?? '').trim();
  return isValidAiToolDate(raw) ? raw : '';
}

export function todayAiToolDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type AiToolFieldConfig = {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
};

type ValidateOptions = {
  config: { fields: AiToolFieldConfig[] };
  formParams: Record<string, unknown>;
  toolType?: string;
  isReadingPractice?: boolean;
  requireBoard?: boolean;
};

export function validateAiToolForm({
  config,
  formParams,
  toolType = '',
  isReadingPractice = false,
  requireBoard = true,
}: ValidateOptions): string | null {
  const requiredFields = config.fields.filter((f) => f.required);
  const missingFields = requiredFields.filter((f) => !formParams[f.name]);

  if (missingFields.length > 0) {
    return `Please fill in: ${missingFields.map((f) => f.label).join(', ')}`;
  }

  if (requireBoard && !formParams.board) {
    return 'Please select a board.';
  }

  const subject = String(formParams.subject || formParams.subjects || '');

  if (isReadingPractice && !isStoryPassageLanguageSubject(subject)) {
    return 'Story & Passage Creator works only with English, Hindi, or Telugu subjects.';
  }

  if (isLanguageExcludedTool(toolType) && isStoryPassageLanguageSubject(subject)) {
    return LANGUAGE_EXCLUDED_TOOL_ERROR;
  }

  const dateField = config.fields.find((f) => f.name === 'date' || f.type === 'date');
  if (dateField) {
    const raw = formParams.date ?? formParams[dateField.name];
    if (raw != null && String(raw).trim() !== '' && !isValidAiToolDate(raw)) {
      return 'Please pick a valid date.';
    }
  }

  return null;
}

const CLIENT_VALIDATION_ERROR =
  /invalid subject|topic is required|sub topic is required|class number and subject are required|only available for english and hindi|not available for english, hindi, or telugu|incomplete for|missing sections|not in the correct tool format/i;

export function isAiToolClientValidationError(message: string): boolean {
  return CLIENT_VALIDATION_ERROR.test(message);
}

export function resolveAiToolApiInlineMessage(
  data: { message?: string; code?: string },
  toolName?: string,
): string {
  const message = data.message || '';
  if (message) return message;

  if (data.code === 'AI_TOOL_WRONG_TYPE') {
    return 'Saved content belongs to a different AI tool. Super Admin must generate using this tool name only.';
  }
  if (data.code === 'AI_TOOL_CONTENT_INCOMPLETE') {
    return 'Saved content is incomplete or not in the correct tool format. Ask Super Admin to complete all sections.';
  }
  if (data.code === 'AI_TOOL_DATA_NOT_FOUND') {
    return `No ${toolName || 'tool'} content found for this selection. Ask Super Admin to add it in AI Tool Generations.`;
  }
  if (data.code === 'AI_UNAVAILABLE_NO_FALLBACK') {
    return 'AI service is unavailable and no previously generated content was found for this selection.';
  }

  return 'No complete content is available for this class, subject, topic, and sub-topic.';
}

/** Backend copy aimed at admins ("ask Super Admin", "AI Tool Generations"). */
const ADMIN_FACING_COPY = /super\s*admin|ai tool generations|ai tool data|mapping/i;

/**
 * A missing chapter is a normal gap in coverage, not a failure the student
 * caused — and they can't act on "ask Super Admin to add this mapping".
 * Rewrites those into something a student can actually use.
 */
export function resolveAiToolStudentEmptyMessage(
  data: { message?: string; code?: string; availableTopics?: string[] },
  toolName?: string,
): { message: string; isContentGap: boolean } {
  const raw = resolveAiToolApiInlineMessage(data, toolName);
  const isContentGap =
    data.code === 'AI_TOOL_DATA_NOT_FOUND' ||
    data.code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    data.code === 'AI_TOOL_WRONG_TYPE' ||
    ADMIN_FACING_COPY.test(raw);

  if (!isContentGap) return { message: raw, isContentGap: false };

  const ready = Array.isArray(data.availableTopics)
    ? data.availableTopics.map((t) => String(t || '').trim()).filter(Boolean)
    : [];

  if (data.code === 'AI_TOOL_CONTENT_INCOMPLETE') {
    return {
      message: `This ${toolName || 'content'} is still incomplete for the selected chapter. Try another chapter for now.`,
      isContentGap: true,
    };
  }

  if (data.code === 'AI_TOOL_WRONG_TYPE') {
    return {
      message: `Saved content for this chapter is not a ${toolName || 'valid tool'} yet. Try another chapter.`,
      isContentGap: true,
    };
  }

  if (ready.length > 0) {
    const shown = ready.slice(0, 6).join('; ');
    const more = ready.length > 6 ? ` (+${ready.length - 6} more)` : '';
    return {
      message: `No ${toolName || 'content'} is ready for this chapter yet. Try one of these ready chapters: ${shown}${more}.`,
      isContentGap: true,
    };
  }

  return {
    message: `No ${toolName || 'content'} is ready for this class and subject yet. Try another chapter — more is being added.`,
    isContentGap: true,
  };
}

export function isAiToolInlineOnlyError(code?: string): boolean {
  return (
    code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
    code === 'AI_TOOL_WRONG_TYPE' ||
    code === 'AI_TOOL_DATA_NOT_FOUND' ||
    code === 'AI_UNAVAILABLE_NO_FALLBACK'
  );
}

export function isAiToolApiFailureInline(response: Response, code?: string): boolean {
  if (isAiToolInlineOnlyError(code)) return true;
  return (
    response.status === 404 &&
    (code === 'AI_TOOL_DATA_NOT_FOUND' ||
      code === 'AI_TOOL_CONTENT_INCOMPLETE' ||
      code === 'AI_TOOL_WRONG_TYPE')
  );
}
