import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-config";

export function AtRiskStudentsPanel() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/admin/risk-summary")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setStudents(Array.isArray(d.students) ? d.students : []);
      })
      .catch(() => null);
  }, []);

  if (!students.length) return null;

  return (
    <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-700">
        <span>⚠️</span> Students Needing Attention ({students.length})
      </h3>
      <ul className="space-y-2">
        {students.slice(0, 8).map((s: any) => (
          <li key={s._id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
            <span className="text-sm font-medium text-gray-800">{s.studentId?.fullName || s.studentId?.name}</span>
            <span className="text-xs text-red-600">
              Risk {s.riskScore != null ? `${s.riskScore}%` : "—"} · Class{" "}
              {s.studentId?.classNumber || "-"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
