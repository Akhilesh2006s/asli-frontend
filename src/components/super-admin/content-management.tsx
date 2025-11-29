import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Video, FileText, File, X, Trash2, Edit, Play, Download, Eye, Plus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio';
  board: string;
  subject: {
    _id: string;
    name: string;
  };
  classNumber?: string;
  topic?: string;
  date: string;
  fileUrl: string;
  fileUrls?: string[];
  thumbnailUrl?: string;
  duration?: number;
  createdAt: string;
  isExclusive?: boolean;
}

const BOARDS = [
  { value: 'CBSE_AP', label: 'CBSE AP' },
  { value: 'CBSE_TS', label: 'CBSE TS' },
  { value: 'STATE_AP', label: 'State AP' },
  { value: 'STATE_TS', label: 'State TS' }
];

const ALL_BOARDS_VALUE = 'ALL_BOARDS';

const BOARD_SELECT_OPTIONS = [
  ...BOARDS,
  { value: ALL_BOARDS_VALUE, label: 'Aslilearn Exclusive (All Boards)' }
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
    type: 'Video' as 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio',
    board: 'CBSE_AP',
    subject: '',
    topic: '',
    date: '',
    fileUrl: '',
    fileUrls: [] as string[],
    thumbnailUrl: '',
    duration: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [allBoardSubjectOptions, setAllBoardSubjectOptions] = useState<{ value: string; label: string; boards: Record<string, string>; }[]>([]);
  const [isLoadingAllBoardSubjects, setIsLoadingAllBoardSubjects] = useState(false);
  const [multiBoardSubjectMap, setMultiBoardSubjectMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSubjects();
    fetchContents();
  }, [selectedBoard]);

  const getSubjectsForBoard = async (boardCode: string, options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    try {
      const token = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/api/super-admin/boards/${boardCode}/subjects`;
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
          return data.data || [];
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        if (!silent) {
        toast({
          title: 'Error',
          description: errorData.message || `Failed to fetch subjects (${response.status})`,
          variant: 'destructive'
        });
        }
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
      
      if (!silent) {
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      }
    }
    return [];
  };

  const fetchSubjects = async (boardCode = selectedBoard) => {
    const data = await getSubjectsForBoard(boardCode);
    setSubjects(data);
  };

  const loadAllBoardSubjects = async () => {
    setIsLoadingAllBoardSubjects(true);
    try {
      const subjectResults = await Promise.all(
        BOARDS.map(async (board) => {
          const data = await getSubjectsForBoard(board.value, { silent: true });
          return { board: board.value, subjects: data };
        })
      );

      const subjectMap = new Map<string, { label: string; boards: Record<string, string> }>();

      subjectResults.forEach(({ board, subjects }) => {
        subjects.forEach((subject: any) => {
          const key = subject.name?.trim().toLowerCase();
          if (!key) return;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, { label: subject.name.trim(), boards: {} });
          }
          subjectMap.get(key)!.boards[board] = subject._id;
        });
      });

      const commonSubjects = Array.from(subjectMap.values()).filter(subject =>
        BOARDS.every(board => subject.boards[board.value])
      );

      setAllBoardSubjectOptions(commonSubjects.map(subject => ({
        value: subject.label,
        label: subject.label,
        boards: subject.boards
      })));

      if (commonSubjects.length === 0) {
        toast({
          title: 'No Common Subjects',
          description: 'No subject exists across every board yet. Please create matching subjects for each board to use the Aslilearn Exclusive option.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to load all-board subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects for all boards. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAllBoardSubjects(false);
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

    const isAllBoardsSelection = formData.board === ALL_BOARDS_VALUE;
    const requiredFieldsMissing = !formData.title || !formData.date || !formData.type || !formData.board;

    if (requiredFieldsMissing || (!formData.subject && !isAllBoardsSelection)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields: title, subject, date, type, and board',
        variant: 'destructive'
      });
      return;
    }

    if (isAllBoardsSelection) {
      if (!formData.subject) {
        toast({
          title: 'Validation Error',
          description: 'Select a subject that exists across every board for Aslilearn Exclusive content.',
          variant: 'destructive'
        });
        return;
      }

      const missingBoards = BOARDS.filter(board => !multiBoardSubjectMap[board.value]);
      if (missingBoards.length > 0) {
        toast({
          title: 'Missing Subjects',
          description: `No matching subject found for: ${missingBoards.map(b => b.label).join(', ')}. Please ensure the subject exists in every board.`,
          variant: 'destructive'
        });
        return;
      }
    }


    let fileUrl = formData.fileUrl;
    let fileUrls = formData.fileUrls;
    let thumbnailUrl = formData.thumbnailUrl;
    let fileSize = 0;

    // If a file is selected, upload it first
    if (selectedFile) {
      const uploadedUrl = await handleFileUpload(selectedFile);
      if (!uploadedUrl) {
        return; // Error already shown in handleFileUpload
      }
      fileUrl = uploadedUrl;
      fileUrls = [uploadedUrl]; // Store as array for consistency
      fileSize = selectedFile.size;
    } else if (formData.fileUrls.length > 0) {
      // Use multiple URLs if provided
      fileUrls = formData.fileUrls;
      fileUrl = formData.fileUrls[0]; // Keep first URL for backward compatibility
    } else if (!formData.fileUrl && formData.fileUrls.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please either upload a file or provide at least one file URL',
        variant: 'destructive'
      });
      return;
    } else if (formData.fileUrl) {
      // Single URL provided
      fileUrl = formData.fileUrl;
      fileUrls = [formData.fileUrl];
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
      const baseRequestBody: any = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        type: formData.type,
        topic: formData.topic?.trim() || undefined,
        date: formData.date, // Date in YYYY-MM-DD format
        fileUrl: fileUrl, // Keep for backward compatibility
        thumbnailUrl: thumbnailUrl || undefined,
        duration: formData.duration ? Number(formData.duration) : 0,
        size: fileSize,
      };

      // Add multiple file URLs if available
      if (fileUrls && fileUrls.length > 0) {
        baseRequestBody.fileUrls = fileUrls;
      }

      if (isAllBoardsSelection) {
        const uploadResults = [];
        for (const board of BOARDS) {
          const payload = {
            ...baseRequestBody,
            board: board.value,
            subject: multiBoardSubjectMap[board.value]
          };

          console.log('📤 Uploading content for board:', board.value, 'with subject:', payload.subject);

          const response = await fetch(`${API_BASE_URL}/api/super-admin/content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const data = await response.json();
          uploadResults.push({
            board: board.label,
            success: response.ok && data.success,
            message: data.message
          });

          if (!response.ok || !data.success) {
            console.error(`Failed to upload for ${board.label}:`, data.message);
          }
        }

        const failedBoards = uploadResults.filter(result => !result.success);

        if (failedBoards.length === 0) {
          toast({
            title: 'Success',
            description: 'Content shared with every board successfully.'
          });
          setIsUploadModalOpen(false);
        } else if (failedBoards.length === uploadResults.length) {
          toast({
            title: 'Error',
            description: 'Content upload failed for all boards. Please try again.',
            variant: 'destructive'
          });
          return;
        } else {
          toast({
            title: 'Partial Success',
            description: `Some boards failed: ${failedBoards.map(board => board.board).join(', ')}`,
            variant: 'destructive'
          });
        }
      } else {
        const requestBody = {
          ...baseRequestBody,
          board: formData.board,
          subject: formData.subject
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
        } else {
          toast({
            title: 'Error',
            description: data.message || 'Failed to upload content',
            variant: 'destructive'
          });
          return;
        }
      }

      // Reset form after successful (or partially successful) upload
        setFormData({
          title: '',
          description: '',
          type: 'Video',
          board: selectedBoard,
          subject: '',
          topic: '',
          date: '',
          fileUrl: '',
        fileUrls: [],
          thumbnailUrl: '',
          duration: '',
        });
        setSelectedFile(null);
        setSelectedThumbnail(null);
      setMultiBoardSubjectMap({});
        fetchContents();
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
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getBoardLabel = (boardCode: string) => {
    return BOARDS.find(board => board.value === boardCode)?.label || boardCode;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Content Management</h2>
          <p className="text-gray-600 mt-1">Upload videos and notes for AsliLearn Exclusive</p>
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
                  <div className="flex items-center text-white">
                    <span className="font-medium mr-2">Board:</span>
                    <span>{getBoardLabel(content.board)}</span>
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
                </div>
                <div className="mt-4 space-y-2">
                  {(content.fileUrls && content.fileUrls.length > 1) ? (
                    <div className="space-y-2">
                      <p className="text-xs text-white/80 mb-2">Multiple Links ({content.fileUrls.length}):</p>
                      {content.fileUrls.map((url: string, index: number) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white text-left justify-start"
                          onClick={() => {
                            const fileUrl = url.startsWith('http') 
                              ? url 
                              : `${API_BASE_URL}${url}`;
                            window.open(fileUrl, '_blank');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          <span className="truncate flex-1">Link {index + 1}</span>
                          <Download className="w-4 h-4 ml-2" />
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white"
                    onClick={() => {
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
                      const fileUrl = content.fileUrl.startsWith('http') 
                        ? content.fileUrl 
                        : `${API_BASE_URL}${content.fileUrl}`;
                      window.open(fileUrl, '_blank');
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                    </div>
                  )}
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
              Upload exclusive videos and notes for AsliLearn students
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
                    setMultiBoardSubjectMap({});
                    if (value === ALL_BOARDS_VALUE) {
                      setSubjects([]);
                      if (allBoardSubjectOptions.length === 0) {
                        await loadAllBoardSubjects();
                      }
                    } else {
                    setSelectedBoard(value);
                      const boardSubjects = await getSubjectsForBoard(value);
                      setSubjects(boardSubjects);
                    }
                  }}
                >
                  <SelectTrigger id="board">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_SELECT_OPTIONS.map(board => (
                      <SelectItem key={board.value} value={board.value}>
                        {board.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.board === ALL_BOARDS_VALUE && (
                  <p className="text-xs text-blue-700 mt-2">
                    Selecting Aslilearn Exclusive will duplicate this content across every board that has the chosen subject.
                  </p>
                )}
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              {formData.board === ALL_BOARDS_VALUE ? (
                isLoadingAllBoardSubjects ? (
                  <div className="text-sm text-gray-600">Loading subjects across boards...</div>
                ) : allBoardSubjectOptions.length === 0 ? (
                  <p className="text-xs text-yellow-600">
                    ⚠️ No common subjects exist across every board. Please create matching subjects for each board to use this option.
                  </p>
                ) : (
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => {
                      setFormData({ ...formData, subject: value });
                      const mapping = allBoardSubjectOptions.find(option => option.value === value);
                      setMultiBoardSubjectMap(mapping?.boards || {});
                    }}
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select a subject available in every board" />
                    </SelectTrigger>
                    <SelectContent>
                      {allBoardSubjectOptions.map(subject => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : subjects.length === 0 ? (
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
              <Label htmlFor="file">File Links *</Label>
              <div className="space-y-3">
                {selectedFile && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-600 mb-2">
                      Selected File: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        const fileInput = document.getElementById('file') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-xs"
                    >
                      Remove File
                    </Button>
                  </div>
                )}
                
              <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="fileUrl"
                      value={formData.fileUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, fileUrl: e.target.value });
                        if (e.target.value) setSelectedFile(null); // Clear file if URL is entered
                      }}
                      placeholder="https://example.com/video.mp4 or Google Drive link"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (formData.fileUrl.trim()) {
                          setFormData({
                            ...formData,
                            fileUrls: [...formData.fileUrls, formData.fileUrl.trim()],
                            fileUrl: ''
                          });
                          setSelectedFile(null);
                        }
                      }}
                      disabled={!formData.fileUrl.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {formData.fileUrls.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {formData.fileUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                          <span className="flex-1 text-sm text-gray-700 truncate">{url}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                fileUrls: formData.fileUrls.filter((_, i) => i !== index)
                              });
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <p className="font-semibold mb-1">Or upload a file:</p>
                <Input
                  id="file"
                  type="file"
                  accept={formData.type === 'TextBook' || formData.type === 'Workbook' || formData.type === 'Material'
                    ? '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp'
                    : formData.type === 'Video'
                    ? '.mp4,.mpeg,.mov,.avi,.webm,.mkv'
                    : '.mp3,.wav,.ogg,.aac,.m4a,.webm'
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                        setFormData({ ...formData, fileUrl: '', fileUrls: [] }); // Clear URLs if file is selected
                    }
                  }}
                  className="cursor-pointer"
                  />
                </div>
                
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === 'TextBook' || formData.type === 'Workbook' || formData.type === 'Material'
                    ? 'Accepted formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX'
                    : formData.type === 'Video'
                    ? 'Accepted formats: MP4, MPEG, MOV, AVI, WEBM, MKV'
                    : 'Accepted formats: MP3, WAV, OGG, AAC, M4A'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  💡 Tip: You can add multiple links for different parts of the chapter. Click the + button after entering each URL.
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

