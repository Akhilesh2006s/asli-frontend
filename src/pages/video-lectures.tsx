import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/navigation";
import VideoPlayer from "@/components/video-player";
import VideoModal from "@/components/video-modal";
import { 
  Play, 
  Search, 
  Filter, 
  Clock, 
  BookOpen,
  Zap,
  FileText,
  Map
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { VideoLecture, Subject } from "@shared/schema";
import { API_BASE_URL } from "@/lib/api-config";

// Add shimmer animation styles
const shimmerStyles = `
  @keyframes shimmer {
    0% { 
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.2), 0 0 40px rgba(255, 255, 255, 0.1);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 0 40px rgba(255, 255, 255, 0.4), 0 0 80px rgba(255, 255, 255, 0.2);
      transform: scale(1.02);
    }
    100% { 
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.2), 0 0 40px rgba(255, 255, 255, 0.1);
      transform: scale(1);
    }
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes glow {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.2); }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = shimmerStyles;
  if (!document.head.querySelector('style[data-shimmer]')) {
    styleSheet.setAttribute('data-shimmer', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default function VideoLectures() {
  const [selectedVideo, setSelectedVideo] = useState<VideoLecture | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const isMobile = useIsMobile();

  // Generate random bright colors with SHINING effects for video cards
  const getRandomBrightColor = (index: number) => {
    const brightColors = [
      'bg-gradient-to-br from-pink-400 to-pink-600 shadow-pink-500/50 shadow-2xl',
      'bg-gradient-to-br from-purple-400 to-purple-600 shadow-purple-500/50 shadow-2xl',
      'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/50 shadow-2xl',
      'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/50 shadow-2xl',
      'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-yellow-500/50 shadow-2xl',
      'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/50 shadow-2xl',
      'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-indigo-500/50 shadow-2xl',
      'bg-gradient-to-br from-teal-400 to-teal-600 shadow-teal-500/50 shadow-2xl',
      'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/50 shadow-2xl',
      'bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-500/50 shadow-2xl',
      'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/50 shadow-2xl',
      'bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/50 shadow-2xl',
      'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/50 shadow-2xl',
      'bg-gradient-to-br from-lime-400 to-lime-600 shadow-lime-500/50 shadow-2xl',
      'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/50 shadow-2xl'
    ];
    return brightColors[index % brightColors.length];
  };

  // Helper function to extract YouTube video ID
  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleVideoClick = (video: VideoLecture) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  // Fetch video lectures (from teacher-created content)
  const { data: videos = [], isLoading: videosLoading } = useQuery<VideoLecture[]>({
    queryKey: ["/api/student/videos"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch videos");
      const data = await response.json();
      return data.data || data;
    },
  });

  // Fetch subjects for filter
  const { data: subjectsData } = useQuery({
    queryKey: ["/api/subjects"],
  });
  
  const subjects = subjectsData?.subjects || [];

  // Filter videos based on search and filters
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === "all" || video.subjectId === selectedSubject;
    const matchesDifficulty = selectedDifficulty === "all" || video.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s._id === subjectId);
    return subject?.name || `Subject ${subjectId}`;
  };


  return (
    <>
      <Navigation />
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 ${isMobile ? 'pb-20' : ''}`}>
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Lectures</h1>
          <p className="text-gray-600">Interactive video content with AI-enhanced features</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search videos by title or topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject._id} value={subject._id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Video Grid */}
        {videosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedSubject !== "all" || selectedDifficulty !== "all" 
                  ? "Try adjusting your search or filters." 
                  : "No video lectures are available at the moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredVideos.map((video, index) => (
              <Card 
                key={video._id} 
                className={`group cursor-pointer hover:shadow-lg transition-all duration-500 hover:scale-105 hover:rotate-1 ${getRandomBrightColor(index)} relative overflow-hidden`}
                onClick={() => handleVideoClick(video)}
                style={{
                  animation: `shimmer ${2 + (index % 3)}s ease-in-out infinite alternate`,
                  boxShadow: `0 0 30px rgba(255, 255, 255, 0.3), 0 0 60px rgba(255, 255, 255, 0.1), 0 0 90px rgba(255, 255, 255, 0.05)`
                }}
              >
                {/* SHINING SPARKLE EFFECT */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                
                {/* GLOWING BORDER EFFECT */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/30 via-white/50 to-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                
                {/* SPARKLING PARTICLES */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-ping opacity-70 shadow-lg"></div>
                <div className="absolute top-4 right-6 w-1 h-1 bg-white rounded-full animate-pulse opacity-60 shadow-md" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute top-6 right-3 w-1.5 h-1.5 bg-white rounded-full animate-bounce opacity-80 shadow-lg" style={{animationDelay: '1s'}}></div>
                <div className="absolute bottom-4 left-3 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-90 shadow-lg" style={{animationDelay: '1.5s'}}></div>
                <div className="absolute bottom-6 right-4 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse opacity-70 shadow-md" style={{animationDelay: '2s'}}></div>
                <div className="absolute top-8 left-4 w-1 h-1 bg-pink-300 rounded-full animate-bounce opacity-80 shadow-lg" style={{animationDelay: '0.8s'}}></div>
                
                {/* SHIMMERING OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="relative">
                  <img
                    src={video.thumbnailUrl || (video.isYouTubeVideo && video.youtubeUrl ? `https://img.youtube.com/vi/${extractYouTubeId(video.youtubeUrl)}/maxresdefault.jpg` : "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450")}
                    alt={video.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                    </div>
                  </div>
                  
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {Math.floor((video.duration || 0) / 60)}:{(video.duration || 0) % 60 < 10 ? '0' : ''}{(video.duration || 0) % 60}
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs bg-white/20 text-white border-white/30 backdrop-blur-sm group-hover:bg-white/30 group-hover:shadow-lg transition-all duration-500">
                        {video.subjectId}
                      </Badge>
                      {video.isYouTubeVideo && (
                        <Badge className="text-xs bg-red-500/80 text-white border-red-400 backdrop-blur-sm group-hover:bg-red-500 group-hover:shadow-red-500/50 group-hover:shadow-lg transition-all duration-500">
                          YouTube
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-xs bg-white/20 text-white border-white/30 backdrop-blur-sm group-hover:bg-white/30 group-hover:shadow-lg transition-all duration-500`}>
                      {video.difficulty}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-white mb-2 group-hover:text-yellow-200 transition-all duration-500 drop-shadow-lg group-hover:drop-shadow-2xl group-hover:glow">
                    {video.title}
                  </h3>
                  
                  {video.description && (
                    <p className="text-sm text-white/90 mb-3 line-clamp-2 drop-shadow-md group-hover:text-white transition-all duration-500">
                      {video.description}
                    </p>
                  )}

                  {/* AI Features */}
                  {video.aiFeatures && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {video.aiFeatures.hasAutoNotes && (
                        <div className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          Notes
                        </div>
                      )}
                      {video.aiFeatures.hasVisualMaps && (
                        <div className="flex items-center">
                          <Map className="w-3 h-3 mr-1" />
                          Maps
                        </div>
                      )}
                      {video.aiFeatures.hasVoiceQA && (
                        <div className="flex items-center">
                          <Zap className="w-3 h-3 mr-1" />
                          Voice Q&A
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-white/80">{video.language}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* AI Features Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              AI-Enhanced Learning Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium mb-2">Auto-Generated Notes</h4>
                <p className="text-sm text-gray-600">
                  AI extracts key concepts and formulas from every lecture automatically
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Map className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium mb-2">Visual Memory Maps</h4>
                <p className="text-sm text-gray-600">
                  Interactive mind maps showing relationships between concepts
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium mb-2">Voice-Enabled Q&A</h4>
                <p className="text-sm text-gray-600">
                  Ask questions about the lecture using voice or text input
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        video={selectedVideo}
      />
    </>
  );
}
