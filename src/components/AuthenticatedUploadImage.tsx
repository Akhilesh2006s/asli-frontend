import { useEffect, useState } from 'react';
import { authBearerHeaders } from '@/lib/auth-utils';
import { normalizeContentFileUrl } from '@/lib/api-config';
import { cn } from '@/lib/utils';

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  wrapperClassName?: string;
  /** Shown while loading or when the image fails */
  fallbackLabel?: string;
};

/**
 * Prefer same-origin /uploads in Vite so cookies work via the local proxy.
 * Fall back to absolute API URL in production builds.
 */
function resolveAuthenticatedUploadUrl(fileUrl: string): string {
  const raw = String(fileUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;

  let pathname = '';
  try {
    if (raw.startsWith('/uploads/')) {
      pathname = raw.split('?')[0];
    } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      if (u.pathname.startsWith('/uploads/')) pathname = u.pathname;
    }
  } catch {
    /* ignore */
  }

  if (pathname && import.meta.env.DEV) {
    return pathname;
  }

  return normalizeContentFileUrl(raw);
}

/**
 * Renders /uploads images that require cookie or Bearer auth.
 * Plain &lt;img src&gt; cannot send Authorization; fetch + blob works with credentials.
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

    const absolute = resolveAuthenticatedUploadUrl(raw);
    if (!absolute) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    setBlobUrl(null);

    (async () => {
      try {
        const res = await fetch(absolute, {
          method: 'GET',
          credentials: 'include',
          headers: authBearerHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = String(res.headers.get('content-type') || '');
        const blob = await res.blob();
        if (cancelled) return;
        if (contentType.includes('application/json')) {
          throw new Error('Auth or JSON error body');
        }
        if (!blob.type.startsWith('image/') && blob.size < 32) {
          throw new Error('Not an image');
        }
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setStatus('ok');
      } catch {
        if (!cancelled) {
          setBlobUrl(null);
          setStatus('error');
        }
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
