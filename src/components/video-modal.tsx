import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, Play, Pause, Clock, BookOpen, Star, Share2, Download, Heart, ThumbsUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTubePlayer from '@/components/youtube-player';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    title: string;
    description: string;
    duration: number;
    subject: string;
    youtubeUrl?: string;
    videoUrl?: string;
    isYouTubeVideo?: boolean;
  } | null;
}

const VideoModal = ({ isOpen, onClose, video }: VideoModalProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset video state when modal opens/closes or video changes
  useEffect(() => {
    if (isOpen && video && videoRef.current) {
      setIsPlaying(false);
      setShowPlayButton(true);
      videoRef.current.currentTime = 0;
    }
  }, [isOpen, video?.id]);

  if (!video) return null;

  // Calculate duration from video element if duration is 0 or missing
  const handleVideoLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.currentTarget;
    if ((!video.duration || video.duration === 0) && videoElement.duration) {
      const durationInMinutes = Math.round(videoElement.duration / 60);
      if (durationInMinutes > 0) {
        setCalculatedDuration(durationInMinutes);
      }
    }
  };

  // Handle play/pause
  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setShowPlayButton(true);
      } else {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
          setShowPlayButton(false);
        } catch (error) {
          console.error('Error playing video:', error);
        }
      }
    }
  };

  // Handle video play/pause events
  const handlePlay = () => {
    setIsPlaying(true);
    setShowPlayButton(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowPlayButton(true);
  };

  // Use calculated duration if available, otherwise use video.duration
  const displayDuration = calculatedDuration || (video.duration && video.duration > 0 ? video.duration : 0);

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    
    // Handle full YouTube URLs
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    
    // Handle partial URLs like "com/watch?v=rducf9ajg0e"
    const partialMatch = url.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (partialMatch) {
      return partialMatch[1];
    }
    
    // Handle youtu.be short URLs
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      return shortMatch[1];
    }
    
    return null;
  };

  // Check if video is a YouTube video
  const youtubeId = video.youtubeUrl ? extractYouTubeId(video.youtubeUrl) : (video.videoUrl ? extractYouTubeId(video.videoUrl) : null);
  const isYouTube = video.isYouTubeVideo || !!youtubeId;
  const youtubeUrl = video.youtubeUrl || (youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : null);

  const handleOpenInNewTab = () => {
    if (isYouTube && youtubeUrl) {
      window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
    } else if (video.videoUrl) {
      window.open(video.videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // You could add a toast notification here
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[95vh] p-0 overflow-y-auto bg-gradient-to-br from-sky-300 via-sky-400 to-teal-400 flex flex-col">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full flex flex-col"
            >
              {/* Epic Header with Gradient */}
              <DialogHeader className="relative p-6 pb-4 bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1">
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                        {video.title}
                      </DialogTitle>
                    </motion.div>
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center space-x-4"
                    >
                      <Badge variant="secondary" className="bg-white/90 text-gray-900 border-white/50 backdrop-blur-sm">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {video.subject}
                      </Badge>
                      {displayDuration > 0 && (
                      <Badge variant="secondary" className="bg-white/90 text-gray-900 border-white/50 backdrop-blur-sm">
                        <Clock className="w-3 h-3 mr-1" />
                          {displayDuration} min
                      </Badge>
                      )}
                      <Badge variant="secondary" className="bg-white/90 text-gray-900 border-white/50 backdrop-blur-sm">
                        <Star className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center space-x-2"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsLiked(!isLiked)}
                      className="text-gray-900 hover:bg-white/50 backdrop-blur-sm"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className="text-gray-900 hover:bg-white/50 backdrop-blur-sm"
                    >
                      <ThumbsUp className={`w-4 h-4 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleShare}
                      className="text-gray-900 hover:bg-white/50 backdrop-blur-sm"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleOpenInNewTab}
                      className="text-gray-900 hover:bg-white/50 backdrop-blur-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onClose}
                      className="text-gray-900 hover:bg-white/50 backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
              </DialogHeader>
              
              {/* Epic Video Player Section */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex-1 p-4 pt-4 relative min-h-0 flex flex-col overflow-y-auto"
              >
                <div className="flex-1 relative group min-h-0">
                  {/* Glowing Border Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-sky-300 via-sky-400 to-teal-400 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                  
                  <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl">
                    {isYouTube && youtubeUrl ? (
                      <YouTubePlayer 
                        videoUrl={youtubeUrl}
                        title={video.title}
                        className="w-full h-full"
                      />
                    ) : video.videoUrl ? (
                      <div className="w-full h-full relative flex items-center justify-center">
                        <video 
                          ref={videoRef}
                          className="w-full h-full object-contain"
                          controls
                          preload="metadata"
                          onLoadedMetadata={handleVideoLoadedMetadata}
                          onPlay={handlePlay}
                          onPause={handlePause}
                          onClick={handlePlayPause}
                        >
                          <source src={video.videoUrl} type="video/mp4" />
                          <source src={video.videoUrl} type="video/webm" />
                          Your browser does not support the video tag.
                        </video>
                        {/* Play/Pause Button Overlay - Shows when paused or on hover */}
                        {(showPlayButton || !isPlaying) && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 cursor-pointer z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPause();
                            }}
                          >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                              className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl hover:bg-white"
                          >
                              {isPlaying ? (
                                <Pause className="w-10 h-10 text-sky-600" />
                              ) : (
                                <Play className="w-10 h-10 text-sky-600 ml-1" fill="currentColor" />
                              )}
                          </motion.div>
                        </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-200 to-teal-300">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="text-center"
                        >
                          <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Play className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-gray-900 text-lg font-medium mb-2">Video not available</p>
                          <p className="text-gray-700">No video URL provided</p>
                        </motion.div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Epic Description Section */}
                {video.description && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-4 p-4 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-2xl flex-shrink-0 max-h-[200px] overflow-y-auto"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-sky-400 to-teal-500 rounded-full flex items-center justify-center mr-3">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Description</h3>
                    </div>
                    <p className="text-gray-900 leading-relaxed">{video.description}</p>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4 mt-6">
                      <Button
                        variant="outline"
                        className="border-gray-300 text-gray-900 hover:bg-gray-100 backdrop-blur-sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-300 text-gray-900 hover:bg-gray-100 backdrop-blur-sm"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;

