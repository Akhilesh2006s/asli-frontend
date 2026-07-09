import { stripAiGeneratorLeakage } from '@/lib/strip-ai-tool-metadata';

/** Normalize and strip internal AI metadata from any user-facing text field. */
export function sanitizeAiDisplayText(value: unknown): string {
  return stripAiGeneratorLeakage(
    String(value ?? '')
      .replace(/\r\n/g, '\n')
      .trim(),
  );
}
