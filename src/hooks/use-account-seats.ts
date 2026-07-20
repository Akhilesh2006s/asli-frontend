import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api-config";

export type AccountSeatUsage = {
  usedStudents: number;
  usedTeachers: number;
  licensedStudents: number;
  licensedTeachers: number;
};

const emptySeats: AccountSeatUsage = {
  usedStudents: 0,
  usedTeachers: 0,
  licensedStudents: 0,
  licensedTeachers: 0,
};

/** Format live used vs licensed seats. If no license set, show used only. */
export function formatSeatUsage(used: number, licensed: number): string {
  const u = Number(used) || 0;
  const lim = Number(licensed) || 0;
  if (lim <= 0) return String(u);
  return `${u} / ${lim}`;
}

export function seatUsageHint(used: number, licensed: number): string {
  const lim = Number(licensed) || 0;
  if (lim <= 0) return "No seat limit set";
  const u = Number(used) || 0;
  if (u > lim) return "Over licensed seats";
  if (u >= lim) return "At licensed limit";
  return `${lim - u} seats remaining`;
}

/**
 * School admin: live used + licensed student/teacher seats from dashboard stats.
 */
export function useAccountSeats() {
  const [seats, setSeats] = useState<AccountSeatUsage>(emptySeats);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setSeats(emptySeats);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success || !json.data) return;
      setSeats({
        usedStudents: Number(json.data.totalStudents) || 0,
        usedTeachers: Number(json.data.totalTeachers) || 0,
        licensedStudents: Number(json.data.licensedStudents) || 0,
        licensedTeachers: Number(json.data.licensedTeachers) || 0,
      });
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { seats, loading, refresh };
}
