import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, Maximize, Users, Clock } from 'lucide-react';
import Hls from 'hls.js';

interface StreamPlayerProps {
  stream: {
    _id: string;
    title: string;
    description?: string;
    playbackUrl: string;
    status: 'live' | 'scheduled' | 'ended' | 'cancelled';
    viewerCount?: number;
    scheduledStartTime?: string;
    actualStartTime?: string;
    streamer?: {
      fullName: string;
      email: string;
    };
    streamerTeacher?: {
      fullName: string;
      email: string;
    };
    subject?: {
      name: string;
    };
  };
  onClose?: () => void;
}

export default function StreamPlayer({ stream, onClose }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream.playbackUrl) return;

    // Check if HLS is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(stream.playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, ready to play');
        video.play().catch(err => {
          console.error('Error playing video:', err);
          setError('Failed to play stream');
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              hls.destroy();
              setError('Stream error occurred');
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = stream.playbackUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(err => {
          console.error('Error playing video:', err);
          setError('Failed to play stream');
        });
      });
    } else {
      setError('HLS playback not supported in this browser');
    }

    // Video event handlers
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => setError('Failed to load stream');

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [stream.playbackUrl]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('Error playing video:', err);
        setError('Failed to play stream');
      });
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    } else if ((video as any).mozRequestFullScreen) {
      (video as any).mozRequestFullScreen();
    }
  };

  const streamerName = stream.streamer?.fullName || stream.streamerTeacher?.fullName || 'Unknown';

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="relative bg-black rounded-lg overflow-hidden">
          {/* Video Player */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                  <p className="text-lg mb-2">{error}</p>
                  <p className="text-sm text-gray-400">
                    {stream.status === 'scheduled' 
                      ? 'Stream has not started yet'
                      : 'Unable to load stream'}
                  </p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
                muted={isMuted}
                volume={volume}
              />
            )}

            {/* Live Badge */}
            {stream.status === 'live' && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-red-600 text-white animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block"></span>
                  LIVE
                </Badge>
              </div>
            )}

            {/* Stream Info Overlay */}
            <div className="absolute top-4 right-4 flex gap-2">
              {stream.viewerCount !== undefined && (
                <Badge variant="secondary" className="bg-black/70 text-white">
                  <Users className="w-3 h-3 mr-1" />
                  {stream.viewerCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">{stream.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  <span>{streamerName}</span>
                  {stream.subject && (
                    <>
                      <span>•</span>
                      <span>{stream.subject.name}</span>
                    </>
                  )}
                </div>
              </div>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="text-white">
                  Close
                </Button>
              )}
            </div>

            {stream.description && (
              <p className="text-gray-300 text-sm mb-3">{stream.description}</p>
            )}

            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                className="text-white hover:bg-gray-800"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-gray-800"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-24"
                />
              </div>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="text-white hover:bg-gray-800 ml-auto"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

