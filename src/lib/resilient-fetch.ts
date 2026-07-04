/** Transient network / gateway failures that are worth retrying. */
export function isTransientNetworkError(error: unknown): boolean {
  const msg = String((error as Error)?.message || error || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network error") ||
    msg.includes("load failed") ||
    msg.includes("err_network") ||
    msg.includes("err_connection") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("aborted") ||
    msg.includes("the operation was aborted")
  );
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ResilientFetchOptions = RequestInit & {
  /** Total attempts including the first try. Default 3. */
  retries?: number;
  /** Base delay between retries (ms). Default 1500. */
  retryDelayMs?: number;
  /** Abort after this many ms. Default 0 (no client abort). */
  timeoutMs?: number;
};

/**
 * fetch() with retries for flaky connections / brief DB reconnects.
 * Use for long AI batch calls and other critical API requests.
 */
export async function resilientFetch(
  input: RequestInfo | URL,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const {
    retries = 3,
    retryDelayMs = 1500,
    timeoutMs = 0,
    ...init
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer =
      controller && timeoutMs > 0
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
      const res = await fetch(input, {
        ...init,
        signal: controller?.signal ?? init.signal,
      });
      if (timer != null) window.clearTimeout(timer);

      if (isTransientHttpStatus(res.status) && attempt < retries) {
        await sleep(retryDelayMs * attempt);
        continue;
      }
      return res;
    } catch (error) {
      if (timer != null) window.clearTimeout(timer);
      lastError = error;
      if (attempt >= retries || !isTransientNetworkError(error)) {
        throw error;
      }
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Network error. Please try again.");
}

export function networkErrorUserMessage(error: unknown): string {
  if (!isTransientNetworkError(error)) {
    return String((error as Error)?.message || "Request failed");
  }
  return (
    "Connection dropped while the server was still working (common during long AI batches or a brief database reconnect). " +
    "Wait 30–60 seconds, refresh the records list, then retry if nothing new appeared."
  );
}
