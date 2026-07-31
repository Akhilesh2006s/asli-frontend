import { API_BASE_URL } from "@/lib/api-config";
import { clearAuthData, refreshAccessToken, getAuthToken } from "@/lib/auth-utils";

let redirectScheduled = false;
let refreshInflight: Promise<string | null> | null = null;

function loginPathForCurrentApp(): string {
  return "/signin";
}

function shouldIgnoreUrlForSessionExpiry(urlString: string): boolean {
  try {
    const u = urlString.includes("://") ? new URL(urlString) : new URL(urlString, API_BASE_URL);
    const p = u.pathname;
    return (
      p === "/api/auth/login" ||
      p === "/api/auth/register" ||
      p === "/api/auth/logout" ||
      p === "/api/auth/refresh" ||
      p === "/api/auth/me" ||
      /\/api\/streams\/[^/]+\/join$/.test(p)
    );
  } catch {
    return false;
  }
}

function isOurApiUrl(urlString: string): boolean {
  if (!urlString) return false;
  try {
    if (urlString.startsWith(API_BASE_URL)) return true;
    const u = urlString.includes("://") ? new URL(urlString) : new URL(urlString, window.location.origin);
    return u.pathname.startsWith("/api/");
  } catch {
    return urlString.includes("/api/");
  }
}

function readBearerFromHeaders(h: Headers): string | null {
  const v = h.get("Authorization") || h.get("authorization");
  if (typeof v !== "string" || !v.startsWith("Bearer ")) return null;
  const raw = v.slice(7).trim();
  if (!raw || raw === "null" || raw === "undefined") return null;
  if (raw.split(".").length !== 3) return null;
  return raw;
}

/** True only for a real JWT Bearer — not "Bearer null" / empty. */
function extractBearerJwt(input: RequestInfo | URL, init?: RequestInit): string | null {
  if (typeof input === "object" && input instanceof Request) {
    const merged = new Headers(input.headers);
    if (init?.headers) {
      const extra = new Headers(init.headers as HeadersInit);
      extra.forEach((value, key) => merged.set(key, value));
    }
    return readBearerFromHeaders(merged);
  }
  return readBearerFromHeaders(new Headers(init?.headers as HeadersInit | undefined));
}

function resolveUrlString(input: RequestInfo | URL): string {
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
  window.location.replace(loginPathForCurrentApp());
}

function invalidTokenMessage(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("invalid token") || t.includes("tokenexpirederror") || t.includes("jwt expired");
}

async function tryRefreshOnce(): Promise<string | null> {
  if (!refreshInflight) {
    refreshInflight = refreshAccessToken(API_BASE_URL).finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

/**
 * Normalize outbound API fetches:
 * - always credentials:include for our API (httpOnly cookies)
 * - strip Bearer null / garbage
 * - attach memory JWT when present
 * - on real JWT 401: refresh once, then logout
 */
export function installAuthFetchInterceptor(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { __aslilearnAuthFetchPatched?: boolean };
  if (w.__aslilearnAuthFetchPatched) return;
  w.__aslilearnAuthFetchPatched = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrlString(input);
    const apiCall = isOurApiUrl(url);

    let headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );

    // Remove broken Authorization: Bearer null from legacy call sites
    const rawAuth = headers.get("Authorization") || headers.get("authorization");
    if (rawAuth) {
      const jwt = readBearerFromHeaders(headers);
      if (!jwt) {
        headers.delete("Authorization");
        headers.delete("authorization");
      }
    }

    const memoryToken = getAuthToken();
    if (apiCall && memoryToken && !readBearerFromHeaders(headers)) {
      headers.set("Authorization", `Bearer ${memoryToken}`);
    }

    const outboundInit: RequestInit = {
      ...init,
      headers,
      credentials: apiCall ? "include" : init?.credentials,
    };

    // Avoid duplicating body/method quirks when input is Request
    let response: Response;
    if (input instanceof Request) {
      response = await nativeFetch(new Request(input, outboundInit));
    } else {
      response = await nativeFetch(input, outboundInit);
    }

    if (shouldIgnoreUrlForSessionExpiry(url) || !apiCall) {
      return response;
    }

    // Cookie-only or Bearer sessions: refresh once on 401, then retry.
    if (response.status === 401) {
      const next = await tryRefreshOnce();
      if (next) {
        headers.set("Authorization", `Bearer ${next}`);
        const retryInit: RequestInit = {
          ...outboundInit,
          headers,
          credentials: "include",
        };
        if (input instanceof Request) {
          return nativeFetch(new Request(input, retryInit));
        }
        return nativeFetch(input, retryInit);
      }
      // Only force logout when we believed we had a session (Bearer or session flag).
      const hadBearer = !!readBearerFromHeaders(headers) || !!getAuthToken();
      if (hadBearer || sessionStorage.getItem("aslilearn_session") === "1") {
        silentLogoutRedirect();
      }
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
