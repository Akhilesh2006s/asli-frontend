import { API_BASE_URL } from "@/lib/api-config";
import type { PdfRecord } from "./pdf-utils";
export type { PdfRecord };

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type BranchItem = { value: string; count: number };
export type BranchResponse = {
  success: boolean;
  data: {
    nextLevel: string;
    items?: BranchItem[];
    leaf?: boolean;
    matchSummary?: Record<string, string>;
  };
};

export async function fetchBranch(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/children?${qs.toString()}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Branch fetch failed: ${res.status}`);
  return (await res.json()) as BranchResponse;
}

export async function fetchMeta() {
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/meta`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Meta fetch failed: ${res.status}`);
  return res.json() as Promise<{
    success: boolean;
    data: { total: number; topicsCount?: number };
  }>;
}

export type RecordRow = {
  _id: string;
  toolName: string;
  toolDisplayName?: string;
  classLabel: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  createdAt?: string;
  preview: string;
  /** Full stored text / markdown (needed to parse fallback MCQ blobs in the list). */
  content?: string;
  metadata?: Record<string, unknown>;
};

export async function fetchRecords(
  params: Record<string, string>,
  page = 1,
  limit = 25,
) {
  const qs = new URLSearchParams({ ...params, page: String(page), limit: String(limit) });
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/records?${qs.toString()}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Records fetch failed: ${res.status}`);
  return res.json() as Promise<{
    success: boolean;
    data: {
      total: number;
      items: RecordRow[];
      page: number;
      limit: number;
    };
  }>;
}

export async function fetchDocument(id: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/document/${id}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Document fetch failed: ${res.status}`);
  return res.json() as Promise<{ success: boolean; data: PdfRecord & { content: string } }>;
}

export async function updateDocument(id: string, content: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/document/${id}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok) throw new Error(`Document update failed: ${res.status}`);
  return res.json() as Promise<{ success: boolean; data: PdfRecord & { content: string } }>;
}

/** Update worksheet / MCQ structured payload (e.g. delete one question) without replacing full text. */
export async function patchDocumentStructured(id: string, structuredContent: Record<string, unknown>) {
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/document/${id}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ structuredContent }),
    },
  );
  if (!res.ok) throw new Error(`Structured update failed: ${res.status}`);
  return res.json() as Promise<{ success: boolean; data: Record<string, unknown> }>;
}

export async function deleteDocument(id: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/document/${id}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  if (!res.ok) throw new Error(`Document delete failed: ${res.status}`);
  return res.json() as Promise<{ success: boolean; message?: string }>;
}

export async function fetchExportBundle(
  params: Record<string, string>,
  maxDocs = 2000,
) {
  const qs = new URLSearchParams({ ...params, maxDocs: String(maxDocs) });
  const res = await fetch(
    `${API_BASE_URL}/api/super-admin/ai-tool-generations/export-bundle?${qs.toString()}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.json() as Promise<{
    success: boolean;
    data: {
      truncated?: boolean;
      warning?: string;
      records: PdfRecord[];
    };
  }>;
}
