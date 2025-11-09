import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Folder, 
  CheckCircle,
  File,
  Video,
  BookOpen,
  Download,
  Link as LinkIcon,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface ContentItem {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework';
  fileUrl: string;
  date: string;
  createdAt: string;
  deadline?: string;
}

interface WeekContent {
  weekStart: Date;
  weekEnd: Date;
  contents: ContentItem[];
}

interface CalendarViewProps {
  contents: ContentItem[];
  onMarkAsDone?: (contentId: string) => void;
  completedItems?: string[];
}

export default function CalendarView({ contents, onMarkAsDone, completedItems = [] }: CalendarViewProps) {
  const { toast } = useToast();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [markedDone, setMarkedDone] = useState<Set<string>>(new Set(completedItems));
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<ContentItem | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

  // Organize content by weeks - only show weeks that have content
  const organizeByWeeks = (contents: ContentItem[]): WeekContent[] => {
    if (!contents || contents.length === 0) {
      console.log('📅 Calendar: No contents provided');
      return [];
    }

    console.log('📅 Calendar: Organizing', contents.length, 'content items by weeks');

    // Sort contents by upload date (date field is the upload date)
    const sortedContents = [...contents].sort((a, b) => {
      // Use date field (upload date) if available, otherwise fall back to createdAt
      const dateA = a.date ? new Date(a.date) : new Date(a.createdAt);
      const dateB = b.date ? new Date(b.date) : new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });

    // Group by weeks - only create weeks that have content
    const weeksMap = new Map<string, ContentItem[]>();

    sortedContents.forEach(content => {
      // Use date field (upload date) if available, otherwise fall back to createdAt
      // Handle both Date objects and ISO strings
      let contentDate: Date;
      if (content.date) {
        contentDate = content.date instanceof Date ? content.date : new Date(content.date);
      } else if (content.createdAt) {
        contentDate = content.createdAt instanceof Date ? content.createdAt : new Date(content.createdAt);
      } else {
        console.warn('⚠️ Calendar: No date found for content:', content.title);
        return; // Skip content without date
      }
      
      // Ensure date is valid
      if (isNaN(contentDate.getTime())) {
        console.warn('⚠️ Calendar: Invalid date for content:', content.title, content.date, content.createdAt);
        return; // Skip invalid dates
      }
      
      // Calculate week boundaries based on upload date
      const weekStart = getWeekStart(contentDate);
      const weekEnd = getWeekEnd(contentDate);
      // Use a separator that won't conflict with ISO date strings
      const weekKey = `${weekStart.getTime()}_${weekEnd.getTime()}`;

      console.log(`📅 Calendar: Content "${content.title}" uploaded on ${contentDate.toLocaleDateString()} -> Week ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}`);

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, []);
      }
      weeksMap.get(weekKey)!.push(content);
    });

    // Convert to array and sort by week start date
    // Only include weeks that have content
    const weeks: WeekContent[] = Array.from(weeksMap.entries())
      .filter(([_, contents]) => contents.length > 0) // Only weeks with content
      .map(([key, contents]) => {
        // Parse the week key (format: startTime_endTime)
        const [startTime, endTime] = key.split('_').map(Number);
        return {
          weekStart: new Date(startTime),
          weekEnd: new Date(endTime),
          contents: contents.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(a.createdAt);
            const dateB = b.date ? new Date(b.date) : new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          })
        };
      })
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

    console.log('📅 Calendar: Organized into', weeks.length, 'weeks with content');
    return weeks;
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Reset to start of day
    const day = d.getDay();
    // Monday = 1, Sunday = 0
    // If Sunday (0), go back 6 days to Monday
    // Otherwise, go back (day - 1) days to Monday
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diff);
    return weekStart;
  };

  const getWeekEnd = (date: Date): Date => {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // End of day
    return weekEnd;
  };

  const formatDateRange = (start: Date, end: Date): string => {
    const startDay = start.getDate();
    const startMonth = start.toLocaleString('default', { month: 'long' });
    const endDay = end.getDate();
    const endMonth = end.toLocaleString('default', { month: 'long' });
    
    if (startMonth === endMonth) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  };

  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };

  const handleMarkAsDone = (contentId: string) => {
    const newMarked = new Set(markedDone);
    if (newMarked.has(contentId)) {
      newMarked.delete(contentId);
    } else {
      newMarked.add(contentId);
    }
    setMarkedDone(newMarked);
    if (onMarkAsDone) {
      onMarkAsDone(contentId);
    }
  };

  const handleContentClick = (content: ContentItem) => {
    if (content.type === 'Homework') {
      setSelectedHomework(content);
      setIsSubmissionOpen(true);
      fetchExistingSubmission(content._id);
    } else {
      setSelectedContent(content);
      setIsPreviewOpen(true);
    }
  };

  const fetchExistingSubmission = async (homeworkId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/homework-submission/${homeworkId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setExistingSubmission(data.data);
          setSubmissionLink(data.data.submissionLink);
          setSubmissionDescription(data.data.description || '');
          // Mark as done if submission exists
          if (onMarkAsDone) {
            onMarkAsDone(homeworkId);
          }
          setMarkedDone(prev => new Set([...prev, homeworkId]));
        } else {
          setExistingSubmission(null);
          setSubmissionLink('');
          setSubmissionDescription('');
        }
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    }
  };

  const handleSubmitHomework = async () => {
    if (!selectedHomework || !submissionLink.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a submission link',
        variant: 'destructive'
      });
      return;
    }

    // Validate URL
    try {
      new URL(submissionLink.trim());
    } catch (error) {
      toast({
        title: 'Invalid URL',
        description: 'Please provide a valid URL for the submission link',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/homework-submission`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeworkId: selectedHomework._id,
          submissionLink: submissionLink.trim(),
          description: submissionDescription.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExistingSubmission(data.data);
        
        // Automatically mark as done
        if (onMarkAsDone) {
          onMarkAsDone(selectedHomework._id);
        }
        setMarkedDone(prev => new Set([...prev, selectedHomework._id]));
        
        toast({
          title: 'Success',
          description: 'Homework submitted successfully and marked as done!',
        });
        
        setIsSubmissionOpen(false);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to submit homework',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error submitting homework:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while submitting homework',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = (content: ContentItem) => {
    // Construct full URL for download
    const fileUrl = content.fileUrl.startsWith('http') 
      ? content.fileUrl 
      : `${API_BASE_URL}${content.fileUrl}`;
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = content.title || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilePreviewUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    return `${API_BASE_URL}${fileUrl}`;
  };

  const getFileExtension = (fileUrl: string): string => {
    const parts = fileUrl.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const renderFilePreview = (content: ContentItem) => {
    const previewUrl = getFilePreviewUrl(content.fileUrl);
    const fileExtension = getFileExtension(content.fileUrl);
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    const isVideo = ['mp4', 'webm', 'ogg'].includes(fileExtension);
    const isPDF = fileExtension === 'pdf';
    const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(fileExtension);

    if (isImage) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <img 
            src={previewUrl} 
            alt={content.title}
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
          <video 
            src={previewUrl} 
            controls 
            className="max-w-full max-h-[60vh] rounded-lg"
            onError={(e) => {
              console.error('Video preview error:', e);
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <iframe
            src={previewUrl}
            className="w-full h-[60vh] rounded-lg border-0"
            title={content.title}
            onError={(e) => {
              console.error('PDF preview error:', e);
            }}
          />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg p-8">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <File className="w-12 h-12 text-blue-600" />
            </div>
            <audio 
              src={previewUrl} 
              controls 
              className="w-full max-w-md"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      );
    }

    // Default preview for other file types
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg p-8">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <File className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-gray-600">Preview not available for this file type</p>
          <p className="text-sm text-gray-500">File extension: {fileExtension || 'unknown'}</p>
        </div>
      </div>
    );
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'Video':
        return Video;
      case 'TextBook':
      case 'Workbook':
        return BookOpen;
      case 'Material':
        return FileText;
      case 'Audio':
        return File;
      case 'Homework':
        return FileText;
      default:
        return File;
    }
  };

  const getContentTypeLabel = (type: string): string => {
    switch (type) {
      case 'Video':
        return 'VIDEO';
      case 'TextBook':
        return 'TEXTBOOK';
      case 'Workbook':
        return 'WORKBOOK';
      case 'Material':
        return 'FILE';
      case 'Audio':
        return 'AUDIO';
      case 'Homework':
        return 'HOMEWORK';
      default:
        return 'FILE';
    }
  };

  const weeks = organizeByWeeks(contents);

  console.log('📅 Calendar: Rendering', weeks.length, 'weeks with', contents.length, 'total contents');

  return (
    <div className="space-y-4">
      {weeks.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content available</h3>
          <p className="text-gray-600">Content will appear here once it's uploaded.</p>
        </div>
      ) : (
        weeks.map((week, index) => {
          const weekKey = `${week.weekStart.getTime()}_${week.weekEnd.getTime()}`;
          const isExpanded = expandedWeeks.has(weekKey) || (expandedWeeks.size === 0 && index === 0); // Expand first week by default

          return (
            <div key={weekKey} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Week Header */}
              <button
                onClick={() => toggleWeek(weekKey)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-gray-900">
                  {formatDateRange(week.weekStart, week.weekEnd)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {/* Week Content */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {week.contents.map((content) => {
                    const Icon = getContentIcon(content.type);
                    const isDone = markedDone.has(content._id);
                    const contentTypeLabel = getContentTypeLabel(content.type);

                    return (
                      <div
                        key={content._id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleContentClick(content)}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                {contentTypeLabel}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm">{content.title}</h4>
                            {content.description && (
                              <p className="text-xs text-gray-500 mt-1">{content.description}</p>
                            )}
                          </div>
                        </div>
                        {onMarkAsDone && (
                          <div className="flex items-center space-x-2">
                            {isDone ? (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsDone(content._id);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Done
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsDone(content._id);
                                }}
                              >
                                Mark as done
                              </Button>
                            )}
                          </div>
                        )}
                        {content.deadline && content.type === 'Homework' && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs ml-2">
                            Deadline: {new Date(content.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{selectedContent?.title}</DialogTitle>
            <DialogDescription>
              {selectedContent?.description || 'Content preview'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContent && (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="w-full min-h-[400px] bg-gray-50 rounded-lg overflow-hidden">
                {renderFilePreview(selectedContent)}
              </div>

              {/* Content Info */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>{getContentTypeLabel(selectedContent.type)}</span>
                  </span>
                  {selectedContent.date && (
                    <span className="flex items-center space-x-1">
                      <span>Uploaded: {new Date(selectedContent.date).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
                
                <Button
                  onClick={() => handleDownload(selectedContent)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Homework Submission Dialog */}
      <Dialog open={isSubmissionOpen} onOpenChange={setIsSubmissionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedHomework?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedHomework?.description || 'Homework Assignment'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedHomework && (
            <div className="space-y-6">
              {/* Reference File Section */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Reference File</Label>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedHomework.title}</p>
                        <p className="text-sm text-gray-500">Reference material</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedHomework)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Deadline */}
              {selectedHomework.deadline && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <span className="font-semibold">Deadline:</span>{' '}
                    {new Date(selectedHomework.deadline).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Submission Status */}
              {existingSubmission && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Already Submitted</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Submitted on {new Date(existingSubmission.submittedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Submission Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="submissionLink" className="text-sm font-semibold text-gray-700">
                    Submission Link <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="submissionLink"
                      type="url"
                      placeholder="https://drive.google.com/file/..."
                      value={submissionLink}
                      onChange={(e) => setSubmissionLink(e.target.value)}
                      className="pl-10"
                      disabled={!!existingSubmission}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter a link to your completed homework (Google Drive, Dropbox, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submissionDescription" className="text-sm font-semibold text-gray-700">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="submissionDescription"
                    placeholder="Add any additional notes or comments about your submission..."
                    value={submissionDescription}
                    onChange={(e) => setSubmissionDescription(e.target.value)}
                    rows={4}
                    disabled={!!existingSubmission}
                  />
                </div>

                {existingSubmission && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Your Submission:</span>{' '}
                      <a
                        href={existingSubmission.submissionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {existingSubmission.submissionLink}
                      </a>
                    </p>
                    {existingSubmission.description && (
                      <p className="text-sm text-blue-700 mt-2">
                        <span className="font-semibold">Description:</span>{' '}
                        {existingSubmission.description}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSubmissionOpen(false);
                      setSelectedHomework(null);
                    }}
                  >
                    {existingSubmission ? 'Close' : 'Cancel'}
                  </Button>
                  {!existingSubmission && (
                    <Button
                      onClick={handleSubmitHomework}
                      disabled={isSubmitting || !submissionLink.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit & Mark as Done
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

