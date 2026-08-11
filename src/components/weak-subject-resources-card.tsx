import type { ReactNode } from 'react';

export interface WeakSubjectContentItem {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  topic?: string;
  subject: { _id: string; name: string };
}

export type WeakSubjectContentMap = {
  Video: WeakSubjectContentItem[];
  TextBook: WeakSubjectContentItem[];
  Workbook: WeakSubjectContentItem[];
  Material: WeakSubjectContentItem[];
};

/**
 * Formerly showed textbooks/materials with View/Download on exam results.
 * Disabled — exam results should not push library downloads.
 */
export function WeakSubjectResourcesCard(_props: {
  loadingContent: boolean;
  weakSubjectContent: WeakSubjectContentMap | null;
}): ReactNode {
  return null;
}
