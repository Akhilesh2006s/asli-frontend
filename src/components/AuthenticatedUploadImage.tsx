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
 * Prefer same-origin `/uploads` (Vite proxy + Vercel rewrite) so httpOnly cookies work.
 * Keep `?exp=&sig=` when present (signed figures need no auth).
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
    if (isSignedUploadUrl(raw) || isSignedUploadUrl(relative)) {
      candidates.push(absolute, relative);
    } else {
      candidates.push(relative, absolute);
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
 * Prefer native img for signed URLs (faster). If that fails (expired sig / CORS),
 * fall back to authenticated fetch+blob so students still see figures.
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

    // Also try bare /uploads path (no query) via auth fetch — covers stale signatures.
    const upload = splitUploadUrl(raw);
    const authFallbackCandidates: string[] = [];
    if (upload) {
      const bareRel = upload.pathname;
      const bareAbs = `${API_BASE_URL}${upload.pathname}`;
      authFallbackCandidates.push(bareRel, bareAbs);
    }

    setStatus('loading');
    setDisplayUrl(null);

    (async () => {
      // 1) Native img for signed candidates (no auth header needed when sig is valid)
      for (const url of candidates) {
        if (!isSignedUploadUrl(url)) continue;
        try {
          const okUrl = await loadImageViaElement(url);
          if (cancelled) return;
          setDisplayUrl(okUrl);
          setStatus('ok');
          return;
        } catch {
          /* try next / fall through to auth */
        }
      }

      // 2) Authenticated blob fetch (Bearer + cookies) — signed or bare path
      const authCandidates = [...new Set([...candidates, ...authFallbackCandidates])];
      for (const url of authCandidates) {
        try {
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
          /* try next */
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
