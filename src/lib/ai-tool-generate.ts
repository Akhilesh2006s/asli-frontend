import { isStoryPassageLanguageSubject } from '@/lib/ai-tool-subject-rules';

export type AiToolFieldConfig = {
  name: string;
  label: string;
  required?: boolean;
};

type ValidateOptions = {
  config: { fields: AiToolFieldConfig[] };
  formParams: Record<string, unknown>;
  isReadingPractice?: boolean;
  requireBoard?: boolean;
};

export function validateAiToolForm({
  config,
  formParams,
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

  if (isReadingPractice && !isStoryPassageLanguageSubject(String(formParams.subject || ''))) {
    return 'Story & Passage Creator works only with English, Hindi, or Telugu subjects.';
  }

  return null;
}

const CLIENT_VALIDATION_ERROR =
  /invalid subject|topic is required|sub topic is required|class number and subject are required|only available for english and hindi|incomplete for|missing sections|not in the correct tool format/i;

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
