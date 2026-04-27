import { API_BASE_URL } from "@/lib/api-config";
import { clearAuthData } from "@/lib/auth-utils";

let redirectScheduled = false;

function loginPathForCurrentApp(): string {
  if (typeof window === "undefined") return "/signin";
  return window.location.pathname.startsWith("/super-admin") ? "/super-admin/login" : "/signin";
}

function shouldIgnoreUrlForSessionExpiry(urlString: string): boolean {
  try {
    const u = urlString.includes("://") ? new URL(urlString) : new URL(urlString, API_BASE_URL);
    const p = u.pathname;
    return (
      p === "/api/auth/login" ||
      p === "/api/auth/register" ||
      p === "/api/auth/logout"
    );
  } catch {
    return false;
  }
}

function requestHadBearer(input: RequestInfo | URL, init?: RequestInit): boolean {
  const readAuth = (h: Headers): boolean => {
    const v = h.get("Authorization") || h.get("authorization");
    return typeof v === "string" && v.startsWith("Bearer ");
  };

  if (typeof input === "object" && input instanceof Request) {
    const merged = new Headers(input.headers);
    if (init?.headers) {
      const extra = new Headers(init.headers as HeadersInit);
      extra.forEach((value, key) => merged.set(key, value));
    }
    return readAuth(merged);
  }

  const headers = new Headers(init?.headers as HeadersInit | undefined);
  return readAuth(headers);
}

function resolveUrlString(input: RequestInfo | URL, init?: RequestInit): string {
  if (typeof input === "string") {
    return input.startsWith("http") ? input : `${API_BASE_URL}${input.startsWith("/") ? "" : "/"}${input}`;
  }
  if (input instanceof URL) return input.href;
  if (typeof input === "object" && input instanceof Request) return input.url;
  return "";
}

function silentLogoutRedirect(): void {
  if (redirectScheduled) return;
  redirectScheduled = true;
  clearAuthData();
  const target = loginPathForCurrentApp();
  window.location.replace(target);
}

function invalidTokenMessage(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("invalid token") || t.includes("tokenexpirederror") || t.includes("jwt expired");
}

/**
 * When a request was made with a Bearer token and the server rejects it as auth failure,
 * clear session and go to login without surfacing an API error toast.
 */
export function installAuthFetchInterceptor(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __aslilearnAuthFetchPatched?: boolean };
  if (w.__aslilearnAuthFetchPatched) return;
  w.__aslilearnAuthFetchPatched = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await nativeFetch(input, init);
    const url = resolveUrlString(input, init);
    const hadBearer = requestHadBearer(input, init);

    if (!hadBearer || shouldIgnoreUrlForSessionExpiry(url)) {
      return response;
    }

    if (response.status === 401) {
      silentLogoutRedirect();
      return response;
    }

    if (response.status === 400) {
      const text = await response.clone().text().catch(() => "");
      if (invalidTokenMessage(text)) {
        silentLogoutRedirect();
      }
    }

    return response;
  };
}
