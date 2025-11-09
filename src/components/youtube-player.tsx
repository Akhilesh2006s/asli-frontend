import { useState, useEffect } from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

const YouTubePlayer = ({ videoUrl, title, className = '' }: YouTubePlayerProps) => {
  const [videoId, setVideoId] = useState<string>('');

  useEffect(() => {
    // Extract video ID from various YouTube URL formats
    const extractVideoId = (url: string): string => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }
      return '';
    };

    const id = extractVideoId(videoUrl);
    setVideoId(id);
  }, [videoUrl]);

  if (!videoId) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 mb-2">Invalid YouTube URL</p>
          <p className="text-sm text-gray-400">Please provide a valid YouTube video URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative w-full h-0 pb-[56.25%]"> {/* 16:9 aspect ratio */}
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          title={title || 'YouTube Video'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default YouTubePlayer;










