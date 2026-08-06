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

/**
 * Prefer same-origin `/uploads` (Vite proxy + Vercel rewrite) so httpOnly cookies work.
 * Keep `?exp=&sig=` when present (signed figures need no auth).
 * Fall back to absolute API URL.
 */
function resolveAuthenticatedUploadCandidates(fileUrl: string): string[] {
  const raw = String(fileUrl || '').trim();
  if (!raw) return [];
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return [raw];

  const upload = splitUploadUrl(raw);
  const candidates: string[] = [];

  if (upload) {
    // Same-origin first (cookie session on aslilearn.ai → /uploads rewrite).
    candidates.push(`${upload.pathname}${upload.search}`);
    const absolute = `${API_BASE_URL}${upload.pathname}${upload.search}`;
    if (!candidates.includes(absolute)) candidates.push(absolute);
  } else {
    const absolute = normalizeContentFileUrl(raw);
    if (absolute) candidates.push(absolute);
  }

  return candidates;
}

async function fetchImageBlob(url: string): Promise<Blob> {
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
  return blob;
}

/**
 * Renders /uploads images that require cookie, Bearer, or signed ?exp=&sig=.
 * Plain &lt;img src&gt; cannot send Authorization; fetch + blob works with credentials.
 * Tries same-origin then API host so production cookie sessions still work.
 */
export function AuthenticatedUploadImage({
  src,
  alt = 'Figure',
  className,
  wrapperClassName,
  fallbackLabel = 'Image not available',
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const raw = String(src || '').trim();
    if (!raw) {
      setBlobUrl(null);
      setStatus('idle');
      return;
    }

    if (raw.startsWith('blob:') || raw.startsWith('data:')) {
      setBlobUrl(raw);
      setStatus('ok');
      return;
    }

    const candidates = resolveAuthenticatedUploadCandidates(raw);
    if (!candidates.length) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    setBlobUrl(null);

    (async () => {
      for (const url of candidates) {
        try {
          const blob = await fetchImageBlob(url);
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
          setStatus('ok');
          return;
        } catch {
          /* try next candidate */
        }
      }
      if (!cancelled) {
        setBlobUrl(null);
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
      {status === 'ok' && blobUrl ? (
        <img
          src={blobUrl}
          alt={alt}
          className={cn('mx-auto max-h-[420px] w-auto max-w-full object-contain', className)}
        />
      ) : null}
    </div>
  );
}
