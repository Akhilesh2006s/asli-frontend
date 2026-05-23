import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Video as VideoIcon } from 'lucide-react';
import { extractYouTubeId, getEduOTTPlaybackUrl } from '@/lib/eduott-video-utils';
import type { EduOTTVideoCardItem } from '@/components/eduott/EduOTTVideoCard';

type EduOTTVideoPlayerDialogProps = {
  video: EduOTTVideoCardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EduOTTVideoPlayerDialog({
  video,
  open,
  onOpenChange,
}: EduOTTVideoPlayerDialogProps) {
  const { isYouTube, url: playbackUrl } = video
    ? getEduOTTPlaybackUrl(video)
    : { isYouTube: false, url: null as string | null };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-[min(100vw-1.5rem,1280px)] flex-col gap-4 overflow-hidden p-3 sm:p-4 lg:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8">{video?.title ?? 'Content preview'}</DialogTitle>
          <DialogDescription>Content preview</DialogDescription>
        </DialogHeader>

        {video ? (
          <>
            <div className="min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/30">
              {!playbackUrl ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Video not available.
                </p>
              ) : isYouTube ? (
                <div className="w-full overflow-hidden bg-black p-2 sm:p-3">
                  <div className="relative mx-auto aspect-video w-full max-h-[min(68vh,78dvh)] overflow-hidden rounded-sm bg-black shadow-inner">
                    {(() => {
                      const ytId = extractYouTubeId(playbackUrl);
                      if (!ytId) {
                        return (
                          <p className="p-4 text-center text-sm text-muted-foreground">
                            Invalid YouTube URL.
                          </p>
                        );
                      }
                      return (
                        <iframe
                          title={video.title}
                          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                          className="absolute inset-0 box-border h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-stretch overflow-hidden bg-black p-2 sm:p-3">
                  <video
                    key={playbackUrl}
                    src={playbackUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="mx-auto block w-full max-w-full bg-black object-contain"
                    style={{
                      aspectRatio: '16 / 9',
                      minHeight: 220,
                      maxHeight: 'min(72vh, 80dvh)',
                    }}
                  >
                    <track kind="captions" />
                    Your browser does not support embedded video.
                  </video>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <VideoIcon className="h-4 w-4" />
              <span className="font-medium uppercase tracking-wide">Video</span>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
