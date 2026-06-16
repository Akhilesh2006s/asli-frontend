import { API_BASE_URL } from "@/lib/api-config";

export type SchoolBranding = {
  schoolName: string;
  schoolLogo: string | null;
};

export function resolveSchoolLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  const trimmed = String(logoUrl).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${API_BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function getSchoolBranding(user?: {
  schoolName?: string;
  schoolLogo?: string;
  assignedAdmin?: { schoolName?: string; schoolLogo?: string };
} | null): SchoolBranding | null {
  if (!user) return null;

  const schoolName = String(
    user.schoolName || user.assignedAdmin?.schoolName || ""
  ).trim();
  const logoRaw = String(
    user.schoolLogo || user.assignedAdmin?.schoolLogo || ""
  ).trim();

  if (!schoolName && !logoRaw) return null;

  return {
    schoolName: schoolName || "Your School",
    schoolLogo: resolveSchoolLogoUrl(logoRaw),
  };
}
