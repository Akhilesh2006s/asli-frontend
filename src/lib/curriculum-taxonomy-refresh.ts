import { invalidateCurriculumTaxonomyCache } from '@/lib/curriculum-response-cache';

export const CURRICULUM_TAXONOMY_CHANGED_EVENT = 'curriculum-taxonomy-changed';

let taxonomyRevision = 0;

export function getCurriculumTaxonomyRevision() {
  return taxonomyRevision;
}

/** Call after AI Tool Topics create/update/delete so all cascade dropdowns refetch. */
export function notifyCurriculumTaxonomyChanged() {
  invalidateCurriculumTaxonomyCache();
  taxonomyRevision += 1;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CURRICULUM_TAXONOMY_CHANGED_EVENT, { detail: taxonomyRevision }));
  }
  return taxonomyRevision;
}
