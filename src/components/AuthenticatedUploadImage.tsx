import { useEffect, useState } from 'react';
import { authBearerHeaders } from '@/lib/auth-utils';
import { API_BASE_URL, normalizeContentFileUrl } from '@/lib/api-config';
import { cn } from '@/lib/utils';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
  /** Shown while loading or when the image fails */
  fallbackLabel?: string;
};

function isLocalApiHost(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(String(url || ''));
}

function splitUploadUrl(fileUrl: string): { pathname: string; search: string } | null {
  const raw = String(fileUrl || '').trim();
  if (!raw) return null;
  try {
    if (raw.startsWith('/uploads/')) {
      const q = raw.indexOf('?');
      return q >= 0
        ? { pathname: raw.slice(0, q), search: raw.slice(q) }
        : { pathname: raw, search: '' };
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      if (u.pathname.startsWith('/uploads/')) {
        return { pathname: u.pathname, search: u.search || '' };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isSignedUploadUrl(fileUrl: string): boolean {
  return /[?&]sig=/.test(fileUrl) && /[?&]exp=/.test(fileUrl);
}

/**
 * Prefer the API host for /uploads (avoids Vite :5173 404 noise).
 * Do not blindly retry production with a locally minted ?sig= — secrets differ and that 401s.
 */
function resolveAuthenticatedUploadCandidates(fileUrl: string): string[] {
  const raw = String(fileUrl || '').trim();
  if (!raw) return [];
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return [raw];

  const upload = splitUploadUrl(raw);
  const candidates: string[] = [];

  if (upload) {
    const relative = `${upload.pathname}${upload.search}`;
    const absolute = `${API_BASE_URL}${upload.pathname}${upload.search}`;

    // Already-absolute remote URL (e.g. production host) — try as stored
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      candidates.push(raw.split('#')[0]);
    }

    candidates.push(absolute);

    // Production frontend uses Vercel /uploads rewrite; keep relative there.
    // Local Vite + local API: skip relative to avoid :5173 console spam.
    if (import.meta.env.MODE === 'production' || !isLocalApiHost(API_BASE_URL)) {
      candidates.push(relative);
    }
  } else {
    const absolute = normalizeContentFileUrl(raw);
    if (absolute) candidates.push(absolute);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function loadImageViaElement(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('img load failed'));
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}

async function fetchImageBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: authBearerHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = String(res.headers.get('content-type') || '');
  const blob = await res.blob();
  if (contentType.includes('application/json')) {
    throw new Error('Auth or JSON error body');
  }
  if (!blob.type.startsWith('image/') && blob.size < 32) {
    throw new Error('Not an image');
  }
  return URL.createObjectURL(blob);
}

/**
 * Renders /uploads images with cookie, Bearer, or signed ?exp=&sig=.
 * Signed URLs use native img (faster + cache). Others use fetch+blob for auth headers.
 */
export function AuthenticatedUploadImage({
  src,
  alt = 'Figure',
  className,
  wrapperClassName,
  fallbackLabel = 'Image not available',
}: Props) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const raw = String(src || '').trim();
    if (!raw) {
      setDisplayUrl(null);
      setStatus('idle');
      return;
    }

    if (raw.startsWith('blob:') || raw.startsWith('data:')) {
      setDisplayUrl(raw);
      setStatus('ok');
      return;
    }

    const candidates = resolveAuthenticatedUploadCandidates(raw);
    if (!candidates.length) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    setDisplayUrl(null);

    const preferNativeImg = candidates.some((u) => isSignedUploadUrl(u));

    (async () => {
      for (const url of candidates) {
        try {
          if (preferNativeImg || isSignedUploadUrl(url)) {
            const okUrl = await loadImageViaElement(url);
            if (cancelled) return;
            setDisplayUrl(okUrl);
            setStatus('ok');
            return;
          }
          const blobUrl = await fetchImageBlobUrl(url);
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          objectUrl = blobUrl;
          setDisplayUrl(blobUrl);
          setStatus('ok');
          return;
        } catch {
          /* try next candidate */
        }
      }
      if (!cancelled) {
        setDisplayUrl(null);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!String(src || '').trim()) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50',
        wrapperClassName
      )}
    >
      {status === 'loading' && (
        <div className="flex h-32 items-center justify-center text-xs text-slate-500">
          Loading figure…
        </div>
      )}
      {status === 'error' && (
        <div className="flex h-28 flex-col items-center justify-center gap-1 px-3 text-center text-xs text-slate-500">
          <span>{fallbackLabel}</span>
          <span className="max-w-full truncate font-mono text-[10px] text-slate-400">
            {String(src)}
          </span>
        </div>
      )}
      {status === 'ok' && displayUrl ? (
        <img
          src={displayUrl}
          alt={alt}
          className={cn('mx-auto max-h-[420px] w-auto max-w-full object-contain', className)}
        />
      ) : null}
    </div>
  );
}
