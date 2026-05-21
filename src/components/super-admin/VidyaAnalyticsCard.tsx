import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";

export function VidyaAnalyticsCard() {
  const [story, setStory] = useState<any>(null);
  const [safety, setSafety] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/vidya/admin/usage-story?days=7")
      .then((r) => r.json())
      .then((d) => setStory(d))
      .catch(() => null);
    apiFetch("/api/vidya/admin/safety-blocks?days=7")
      .then((r) => r.json())
      .then((d) => setSafety(d))
      .catch(() => null);
  }, []);

  if (!story?.success) return null;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-xs sm:text-sm font-semibold text-gray-700">Vidya AI - Last 7 Days</h3>
      <p className="text-xs sm:text-sm text-gray-600">{story.story}</p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>Answered from your library</span>
          <span>{story.totals?.fromLibraryPct ?? 0}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-sky-500 transition-all"
            style={{ width: `${story.totals?.fromLibraryPct ?? 0}%` }}
          />
        </div>
      </div>
      {story.topUnservedTopics?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-amber-700">Content gaps (falling to Gemini):</p>
          <ul className="mt-1 space-y-0.5">
            {story.topUnservedTopics.slice(0, 5).map((t: any, i: number) => (
              <li key={i} className="text-xs text-gray-600">
                • {t._id?.subject} - Class {t._id?.classLabel} ({t.count} queries)
              </li>
            ))}
          </ul>
        </div>
      )}
      {safety?.success && safety.totals?.safetyBlocks > 0 && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">⚠️ {safety.alert}</div>
      )}
    </div>
  );
}
