import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Clock, 
  Users, 
  Star,
  BookOpen,
  Target,
  Award,
  ArrowLeft,
  CheckCircle,
  FileText,
  Video,
  Youtube,
  Filter,
  X
} from 'lucide-react';
import Navigation from '@/components/navigation';
import VideoModal from '@/components/video-modal';
import CalendarView from '@/components/student/calendar-view';
import { Link } from 'wouter';
import { API_BASE_URL } from '@/lib/api-config';
import { useIsMobile } from '@/hooks/use-mobile';

interface Subject {
  _id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  subjects: string[];
  color: string;
  icon: string;
  videos: Video[];
  quizzes: Quiz[];
  students: number;
  rating: number;
  progress: number;
}

interface Video {
  _id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  views: number;
  createdAt: string;
}

interface Quiz {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
  duration: number;
  createdAt: string;
}

interface ContentItem {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio';
  fileUrl: string;
  date: string;
  createdAt: string;
}

export default function SubjectContent() {
  const [, params] = useRoute('/subject/:id');
  const isMobile = useIsMobile();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  // Show calendar by default when accessed from learning paths
  const [showCalendar, setShowCalendar] = useState(true);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [completedContentIds, setCompletedContentIds] = useState<Set<string>>(new Set());
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      fetchSubjectContent(params.id);
      // Load completed content from localStorage
      loadCompletedContent(params.id);
    }
  }, [params?.id]);

  // Load completed content from localStorage
  const loadCompletedContent = (subjectId: string) => {
    try {
      const stored = localStorage.getItem(`completed_content_${subjectId}`);
      if (stored) {
        const completedIds = JSON.parse(stored);
        setCompletedContentIds(new Set(completedIds));
      }
    } catch (error) {
      console.error('Failed to load completed content:', error);
    }
  };

  // Save completed content to localStorage
  const saveCompletedContent = (subjectId: string, completedIds: Set<string>) => {
    try {
      localStorage.setItem(`completed_content_${subjectId}`, JSON.stringify(Array.from(completedIds)));
    } catch (error) {
      console.error('Failed to save completed content:', error);
    }
  };

  // Calculate progress based on completed items
  const calculateProgress = (totalItems: number, completedItems: number): number => {
    if (totalItems === 0) return 0;
    return Math.round((completedItems / totalItems) * 100);
  };

  // Handle mark as done
  const handleMarkAsDone = (contentId: string) => {
    const newCompleted = new Set(completedContentIds);
    if (newCompleted.has(contentId)) {
      newCompleted.delete(contentId);
    } else {
      newCompleted.add(contentId);
    }
    setCompletedContentIds(newCompleted);
    
    // Save to localStorage
    if (params?.id) {
      saveCompletedContent(params.id, newCompleted);
    }

    // Update subject progress
    const progress = calculateProgress(contents.length, newCompleted.size);
    setSubject(prev => prev ? { ...prev, progress } : prev);
  };

  const fetchSubjectContent = async (subjectId: string) => {
    try {
      const [subjectResponse, videosResponse, contentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/subjects/${subjectId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/student/videos?subject=${encodeURIComponent(subjectId)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          }
        }),
        fetch(`${API_BASE_URL}/api/student/asli-prep-content?subject=${encodeURIComponent(subjectId)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          }
        })
      ]);
      
      let subjectName = '';
      
      if (subjectResponse.ok) {
        const contentType = subjectResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const subjectData = await subjectResponse.json();
          setSubject(subjectData.subject);
          subjectName = subjectData.subject.name;
          console.log('Subject name:', subjectName);
        } else {
          console.warn('Subject response is not JSON, using fallback data');
          // Fallback data
          setSubject({
            _id: subjectId,
            name: 'Sample Subject',
            description: 'This is a sample subject for demonstration',
            category: 'Education',
            difficulty: 'Intermediate',
            duration: '2 hours',
            subjects: ['Math', 'Science'],
            color: 'bg-blue-100 text-blue-600',
            icon: '📚',
            videos: [],
            quizzes: [],
            students: 0,
            rating: 4.5,
            progress: 0
          });
          subjectName = 'Sample Subject';
        }
      } else {
        console.warn('Subject API failed, using fallback data');
        // Fallback data
        setSubject({
          _id: subjectId,
          name: 'Sample Subject',
          description: 'This is a sample subject for demonstration',
          category: 'Education',
          difficulty: 'Intermediate',
          duration: '2 hours',
          subjects: ['Math', 'Science'],
          color: 'bg-blue-100 text-blue-600',
          icon: '📚',
          videos: [],
          quizzes: [],
          students: 0,
          rating: 4.5,
          progress: 0
        });
        subjectName = 'Sample Subject';
      }
      
      // Attach subject-specific videos
      if (videosResponse.ok) {
        const vidCt = videosResponse.headers.get('content-type');
        if (vidCt && vidCt.includes('application/json')) {
          const videosData = await videosResponse.json();
          const videosList = (videosData.data || videosData.videos || videosData) as any[];
          console.log('📹 Videos fetched for subject:', {
            subjectId,
            videosCount: videosList.length,
            videos: videosList.map(v => ({ title: v.title, subjectId: v.subjectId }))
          });
          setSubject(prev => prev ? { ...prev, videos: videosList } as any : prev);
        } else {
          console.warn('⚠️ Videos response is not JSON');
          setSubject(prev => prev ? { ...prev, videos: [] } as any : prev);
        }
      } else {
        console.warn('⚠️ Videos API failed:', videosResponse.status, videosResponse.statusText);
        setSubject(prev => prev ? { ...prev, videos: [] } as any : prev);
      }

      // Fetch content for calendar view
      setLoadingContents(true);
      if (contentsResponse.ok) {
        const contentType = contentsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const contentsData = await contentsResponse.json();
          const contentsList = contentsData.data || contentsData || [];
          console.log('📚 Contents fetched:', contentsList.length);
          console.log('📚 Sample content item:', contentsList[0] ? {
            title: contentsList[0].title,
            date: contentsList[0].date,
            createdAt: contentsList[0].createdAt,
            dateType: typeof contentsList[0].date
          } : 'No content');
          setContents(contentsList);
          
          // Update progress after loading contents
          // Load completed items and calculate progress
          if (params?.id) {
            const stored = localStorage.getItem(`completed_content_${params.id}`);
            const completedIds = stored ? JSON.parse(stored) : [];
            const progress = calculateProgress(contentsList.length, completedIds.length);
            setSubject(prev => prev ? { ...prev, progress } : prev);
            setCompletedContentIds(new Set(completedIds));
          }
        }
      } else {
        console.warn('⚠️ Contents API failed:', contentsResponse.status);
        setContents([]);
      }
      setLoadingContents(false);

    } catch (error) {
      console.error('Failed to fetch subject content:', error);
      // Set fallback data on error
      setSubject({
        _id: subjectId,
        name: 'Sample Subject',
        description: 'This is a sample subject for demonstration',
        category: 'Education',
        difficulty: 'Intermediate',
        duration: '2 hours',
        subjects: ['Math', 'Science'],
        color: 'bg-blue-100 text-blue-600',
        icon: '📚',
        videos: [],
        quizzes: [],
        students: 0,
        rating: 4.5,
        progress: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-600';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-600';
      case 'Advanced': return 'bg-orange-100 text-orange-600';
      case 'Expert': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return BookOpen;
      case 'Target': return Target;
      case 'Award': return Award;
      default: return BookOpen;
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
          <div className="text-center">Loading subject content...</div>
        </div>
      </>
    );
  }

  if (!subject) {
    return (
      <>
        <Navigation />
        <div className="w-full px-2 sm:px-4 lg:px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Subject not found</h1>
            <Link href="/learning-paths">
              <Button>Back to Learning Paths</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const Icon = getIcon(subject.icon);

  return (
    <>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 relative">
        
        {/* Robot GIF - Fixed at Bottom Left */}
        {!isMobile && (
          <div className="fixed bottom-8 left-4 z-30 pointer-events-none">
            <img 
              src="/ROBOT.gif" 
              alt="Robot" 
              className="w-32 h-auto rounded-xl shadow-xl opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link href="/learning-paths">
              <Button 
                variant="outline" 
                className="mr-4 bg-white/90 backdrop-blur-sm border-gray-300 shadow-sm hover:bg-white hover:shadow-md transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Learning Paths
              </Button>
            </Link>
          </div>
          
          <div className="gradient-primary rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-16 h-16 ${subject.color} rounded-2xl flex items-center justify-center`}>
                  <Icon className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{subject.name}</h1>
                  <p className="text-blue-100">{subject.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 mb-6">
                <Badge className={getDifficultyColor(subject.difficulty)}>
                  {subject.difficulty}
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white">
                  {subject.category}
                </Badge>
                <div className="flex items-center space-x-1 text-blue-100">
                  <Clock className="w-4 h-4" />
                  <span>{subject.duration}</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-100">
                  <Users className="w-4 h-4" />
                  <span>{subject.students} students</span>
                </div>
                <div className="flex items-center space-x-1 text-blue-100">
                  <Star className="w-4 h-4" />
                  <span>{subject.rating}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-100">Your Progress</span>
                  <span className="text-sm font-medium text-white">{subject.progress || 0}%</span>
                </div>
                <Progress value={subject.progress || 0} className="h-2 bg-white/20 [&>div]:bg-white" />
              </div>

              <div className="flex flex-wrap gap-4">
                {!showCalendar && (
                  <Button 
                    className="bg-white text-primary hover:bg-blue-50"
                    onClick={() => setShowCalendar(true)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Learning
                  </Button>
                )}
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M47.1,-78.5C58.9,-69.2,64.3,-50.4,73.2,-32.8C82.1,-15.1,94.5,1.4,94.4,17.9C94.3,34.4,81.7,50.9,66.3,63.2C50.9,75.5,32.7,83.6,13.8,87.1C-5.1,90.6,-24.7,89.5,-41.6,82.1C-58.5,74.7,-72.7,61,-79.8,44.8C-86.9,28.6,-86.9,9.9,-83.2,-6.8C-79.5,-23.5,-72.1,-38.2,-61.3,-49.6C-50.5,-61,-36.3,-69.1,-21.4,-75.8C-6.5,-82.5,9.1,-87.8,25.2,-84.9C41.3,-82,57.9,-70,47.1,-78.5Z" transform="translate(100 100)"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {showCalendar ? (
          <div className="space-y-6">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Learning Calendar</h2>
                <p className="text-gray-600 mt-1">Content organized by upload date</p>
              </div>
              
              {/* Content Type Filter */}
              {contents.length > 0 && (
                <div className="flex items-center space-x-2">
                  {/* Get unique content types from contents */}
                  {(() => {
                    const uniqueTypes = Array.from(new Set(contents.map(c => c.type))).sort();
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex items-center space-x-2">
                            <Filter className="w-4 h-4" />
                            <span>
                              {selectedContentType ? `Filter: ${selectedContentType}` : 'Filter by Type'}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => setSelectedContentType(null)}
                            className={!selectedContentType ? 'bg-blue-50' : ''}
                          >
                            All Types ({contents.length})
                          </DropdownMenuItem>
                          {uniqueTypes.map((type) => {
                            const count = contents.filter(c => c.type === type).length;
                            return (
                              <DropdownMenuItem
                                key={type}
                                onClick={() => setSelectedContentType(type)}
                                className={selectedContentType === type ? 'bg-blue-50' : ''}
                              >
                                {type} ({count})
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })()}
                  
                  {selectedContentType && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContentType(null)}
                      className="flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Clear</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
            {loadingContents ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading content...</p>
              </div>
            ) : (
              <CalendarView 
                contents={selectedContentType 
                  ? contents.filter(c => c.type === selectedContentType)
                  : contents}
                onMarkAsDone={handleMarkAsDone}
                completedItems={Array.from(completedContentIds)}
              />
            )}
          </div>
        ) : (
          /* Content Tabs */
          <Tabs defaultValue="videos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="videos" className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>Videos ({subject.videos?.length || 0})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subject.videos?.map((video) => (
                <Card key={video._id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      {video.isYouTubeVideo ? (
                        <Youtube className="w-12 h-12 text-red-500" />
                      ) : (
                        <Video className="w-12 h-12 text-blue-500" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{video.title}</CardTitle>
                    <p className="text-gray-600 text-sm">{video.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{video.duration} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{video.views} views</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full gradient-primary text-white"
                      onClick={() => handleVideoClick(video)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch Video
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(!subject.videos || subject.videos.length === 0) && (
              <div className="text-center py-12">
                <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No videos available</h3>
                <p className="text-gray-600">Videos will appear here once they are added to this learning path.</p>
              </div>
            )}
          </TabsContent>

          </Tabs>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={handleCloseVideoModal}
        video={selectedVideo ? {
          id: selectedVideo._id,
          title: selectedVideo.title,
          description: selectedVideo.description,
          duration: Math.floor(selectedVideo.duration / 60),
          subject: subject.name,
          videoUrl: selectedVideo.videoUrl,
          youtubeUrl: selectedVideo.youtubeUrl || selectedVideo.videoUrl,
          isYouTubeVideo: selectedVideo.isYouTubeVideo || false
        } : null}
      />
    </>
  );
}
