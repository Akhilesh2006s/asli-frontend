import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Play,
  Pause,
  Upload,
  Download,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Video,
  FileVideo,
  Youtube
} from 'lucide-react';
import YouTubePlayer from '@/components/youtube-player';

interface Video {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration: number; // in minutes
  thumbnail: string;
  videoUrl: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  isActive: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

const TeacherVideoManagement = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    subject: '',
    subjectId: '',
    duration: 30,
    videoUrl: '',
    thumbnail: '',
    youtubeUrl: '',
    isYouTubeVideo: false
  });

  useEffect(() => {
    fetchVideos();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('${API_BASE_URL}/api/teacher/subjects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('${API_BASE_URL}/api/teacher/videos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      } else {
        // Mock data for development
        setVideos([
          {
            id: '1',
            title: 'Introduction to Algebra',
            description: 'Basic algebraic concepts and problem solving techniques',
            subject: 'Mathematics',
            duration: 45,
            thumbnail: '/api/placeholder/300/200',
            videoUrl: 'https://example.com/video1.mp4',
            isActive: true,
            views: 1250,
            createdAt: '2024-01-15',
            updatedAt: '2024-01-15'
          },
          {
            id: '2',
            title: 'Physics: Newton\'s Laws',
            description: 'Understanding the fundamental laws of motion',
            subject: 'Physics',
            duration: 60,
            thumbnail: '/api/placeholder/300/200',
            videoUrl: 'https://example.com/video2.mp4',
            isActive: true,
            views: 890,
            createdAt: '2024-01-14',
            updatedAt: '2024-01-14'
          },
          {
            id: '3',
            title: 'English Grammar Basics',
            description: 'Essential grammar rules and usage',
            subject: 'English',
            duration: 35,
            thumbnail: '/api/placeholder/300/200',
            videoUrl: 'https://example.com/video3.mp4',
            isActive: false,
            views: 2100,
            createdAt: '2024-01-13',
            updatedAt: '2024-01-13'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVideo = async () => {
    try {
      const response = await fetch('/api/teacher/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newVideo),
      });

      if (response.ok) {
        const createdVideo = await response.json();
        setVideos([...videos, createdVideo]);
        
        // Add video to the selected subject
        if (newVideo.subjectId) {
          await fetch(`/api/teacher/subjects/${newVideo.subjectId}/videos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ videoId: createdVideo._id || createdVideo.id }),
          });
        }
        
        setIsCreateDialogOpen(false);
        setNewVideo({
          title: '',
          description: '',
          subject: '',
          subjectId: '',
          duration: 30,
          videoUrl: '',
          thumbnail: '',
          youtubeUrl: '',
          isYouTubeVideo: false
        });
      }
    } catch (error) {
      console.error('Failed to create video:', error);
    }
  };

  const handleEditVideo = async (video: Video) => {
    try {
      const response = await fetch(`/api/teacher/videos/${video.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(video),
      });

      if (response.ok) {
        const updatedVideo = await response.json();
        setVideos(videos.map(v => v.id === video.id ? updatedVideo : v));
        setIsEditDialogOpen(false);
        setEditingVideo(null);
      }
    } catch (error) {
      console.error('Failed to update video:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      try {
        const response = await fetch(`/api/teacher/videos/${videoId}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          setVideos(videos.filter(v => v.id !== videoId));
        }
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }
  };

  const toggleVideoStatus = async (video: Video) => {
    try {
      const response = await fetch(`/api/teacher/videos/${video.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !video.isActive }),
      });

      if (response.ok) {
        const updatedVideo = await response.json();
        setVideos(videos.map(v => v.id === video.id ? updatedVideo : v));
      }
    } catch (error) {
      console.error('Failed to toggle video status:', error);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || video.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Video Management</h2>
          <p className="text-gray-600">Upload and manage educational videos</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700">
              <Plus className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload New Video</DialogTitle>
              <DialogDescription>
                Upload a new educational video with title, description, and metadata.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Video Title</Label>
                <Input
                  id="title"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  placeholder="Enter video title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  placeholder="Enter video description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Learning Path</Label>
                  <Select value={newVideo.subjectId} onValueChange={(value) => {
                    const selectedSubject = subjects.find(s => s._id === value);
                    setNewVideo({ 
                      ...newVideo, 
                      subjectId: value,
                      subject: selectedSubject?.name || ''
                    });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select learning path" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name} ({subject.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newVideo.duration}
                    onChange={(e) => setNewVideo({ ...newVideo, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              {/* Video Type Selection */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="isYouTubeVideo"
                    checked={newVideo.isYouTubeVideo}
                    onChange={(e) => setNewVideo({ ...newVideo, isYouTubeVideo: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isYouTubeVideo" className="text-sm font-medium">
                    This is a YouTube Video
                  </Label>
                </div>
                
                {newVideo.isYouTubeVideo ? (
                  <div>
                    <Label htmlFor="youtubeUrl">YouTube URL</Label>
                    <Input
                      id="youtubeUrl"
                      value={newVideo.youtubeUrl}
                      onChange={(e) => setNewVideo({ ...newVideo, youtubeUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste the YouTube video URL - it will be embedded and played on your website
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="videoUrl">Video URL</Label>
                      <Input
                        id="videoUrl"
                        value={newVideo.videoUrl}
                        onChange={(e) => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                        placeholder="Enter video URL or upload file"
                      />
                    </div>
                    <div>
                      <Label htmlFor="thumbnail">Thumbnail URL</Label>
                      <Input
                        id="thumbnail"
                        value={newVideo.thumbnail}
                        onChange={(e) => setNewVideo({ ...newVideo, thumbnail: e.target.value })}
                        placeholder="Enter thumbnail URL"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVideo} className="bg-sky-600 hover:bg-sky-700">
                  Upload Video
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(subject => (
              <SelectItem key={subject._id} value={subject.name}>{subject.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="relative">
                  {video.isYouTubeVideo && video.youtubeUrl ? (
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <YouTubePlayer 
                        videoUrl={video.youtubeUrl}
                        title={video.title}
                        className="w-full h-full"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant={video.isActive ? "default" : "secondary"}
                          className={video.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {video.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          <Youtube className="w-3 h-3 mr-1" />
                          YouTube
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                        <Button size="sm" variant="secondary" className="rounded-full">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge 
                          variant={video.isActive ? "default" : "secondary"}
                          className={video.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {video.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {video.title}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{video.subject}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {video.duration}min
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {video.views} views
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingVideo(video);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleVideoStatus(video)}
                    >
                      {video.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteVideo(video.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>
              Update video details, metadata, and settings.
            </DialogDescription>
          </DialogHeader>
          {editingVideo && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Video Title</Label>
                <Input
                  id="edit-title"
                  value={editingVideo.title}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingVideo.description}
                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-subject">Subject</Label>
                  <Select value={editingVideo.subject} onValueChange={(value) => setEditingVideo({ ...editingVideo, subject: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject._id} value={subject._id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editingVideo.duration}
                    onChange={(e) => setEditingVideo({ ...editingVideo, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-videoUrl">Video URL</Label>
                <Input
                  id="edit-videoUrl"
                  value={editingVideo.videoUrl}
                  onChange={(e) => setEditingVideo({ ...editingVideo, videoUrl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
                <Input
                  id="edit-thumbnail"
                  value={editingVideo.thumbnail}
                  onChange={(e) => setEditingVideo({ ...editingVideo, thumbnail: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleEditVideo(editingVideo)} className="bg-sky-600 hover:bg-sky-700">
                  Update Video
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherVideoManagement;
