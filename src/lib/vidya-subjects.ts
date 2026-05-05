const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Detect raw MongoDB ObjectId strings so we never show them as subject labels. */
export function isLikelyMongoObjectId(value: string): boolean {
  return MONGO_OBJECT_ID_RE.test(String(value ?? "").trim());
}

export type VidyaSubjectCatalogEntry = { _id?: string; id?: string; name?: string };

/**
 * Gather human-readable subject labels from progress, catalog, and user assignments.
 * Resolves assignedSubjects that are plain ObjectIds using `subjects` (from /api/student/subjects).
 */
export function collectVidyaSubjectLabels(sources: {
  subjectProgress?: { name?: string }[];
  subjects?: VidyaSubjectCatalogEntry[];
  assignedSubjects?: unknown[];
  assignedClassSubjects?: unknown[];
}): string[] {
  const catalog = sources.subjects ?? [];
  const names = new Set<string>();

  const lookupNameById = (id: string) => {
    const f = catalog.find((s) => String(s._id || s.id) === id);
    const nm = f?.name != null ? String(f.name).trim() : "";
    return nm && !isLikelyMongoObjectId(nm) ? nm : null;
  };

  const addRaw = (raw: unknown) => {
    if (raw == null) return;
    if (typeof raw === "object") {
      const o = raw as VidyaSubjectCatalogEntry;
      const nm = String(o.name ?? "").trim();
      if (nm && !isLikelyMongoObjectId(nm)) {
        names.add(nm);
        return;
      }
      const id = String(o._id ?? o.id ?? "").trim();
      if (id && isLikelyMongoObjectId(id)) {
        const resolved = lookupNameById(id);
        if (resolved) names.add(resolved);
      }
      return;
    }
    const t = String(raw).trim();
    if (!t) return;
    if (isLikelyMongoObjectId(t)) {
      const resolved = lookupNameById(t);
      if (resolved) names.add(resolved);
      return;
    }
    names.add(t);
  };

  (sources.subjectProgress ?? []).forEach((s) => addRaw((s as { name?: string })?.name ?? s));
  (sources.subjects ?? []).forEach((s) => addRaw(s));
  (sources.assignedSubjects ?? []).forEach(addRaw);
  (sources.assignedClassSubjects ?? []).forEach(addRaw);

  return dedupeVidyaSubjectNames(names);
}

/**
 * Build stable subject keys for Vidya dropdown deduplication.
 * Merges "Maths", "maths_7", "PHYSICS_7" into one bucket per core subject.
 */
export function canonicalVidyaSubjectKey(raw: string): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  s = s.replace(/[_\s]+(?:class|grade)\s*\d{1,2}$/i, "");
  s = s.replace(/_\d{1,2}$/i, "");
  s = s.replace(/\s+\d{1,2}$/, "");
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function labelFromCanonicalKey(key: string): string {
  if (!key) return "";
  return key
    .split(" ")
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .filter(Boolean)
    .join(" ");
}

/**
 * One friendly label per subject (no duplicate Maths / Maths_7 / PHYSICS_7).
 */
export function dedupeVidyaSubjectNames(names: Iterable<string>): string[] {
  const keys = new Set<string>();
  for (const raw of names) {
    const s = String(raw ?? "").trim();
    if (!s || isLikelyMongoObjectId(s)) continue;
    const key = canonicalVidyaSubjectKey(s);
    if (key) keys.add(key);
  }
  return [...keys]
    .map(labelFromCanonicalKey)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** One row per API entity: stable `value` (usually Mongo _id) for requests, English `label` for UI only. */
export type CurriculumSelectRow = { value: string; label: string };

/**
 * Map curriculum API rows (subjects / topics / subtopics) to select options.
 * Never uses raw ObjectId as the visible label. Dedupes by English label (case-insensitive) so one line each.
 */
export function toCurriculumSelectRows(data: unknown): CurriculumSelectRow[] {
  const rows = Array.isArray(data) ? data : [];
  const out: CurriculumSelectRow[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    const id = String(row?._id ?? row?.id ?? "").trim();
    const labelRaw = String(row?.name ?? row?.label ?? row?.title ?? "").trim();
    if (!labelRaw || isLikelyMongoObjectId(labelRaw)) continue;
    const value = id && isLikelyMongoObjectId(id) ? id : id || labelRaw;
    if (!value) continue;
    out.push({ value, label: labelRaw });
  }
  const seenLabel = new Set<string>();
  const seenValue = new Set<string>();
  return out.filter((r) => {
    const lk = r.label.toLowerCase().replace(/\s+/g, " ").trim();
    if (seenLabel.has(lk)) return false;
    if (seenValue.has(r.value)) return false;
    seenLabel.add(lk);
    seenValue.add(r.value);
    return true;
  });
}

/** Topic/chapter strings from content — drop Mongo ids, one entry per English phrase (case-insensitive). */
export function sanitizeTopicStrings(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const t = String(r ?? "").trim();
    if (!t || isLikelyMongoObjectId(t)) continue;
    const k = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
