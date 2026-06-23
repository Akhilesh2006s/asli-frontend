import type { AiToolRecordPreviewInput } from "@/lib/ai-tool-record-list-preview";
import { recordGenerationVariant } from "@/lib/ai-tool-record-list-preview";

export function compareAiToolRecordsByVariantThenDate(
  a: AiToolRecordPreviewInput & { createdAt?: string },
  b: AiToolRecordPreviewInput & { createdAt?: string },
): number {
  const va = recordGenerationVariant(a);
  const vb = recordGenerationVariant(b);
  if (va != null && vb != null && va !== vb) return va - vb;
  if (va != null && vb == null) return -1;
  if (va == null && vb != null) return 1;
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
}

export function sortAiToolRecordsByVariantThenDate<T extends AiToolRecordPreviewInput & { createdAt?: string }>(
  records: T[],
): T[] {
  return [...records].sort(compareAiToolRecordsByVariantThenDate);
}
