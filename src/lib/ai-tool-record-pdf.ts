import { API_BASE_URL } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-utils";

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* ignore */
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(header);
  const raw = (plain?.[1] || plain?.[2] || "").trim();
  return raw || null;
}

/** Download a single AI tool generation record as a named PDF. */
export async function openAiToolRecordPdf(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/ai-generator/pdf/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error((json as { message?: string } | null)?.message || "Failed to open PDF");
  }

  const filename =
    filenameFromContentDisposition(res.headers.get("Content-Disposition")) ||
    `AsliLearn-AI-Content-${id.slice(-8)}-${Date.now()}.pdf`;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Also open a preview tab so teachers can review before saving elsewhere.
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
