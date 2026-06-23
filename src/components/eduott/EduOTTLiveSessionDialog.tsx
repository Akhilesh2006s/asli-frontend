import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Radio } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import {
  type EduOTTLiveSessionLike,
  resolveLiveSessionEmbedUrl,
} from '@/lib/eduott-video-utils';
import { cn } from '@/lib/utils';

type EduOTTLiveSessionDialogProps = {
  session: EduOTTLiveSessionLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EduOTTLiveSessionDialog({
  session,
  open,
  onOpenChange,
}: EduOTTLiveSessionDialogProps) {
  const joinedRef = useRef<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const embedUrl = session ? resolveLiveSessionEmbedUrl(session) : null;

  useEffect(() => {
    if (!open || !session?._id) return;
    if (joinedRef.current === session._id) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    joinedRef.current = session._id;
    fetch(`${API_BASE_URL}/api/streams/${session._id}/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }).catch((error) => {
      console.error('Failed to log live session join:', error);
      joinedRef.current = null;
    });
  }, [open, session?._id]);

  useEffect(() => {
    if (!open) {
      joinedRef.current = null;
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
      setIsFullscreen(false);
    }
  }, [open]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = playerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-[min(100vw-1.5rem,1280px)] flex-col gap-4 overflow-hidden p-3 sm:p-4 lg:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <Radio className="h-5 w-5 text-red-500" />
            {session?.title ?? 'Live Session'}
          </DialogTitle>
          <DialogDescription>
            Watching inside AsliLearn — you are not leaving the platform.
          </DialogDescription>
        </DialogHeader>

        {session ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-black">
              {!embedUrl ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  This session does not have a playable YouTube embed yet.
                </p>
              ) : (
                <div className="w-full overflow-hidden bg-black p-2 sm:p-3">
                  <div
                    ref={playerRef}
                    className={cn(
                      'group relative mx-auto aspect-video w-full max-h-[min(68vh,78dvh)] overflow-hidden rounded-sm bg-black shadow-inner',
                      '[:fullscreen]:flex [:fullscreen]:h-screen [:fullscreen]:max-h-screen [:fullscreen]:w-screen [:fullscreen]:items-center [:fullscreen]:justify-center [:fullscreen]:rounded-none'
                    )}
                  >
                    <iframe
                      title={session.title}
                      src={embedUrl}
                      className={cn(
                        'absolute inset-0 box-border h-full w-full border-0',
                        '[:fullscreen]:relative [:fullscreen]:aspect-video [:fullscreen]:h-auto [:fullscreen]:max-h-[100vh] [:fullscreen]:w-full [:fullscreen]:max-w-[100vw]'
                      )}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                      allowFullScreen
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="pointer-events-auto gap-1.5 bg-white/95 text-gray-900 shadow-md hover:bg-white"
                        onClick={() => void toggleFullscreen()}
                      >
                        {isFullscreen ? (
                          <>
                            <Minimize2 className="h-4 w-4" />
                            Exit fullscreen
                          </>
                        ) : (
                          <>
                            <Maximize2 className="h-4 w-4" />
                            Fullscreen
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {session.description ? (
              <p className="text-sm text-muted-foreground">{session.description}</p>
            ) : null}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
