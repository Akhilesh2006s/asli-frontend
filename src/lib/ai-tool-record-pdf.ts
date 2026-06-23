import { API_BASE_URL } from "@/lib/api-config";

function authHeaders(): Record<string, string> {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("superAdminToken") ||
    localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Open a single AI tool generation record as PDF (shared master collection). */
export async function openAiToolRecordPdf(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/ai-generator/pdf/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error((json as { message?: string } | null)?.message || "Failed to open PDF");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
