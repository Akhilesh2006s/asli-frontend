import type { ReactNode } from 'react';
import { GeneratedRecordBody } from '@/components/super-admin/generated-record-body';
import { SixSectionViewer } from '@/components/ai-v2/six-section-viewer';
import { mapRecordToSixSectionViewer } from '@/lib/six-section-map';
import { normalizeAiToolSlug } from '@/lib/normalize-ai-tool-slug';

export type AiToolViewerAudience = 'teacher' | 'student';

function recordMeta(record: Record<string, unknown>, slug: string) {
  const val = (k: string) => String(record[k] || '').trim();
  return {
    name: String(record.toolDisplayName || record.toolName || slug).trim(),
    curriculum: {
      board: val('board'),
      class: val('classLabel') || val('className'),
      subject: val('subject'),
      chapter: val('topic'),
      subtopic: val('subtopic'),
    },
    chapter: { title: val('topic'), subtopic: val('subtopic') },
  };
}

export function resolveViewerForRecord(
  record: Record<string, unknown>,
  slug: string,
  _audience: AiToolViewerAudience = 'teacher',
): ReactNode {
  const sixSection = mapRecordToSixSectionViewer(slug, record, recordMeta(record, slug));
  if (sixSection) {
    return <SixSectionViewer {...sixSection} />;
  }

  const generatedContent = String(record.generatedContent || record.content || '');
  return <GeneratedRecordBody content={generatedContent} toolType={slug} />;
}

export function recordUsesSixSectionViewer(record: Record<string, unknown> | null, slug: string): boolean {
  if (!record) return false;
  return mapRecordToSixSectionViewer(slug, record, recordMeta(record, slug)) != null;
}

export function GeneratorRecordViewer({
  record,
  audience = 'teacher',
  wrapHost = true,
}: {
  record: Record<string, unknown> | null;
  audience?: AiToolViewerAudience;
  /** @deprecated Host wrapper removed — six-section UI is self-contained. */
  wrapHost?: boolean;
}) {
  if (!record) return null;
  const slug = normalizeAiToolSlug(record.toolSlug || record.toolName);
  return resolveViewerForRecord(record, slug, audience);
}
