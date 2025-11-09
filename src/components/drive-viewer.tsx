import { useState } from 'react';
import { ExternalLink, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DriveViewerProps {
  driveUrl: string;
  title?: string;
  className?: string;
}

const DriveViewer = ({ driveUrl, title, className = '' }: DriveViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);

  // Convert Google Drive URL to embeddable format
  const getEmbedUrl = (url: string): string => {
    // Extract file ID from various Google Drive URL formats
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  const embedUrl = getEmbedUrl(driveUrl);

  const handleOpenInNewTab = () => {
    window.open(driveUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    // Convert to direct download link
    const downloadUrl = driveUrl.replace('/view?usp=sharing', '').replace('/file/d/', '/uc?export=download&id=');
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">
              {title || 'Google Drive Document'}
            </h3>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenInNewTab}
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="relative w-full h-96">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading document...</p>
            </div>
          </div>
        )}
        
        <iframe
          className="w-full h-full"
          src={embedUrl}
          title={title || 'Google Drive Document'}
          frameBorder="0"
          onLoad={() => setIsLoading(false)}
          allow="autoplay"
        />
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          This document is hosted on Google Drive. Click "Open" to view in full screen.
        </p>
      </div>
    </div>
  );
};

export default DriveViewer;










