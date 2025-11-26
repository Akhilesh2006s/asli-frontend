import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Video, FileText, File, X, Trash2, Edit, Play, Download, Eye } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework';
  board: string;
  subject: {
    _id: string;
    name: string;
  };
  classNumber?: string;
  topic?: string;
  date: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  deadline?: string;
  createdAt: string;
}

const BOARDS = [
  { value: 'CBSE_AP', label: 'CBSE AP' },
  { value: 'CBSE_TS', label: 'CBSE TS' },
  { value: 'STATE_AP', label: 'State AP' },
  { value: 'STATE_TS', label: 'State TS' }
];

export default function ContentManagement() {
  const { toast } = useToast();
  const [selectedBoard, setSelectedBoard] = useState<string>('CBSE_AP');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Video' as 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework',
    board: 'CBSE_AP',
    subject: '',
    topic: '',
    date: '',
    fileUrl: '',
    thumbnailUrl: '',
    duration: '',
    deadline: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  useEffect(() => {
    fetchSubjects();
    fetchContents();
  }, [selectedBoard]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/api/super-admin/boards/${selectedBoard}/subjects`;
      console.log('🌐 Fetching subjects from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubjects(data.data || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        toast({
          title: 'Error',
          description: errorData.message || `Failed to fetch subjects (${response.status})`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error);
      
      // Handle network errors specifically
      let errorMessage = 'Failed to fetch subjects';
      
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_NETWORK')) {
          errorMessage = 'Network error: Cannot connect to server. Please check your internet connection and try again.';
        } else {
          errorMessage = `Network error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || 'Failed to fetch subjects';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/api/super-admin/boards/${selectedBoard}/content`;
      console.log('🌐 Fetching content from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setContents(data.data || []);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        toast({
          title: 'Error',
          description: errorData.message || `Failed to fetch content (${response.status})`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch contents:', error);
      
      // Handle network errors specifically
      let errorMessage = 'Failed to fetch content';
      
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_NETWORK')) {
          errorMessage = 'Network error: Cannot connect to server. Please check your internet connection and try again.';
        } else {
          errorMessage = `Network error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || 'Failed to fetch content';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string | null> => {
    setIsUploadingFile(true);
    try {
      const token = localStorage.getItem('authToken');
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/super-admin/content/upload-file?contentType=${formData.type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.fileUrl;
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Upload Error',
          description: error.message || 'Failed to upload file',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsUploadingFile(false);
    }
    return null;
  };

  const handleThumbnailUpload = async (file: File): Promise<string | null> => {
    setIsUploadingThumbnail(true);
    try {
      const token = localStorage.getItem('authToken');
      const uploadFormData = new FormData();
      uploadFormData.append('thumbnail', file);

      const response = await fetch(`${API_BASE_URL}/api/super-admin/content/upload-thumbnail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.thumbnailUrl;
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Upload Error',
          description: error.message || 'Failed to upload thumbnail',
          variant: 'destructive'
        });
        return null;
      }
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload thumbnail',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsUploadingThumbnail(false);
    }
    return null;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    if (!formData.title || !formData.subject || !formData.date || !formData.type || !selectedBoard) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields: title, subject, date, type, and board',
        variant: 'destructive'
      });
      return;
    }

    // Validate deadline for homework
    if (formData.type === 'Homework' && !formData.deadline) {
      toast({
        title: 'Validation Error',
        description: 'Deadline is required for Homework content',
        variant: 'destructive'
      });
      return;
    }

    let fileUrl = formData.fileUrl;
    let thumbnailUrl = formData.thumbnailUrl;
    let fileSize = 0;

    // If a file is selected, upload it first
    if (selectedFile) {
      const uploadedUrl = await handleFileUpload(selectedFile);
      if (!uploadedUrl) {
        return; // Error already shown in handleFileUpload
      }
      fileUrl = uploadedUrl;
      fileSize = selectedFile.size;
    } else if (!formData.fileUrl) {
      toast({
        title: 'Validation Error',
        description: 'Please either upload a file or provide a file URL',
        variant: 'destructive'
      });
      return;
    }

    // If a thumbnail file is selected, upload it
    if (selectedThumbnail) {
      const uploadedThumbnailUrl = await handleThumbnailUpload(selectedThumbnail);
      if (uploadedThumbnailUrl) {
        thumbnailUrl = uploadedThumbnailUrl;
      }
      // Continue even if thumbnail upload fails (it's optional)
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // Prepare the request body with all required data
      const requestBody = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        type: formData.type,
        board: selectedBoard,
        subject: formData.subject, // This should be the subject ID
        topic: formData.topic?.trim() || undefined,
        date: formData.date, // Date in YYYY-MM-DD format
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl || undefined,
        duration: formData.duration ? Number(formData.duration) : 0,
        size: fileSize,
        deadline: formData.type === 'Homework' && formData.deadline ? formData.deadline : undefined
      };

      console.log('📤 Uploading content with data:', {
        title: requestBody.title,
        type: requestBody.type,
        board: requestBody.board,
        subject: requestBody.subject,
        date: requestBody.date,
        hasFileUrl: !!requestBody.fileUrl
      });

      const response = await fetch(`${API_BASE_URL}/api/super-admin/content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Content uploaded successfully',
        });
        setIsUploadModalOpen(false);
        setFormData({
          title: '',
          description: '',
          type: 'Video',
          board: selectedBoard,
          subject: '',
          topic: '',
          date: '',
          fileUrl: '',
          thumbnailUrl: '',
          duration: '',
          deadline: ''
        });
        setSelectedFile(null);
        setSelectedThumbnail(null);
        fetchContents();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to upload content',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload content. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    setIsDeleting(contentId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/content/${contentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Content deleted successfully',
        });
        fetchContents();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete content',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete content',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video':
        return <Video className="w-4 h-4" />;
      case 'TextBook':
        return <FileText className="w-4 h-4" />;
      case 'Workbook':
        return <File className="w-4 h-4" />;
      case 'Material':
        return <File className="w-4 h-4" />;
      case 'Audio':
        return <File className="w-4 h-4" />;
      case 'Homework':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Video':
        return 'bg-red-100 text-red-700';
      case 'TextBook':
        return 'bg-blue-100 text-blue-700';
      case 'Workbook':
        return 'bg-purple-100 text-purple-700';
      case 'Material':
        return 'bg-green-100 text-green-700';
      case 'Audio':
        return 'bg-yellow-100 text-yellow-700';
      case 'Homework':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Content Management</h2>
          <p className="text-gray-600 mt-1">Upload videos and notes for Asli Learn Foundation Exclusive</p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-gradient-to-r from-blue-700 to-cyan-300 hover:from-blue-800 hover:to-cyan-400 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Content
        </Button>
      </div>

      {/* Board Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Label className="font-semibold">Select Board:</Label>
            <div className="relative w-48">
              <div className="absolute -inset-[2px] bg-gradient-to-r from-blue-700 to-cyan-300 rounded-md"></div>
              <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                <SelectTrigger className="w-full relative z-10 border-0 bg-white focus:ring-2 focus:ring-blue-700 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARDS.map(board => (
                    <SelectItem key={board.value} value={board.value}>
                      {board.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="ml-auto">
              {contents.length} items
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      ) : contents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Yet</h3>
            <p className="text-gray-600 mb-4">Start uploading exclusive content for {BOARDS.find(b => b.value === selectedBoard)?.label} students</p>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload First Content
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content) => (
            <Card key={content._id} className="hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-700 to-cyan-300 border-0 overflow-hidden">
              <CardHeader className="bg-white/10 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 text-white font-semibold">{content.title}</CardTitle>
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      {getTypeIcon(content.type)}
                      <span className="ml-1 capitalize">{content.type}</span>
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(content._id)}
                    disabled={isDeleting === content._id}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {content.description && (
                  <p className="text-sm text-white/90 mt-2 line-clamp-2">{content.description}</p>
                )}
              </CardHeader>
              <CardContent className="bg-white/5">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-white">
                    <span className="font-medium mr-2">Subject:</span>
                    <span>{content.subject?.name || 'N/A'}</span>
                  </div>
                  {content.topic && (
                    <div className="flex items-center text-white">
                      <span className="font-medium mr-2">Topic:</span>
                      <span>{content.topic}</span>
                    </div>
                  )}
                  {content.date && (
                    <div className="flex items-center text-white">
                      <span className="font-medium mr-2">Date:</span>
                      <span>{new Date(content.date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {content.duration && (content.type === 'Video' || content.type === 'Audio') && (
                    <div className="flex items-center text-white">
                      <span className="font-medium mr-2">Duration:</span>
                      <span>{content.duration} min</span>
                    </div>
                  )}
                  {content.deadline && content.type === 'Homework' && (
                    <div className="flex items-center text-white">
                      <span className="font-medium mr-2">Deadline:</span>
                      <span className="text-yellow-200 font-semibold">
                        {new Date(content.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                    onClick={() => {
                      // Handle both relative paths and full URLs
                      const fileUrl = content.fileUrl.startsWith('http') 
                        ? content.fileUrl 
                        : `${API_BASE_URL}${content.fileUrl}`;
                      window.open(fileUrl, '_blank');
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                    onClick={() => {
                      // Handle both relative paths and full URLs
                      const fileUrl = content.fileUrl.startsWith('http') 
                        ? content.fileUrl 
                        : `${API_BASE_URL}${content.fileUrl}`;
                      window.open(fileUrl, '_blank');
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={(open) => {
        setIsUploadModalOpen(open);
        if (open) {
          // Sync form board with selected board when modal opens
          setFormData(prev => ({ ...prev, board: selectedBoard, subject: '' }));
        } else {
          // Reset file selection when modal closes
          setSelectedFile(null);
          setSelectedThumbnail(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Upload New Content</DialogTitle>
            <DialogDescription>
              Upload exclusive videos and notes for Asli Learn Foundation students
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="board">Board *</Label>
                <Select
                  value={formData.board}
                  onValueChange={async (value) => {
                    setFormData({ ...formData, board: value, subject: '' }); // Reset subject when board changes
                    setSelectedBoard(value);
                    // Fetch subjects for the new board
                    try {
                      const token = localStorage.getItem('authToken');
                      const response = await fetch(`${API_BASE_URL}/api/super-admin/boards/${value}/subjects`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                          setSubjects(data.data || []);
                        }
                      }
                    } catch (error) {
                      console.error('Failed to fetch subjects:', error);
                    }
                  }}
                >
                  <SelectTrigger id="board">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARDS.map(board => (
                      <SelectItem key={board.value} value={board.value}>
                        {board.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Content Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => {
                    setFormData({ ...formData, type: value });
                    setSelectedFile(null); // Clear file when content type changes
                  }}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TextBook">TextBook</SelectItem>
                    <SelectItem value="Workbook">Workbook</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Homework">Homework</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              {subjects.length === 0 ? (
                <div className="space-y-2">
                  <Select disabled>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="No subjects available" />
                    </SelectTrigger>
                  </Select>
                  <p className="text-xs text-yellow-600">
                    ⚠️ No subjects found for {BOARDS.find(b => b.value === formData.board)?.label}. 
                    Please create subjects first in Subject Management.
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.subject}
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject._id} value={subject._id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              {formData.type === 'Homework' && (
                <div>
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                    min={formData.date} // Deadline should be after or equal to upload date
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter content title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter content description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Algebra, Mechanics"
                />
              </div>
              {(formData.type === 'Video' || formData.type === 'Audio') && (
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="file">File *</Label>
              <div className="space-y-2">
                <Input
                  id="file"
                  type="file"
                  accept={formData.type === 'TextBook' || formData.type === 'Workbook' || formData.type === 'Material' || formData.type === 'Homework'
                    ? '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp'
                    : formData.type === 'Video'
                    ? '.mp4,.mpeg,.mov,.avi,.webm,.mkv'
                    : '.mp3,.wav,.ogg,.aac,.m4a,.webm'
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setFormData({ ...formData, fileUrl: '' }); // Clear URL if file is selected
                    }
                  }}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-xs text-green-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <div className="text-xs text-gray-500">
                  <p className="font-semibold mb-1">Or enter a URL:</p>
                  <Input
                    id="fileUrl"
                    value={formData.fileUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, fileUrl: e.target.value });
                      if (e.target.value) setSelectedFile(null); // Clear file if URL is entered
                    }}
                    placeholder="https://example.com/video.mp4 or Google Drive link"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === 'TextBook' || formData.type === 'Workbook' || formData.type === 'Material' || formData.type === 'Homework'
                    ? 'Accepted formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX'
                    : formData.type === 'Video'
                    ? 'Accepted formats: MP4, MPEG, MOV, AVI, WEBM, MKV'
                    : 'Accepted formats: MP3, WAV, OGG, AAC, M4A'}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="thumbnail">Thumbnail Image (Optional)</Label>
              <div className="space-y-2">
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedThumbnail(file);
                      setFormData({ ...formData, thumbnailUrl: '' }); // Clear URL if file is selected
                    } else {
                      setSelectedThumbnail(null);
                    }
                  }}
                  className="cursor-pointer"
                />
                {selectedThumbnail && (
                  <div className="space-y-2">
                    <p className="text-xs text-green-600">
                      Selected: {selectedThumbnail.name} ({(selectedThumbnail.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    {selectedThumbnail.type.startsWith('image/') && (
                      <img
                        src={URL.createObjectURL(selectedThumbnail)}
                        alt="Thumbnail preview"
                        className="w-32 h-32 object-cover rounded border border-gray-300"
                      />
                    )}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  <p className="font-semibold mb-1">Or enter a URL:</p>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, thumbnailUrl: e.target.value });
                      if (e.target.value) setSelectedThumbnail(null); // Clear file if URL is entered
                    }}
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: JPG, PNG, GIF, WEBP (Max 5MB)
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-700 to-cyan-300 hover:from-blue-800 hover:to-cyan-400 text-white"
                disabled={isUploadingFile || isUploadingThumbnail}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingFile || isUploadingThumbnail ? 'Uploading...' : 'Upload Content'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

