import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  ChevronRight,
  File,
  FileText,
  Headphones,
  Loader2,
  Plus,
  Trash2,
  Video,
  Edit
} from 'lucide-react';

interface SubjectItem {
  _id: string;
  name: string;
  description?: string;
  code?: string;
  board: string;
  classNumber?: string;
  stateName?: string;
  isActive?: boolean;
}

type ContentType =
  | 'TextBook'
  | 'Workbook'
  | 'Material'
  | 'Video'
  | 'Audio'
  | 'Homework';

interface ContentItem {
  _id: string;
  title: string;
  description?: string;
  type: ContentType;
  board: string;
  stateName?: string;
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
  thumbnail?: string;
  videoThumbnail?: string;
  previewImage?: string;
  image?: string;
  duration?: number;
  createdAt: string;
}

const BOARD_CODE = 'ASLI_EXCLUSIVE_SCHOOLS';

type SyllabusBoard = 'ASLI_EXCLUSIVE_SCHOOLS' | 'CBSE' | 'STATE';

const SYLLABUS_OPTIONS: { value: SyllabusBoard; label: string }[] = [
  { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'ASLI Exclusive Schools' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'STATE', label: 'State' },
];

const INDIAN_STATE_OPTIONS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

function syllabusLabel(board: string): string {
  const o = SYLLABUS_OPTIONS.find((x) => x.value === board);
  return o?.label ?? board;
}

const PRIMARY_CONTENT_TYPES: ContentType[] = [
  'TextBook',
  'Workbook',
  'Video',
  'Audio',
];

const extractClassNumberFromSubjectName = (name: string): string | null => {
  const match = name.match(/_(\d+)$/);
  return match ? match[1] : null;
};

const extractPlainSubjectName = (name: string): string => {
  const match = name.match(/^(.+?)_\d+$/);
  return match ? match[1] : name;
};

/** Prefer content.classNumber; else derive from linked subject (matches selected class in UI). */
function effectiveContentClass(
  item: ContentItem,
  subjects: SubjectItem[]
): string | null {
  if (item.classNumber != null && String(item.classNumber).trim() !== '') {
    return String(item.classNumber).trim();
  }
  const sid = item.subject?._id;
  if (!sid) return null;
  const subj = subjects.find((s) => String(s._id) === String(sid));
  if (!subj) return null;
  if (subj.classNumber != null && String(subj.classNumber).trim() !== '') {
    return String(subj.classNumber).trim();
  }
  return extractClassNumberFromSubjectName(subj.name);
}

const getContentTypeIcon = (type: ContentType) => {
  switch (type) {
    case 'Video':
      return Video;
    case 'Audio':
      return Headphones;
    case 'TextBook':
      return FileText;
    case 'Workbook':
    case 'Material':
    case 'Homework':
      return File;
    default:
      return File;
  }
};

const isUploadType = (type: ContentType) =>
  type === 'TextBook' ||
  type === 'Workbook' ||
  type === 'Material' ||
  type === 'Audio' ||
  type === 'Homework';

const isPdfUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.endsWith('.pdf') || lower.includes('.pdf');
};

const getUploadAcceptForContentType = (type: ContentType): string => {
  if (type === 'Video') {
    return 'video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,video/x-matroska';
  }
  if (type === 'Audio') {
    return 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac';
  }
  return '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
};

const isServerHostedFileUrl = (url: string): boolean => {
  const trimmed = url.trim();
  return (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith(`${API_BASE_URL}/uploads/`)
  );
};

const normalizeMediaUrl = (value?: string | null): string | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/uploads/')) return `${API_BASE_URL}${trimmed}`;
  return trimmed;
};

export default function SubjectContentManagement() {
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSyllabus, setNewSubjectSyllabus] = useState<SyllabusBoard>('ASLI_EXCLUSIVE_SCHOOLS');
  const [newSubjectStateName, setNewSubjectStateName] = useState('');
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectSyllabus, setEditSubjectSyllabus] = useState<SyllabusBoard>('ASLI_EXCLUSIVE_SCHOOLS');
  const [editSubjectStateName, setEditSubjectStateName] = useState('');

  const [isAddContentOpen, setIsAddContentOpen] = useState(false);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    type: 'Video' as ContentType,
    date: '',
    fileUrl: '',
  });
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [isSavingSubject, setIsSavingSubject] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<string | null>(null);
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load subjects and content as soon as the page mounts
    fetchSubjects();
    fetchContents();
  }, []);

  // Unique class labels derived from subject data, e.g. "Class 6"
  const classOptions = useMemo(() => {
    const classSet = new Set<string>();
    subjects.forEach((subj) => {
      // Prefer explicit classNumber if present
      if (subj.classNumber) {
        classSet.add(`Class ${subj.classNumber}`);
        return;
      }
      // Fallback: derive from subject.name suffix (e.g. "Chemistry_10")
      const classNum = extractClassNumberFromSubjectName(subj.name);
      if (classNum) {
        classSet.add(`Class ${classNum}`);
      }
    });
    return Array.from(classSet).sort((a, b) => {
      const aNum = parseInt(a.replace('Class ', ''), 10);
      const bNum = parseInt(b.replace('Class ', ''), 10);
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) return a.localeCompare(b);
      return aNum - bNum;
    });
  }, [subjects]);

  const [selectedClassLabel, setSelectedClassLabel] = useState<string | null>(null);

  // When subjects load, auto-select first class (for auto page load UX)
  useEffect(() => {
    if (!selectedClassLabel && classOptions.length > 0) {
      setSelectedClassLabel(classOptions[0]);
    }
  }, [classOptions, selectedClassLabel]);

  const selectedClassNumber =
    selectedClassLabel?.startsWith('Class ')
      ? selectedClassLabel.replace('Class ', '')
      : '';

  const filteredSubjects = useMemo(() => {
    if (!selectedClassNumber) return [];
    return subjects.filter((subj) => {
      if (subj.classNumber && subj.classNumber === selectedClassNumber) return true;
      const fromName = extractClassNumberFromSubjectName(subj.name);
      return fromName === selectedClassNumber;
    });
  }, [subjects, selectedClassNumber]);

  const filteredContents = useMemo(() => {
    if (!selectedSubjectId || !selectedClassNumber) return [];

    const selectedSubject = subjects.find((s) => s._id === selectedSubjectId);
    if (!selectedSubject) return [];

    const selectedPlain = extractPlainSubjectName(selectedSubject.name).toLowerCase();

    return contents.filter((item) => {
      const effClass = effectiveContentClass(item, subjects);
      if (effClass !== selectedClassNumber) return false;

      if (String(item.subject?._id) === String(selectedSubjectId)) return true;

      const itemPlain = item.subject?.name
        ? extractPlainSubjectName(item.subject.name).toLowerCase()
        : '';
      return itemPlain === selectedPlain;
    });
  }, [contents, selectedSubjectId, selectedClassNumber, subjects]);

  /** Subject that owns the content in Add/Edit Content dialog (syllabus/state always follow this). */
  const linkedSubjectForContent = useMemo((): SubjectItem | null => {
    if (!isAddContentOpen) return null;
    if (editingContentId) {
      const c = contents.find((x) => x._id === editingContentId);
      const sid = c?.subject?._id;
      if (!sid) return null;
      return subjects.find((s) => String(s._id) === String(sid)) ?? null;
    }
    if (!selectedSubjectId) return null;
    return subjects.find((s) => String(s._id) === String(selectedSubjectId)) ?? null;
  }, [isAddContentOpen, editingContentId, contents, subjects, selectedSubjectId]);

  const contentSections = useMemo(() => {
    const sections: { title: string; items: ContentItem[] }[] = [
      {
        title: 'Textbooks',
        items: filteredContents.filter((c) => c.type === 'TextBook'),
      },
      {
        title: 'Workbooks',
        items: filteredContents.filter((c) => c.type === 'Workbook'),
      },
      {
        title: 'Videos',
        items: filteredContents.filter((c) => c.type === 'Video'),
      },
      {
        title: 'Audio',
        items: filteredContents.filter((c) => c.type === 'Audio'),
      },
    ];
    const other = filteredContents.filter(
      (c) => !PRIMARY_CONTENT_TYPES.includes(c.type)
    );
    if (other.length > 0) {
      sections.push({ title: 'Other', items: other });
    }
    return sections.filter((s) => s.items.length > 0);
  }, [filteredContents]);

  const fetchSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/subjects`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setSubjects(data.data);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load subjects',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subjects',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const fetchContents = async () => {
    setIsLoadingContents(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/super-admin/boards/${BOARD_CODE}/content`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setContents(data.data);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load content',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch contents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load content',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingContents(false);
    }
  };

  const handleOpenAddSubject = () => {
    if (!selectedClassNumber) {
      toast({
        title: 'Select a class',
        description: 'Please select a class before adding a subject.',
        variant: 'destructive',
      });
      return;
    }
    setNewSubjectName('');
    setNewSubjectSyllabus('ASLI_EXCLUSIVE_SCHOOLS');
    setNewSubjectStateName('');
    setIsAddSubjectOpen(true);
  };

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim() || !selectedClassNumber) {
      toast({
        title: 'Validation error',
        description: 'Subject name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (newSubjectSyllabus === 'STATE' && !newSubjectStateName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Select a state for State syllabus.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingSubject(true);
    try {
      const token = localStorage.getItem('authToken');
      const storedName = `${newSubjectName.trim()}_${selectedClassNumber}`;
      const body: Record<string, string> = {
        name: storedName,
        board: newSubjectSyllabus,
      };
      if (newSubjectSyllabus === 'STATE') {
        body.stateName = newSubjectStateName.trim();
      }

      const response = await fetch(`${API_BASE_URL}/api/super-admin/subjects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        toast({
          title: 'Subject created',
          description: 'Subject added successfully under the selected class.',
        });
        setIsAddSubjectOpen(false);
        await fetchSubjects();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create subject',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to create subject',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleOpenEditSubject = (subject: SubjectItem) => {
    const classNum = subject.classNumber || extractClassNumberFromSubjectName(subject.name);
    if (classNum) {
      setSelectedClassLabel(`Class ${classNum}`);
    }
    setEditingSubject(subject);
    setEditSubjectName(extractPlainSubjectName(subject.name));
    const b = (subject.board || BOARD_CODE).toUpperCase() as SyllabusBoard;
    setEditSubjectSyllabus(
      b === 'CBSE' || b === 'STATE' || b === 'ASLI_EXCLUSIVE_SCHOOLS' ? b : 'ASLI_EXCLUSIVE_SCHOOLS'
    );
    setEditSubjectStateName(subject.stateName?.trim() || '');
    setIsEditSubjectOpen(true);
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !editSubjectName.trim() || !selectedClassNumber) {
      toast({
        title: 'Validation error',
        description: 'Subject name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (editSubjectSyllabus === 'STATE' && !editSubjectStateName.trim()) {
      toast({
        title: 'Validation error',
        description: 'Select a state for State syllabus.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingSubject(true);
    try {
      const token = localStorage.getItem('authToken');
      const storedName = `${editSubjectName.trim()}_${selectedClassNumber}`;
      const response = await fetch(
        `${API_BASE_URL}/api/super-admin/subjects/${editingSubject._id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: storedName,
            classNumber: selectedClassNumber,
            board: editSubjectSyllabus,
            ...(editSubjectSyllabus === 'STATE'
              ? { stateName: editSubjectStateName.trim() }
              : { stateName: '' }),
          }),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        toast({ title: 'Subject updated', description: 'Subject updated successfully.' });
        setIsEditSubjectOpen(false);
        setEditingSubject(null);
        await fetchSubjects();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to update subject',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to update subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to update subject',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Delete this subject and all its content?')) return;
    setDeletingSubjectId(subjectId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/super-admin/subjects/${subjectId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast({
          title: 'Subject deleted',
          description: 'Subject and related content deleted successfully.',
        });
        if (selectedSubjectId === subjectId) {
          setSelectedSubjectId(null);
        }
        await fetchSubjects();
        await fetchContents();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete subject',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete subject:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subject',
        variant: 'destructive',
      });
    } finally {
      setDeletingSubjectId(null);
    }
  };

  const handleOpenAddContent = () => {
    if (!selectedSubjectId || !selectedClassNumber) {
      toast({
        title: 'Select subject',
        description: 'Please select a subject before adding content.',
        variant: 'destructive',
      });
      return;
    }
    setContentForm({
      title: '',
      description: '',
      type: 'Video',
      date: '',
      fileUrl: '',
    });
    setEditingContentId(null);
    setIsAddContentOpen(true);
  };

  const handleOpenEditContent = (content: ContentItem) => {
    setEditingContentId(content._id);
    setContentForm({
      title: content.title || '',
      description: content.description || '',
      type: content.type,
      date: new Date(content.date || content.createdAt).toISOString().slice(0, 10),
      fileUrl: content.fileUrl || '',
    });
    setSelectedUploadFile(null);
    setIsAddContentOpen(true);
  };

  const handleSaveContent = async () => {
    const editingItem = editingContentId
      ? contents.find((c) => c._id === editingContentId)
      : null;
    const subjectIdForValidation =
      editingItem?.subject?._id != null
        ? String(editingItem.subject._id)
        : selectedSubjectId;

    if (
      !subjectIdForValidation ||
      !contentForm.title.trim() ||
      !contentForm.fileUrl.trim() ||
      (!editingContentId && !String(contentForm.type || '').trim())
    ) {
      toast({
        title: 'Validation error',
        description: editingContentId
          ? 'Title and file/video URL are required.'
          : 'Title, type, file/video URL, class and subject are required.',
        variant: 'destructive',
      });
      return;
    }

    if (!editingContentId && !selectedClassNumber) {
      toast({
        title: 'Validation error',
        description: 'Select a class before adding content.',
        variant: 'destructive',
      });
      return;
    }

    if (!isServerHostedFileUrl(contentForm.fileUrl)) {
      toast({
        title: 'Upload required',
        description:
          'Please upload the file first. Only DigitalOcean server files (/uploads/...) are allowed.',
        variant: 'destructive',
      });
      return;
    }

    const subj = subjects.find((s) => String(s._id) === String(subjectIdForValidation));
    if (!subj) {
      toast({
        title: 'Validation error',
        description: 'Subject not found. Please select a subject again.',
        variant: 'destructive',
      });
      return;
    }
    const subBoard = (subj.board || BOARD_CODE).toUpperCase() as SyllabusBoard;
    const normalizedSubBoard: SyllabusBoard =
      subBoard === 'CBSE' || subBoard === 'STATE' || subBoard === 'ASLI_EXCLUSIVE_SCHOOLS'
        ? subBoard
        : 'ASLI_EXCLUSIVE_SCHOOLS';
    if (normalizedSubBoard === 'STATE' && !(subj.stateName || '').trim()) {
      toast({
        title: 'Subject incomplete',
        description:
          'This subject uses State syllabus but has no state set. Edit the subject and choose a state first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingContent(true);
    try {
      const token = localStorage.getItem('authToken');
      const classForPayload =
        selectedClassNumber ||
        (editingItem
          ? String(
              editingItem.classNumber ||
                effectiveContentClass(editingItem, subjects) ||
                ''
            )
          : '');
      if (!classForPayload) {
        toast({
          title: 'Validation error',
          description: 'Could not determine class for this content.',
          variant: 'destructive',
        });
        setIsSavingContent(false);
        return;
      }
      const body: Record<string, unknown> = {
        title: contentForm.title.trim(),
        description: contentForm.description?.trim() || undefined,
        fileUrl: contentForm.fileUrl.trim(),
        classNumber: classForPayload,
      };
      if (contentForm.date?.trim()) {
        body.date = contentForm.date.trim();
      }
      if (!editingContentId) {
        body.type = contentForm.type;
        body.board = normalizedSubBoard;
        body.subject = selectedSubjectId;
        body.stateName =
          normalizedSubBoard === 'STATE' ? String(subj.stateName || '').trim() : '';
      } else {
        body.board = normalizedSubBoard;
        body.stateName =
          normalizedSubBoard === 'STATE' ? String(subj.stateName || '').trim() : '';
      }

      const response = await fetch(
        editingContentId
          ? `${API_BASE_URL}/api/super-admin/content/${editingContentId}`
          : `${API_BASE_URL}/api/super-admin/content`,
        {
        method: editingContentId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        toast({
          title: editingContentId ? 'Content updated' : 'Content added',
          description: editingContentId
            ? 'Content updated successfully.'
            : 'Content added successfully under the selected subject.',
        });
        setIsAddContentOpen(false);
        setEditingContentId(null);
        await fetchContents();
      } else {
        toast({
          title: 'Error',
          description: data.message || `Failed to ${editingContentId ? 'update' : 'add'} content`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingContentId ? 'update' : 'add'} content`,
        variant: 'destructive',
      });
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleUploadContentFile = async () => {
    if (!selectedUploadFile) {
      toast({
        title: 'Select a file',
        description: 'Please choose a file to upload first.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingFile(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      // Append non-file fields first so multipart parsers often populate req.body before the file part.
      formData.append('contentType', contentForm.type);
      formData.append('file', selectedUploadFile);

      const response = await fetch(
        `${API_BASE_URL}/api/super-admin/content/upload-file?contentType=${encodeURIComponent(
          contentForm.type
        )}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const rawText = await response.text().catch(() => '');
      let data: { success?: boolean; message?: string; fileUrl?: string; code?: string } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (response.ok && data.success && typeof data.fileUrl === 'string') {
        setContentForm((prev) => ({ ...prev, fileUrl: data.fileUrl }));
        setSelectedUploadFile(null);
        toast({
          title: 'Uploaded',
          description: 'File uploaded successfully. You can now save the content.',
        });
      } else {
        const nginxHint =
          response.status === 413
            ? ' Request too large for reverse proxy (nginx: raise client_max_body_size).'
            : '';
        toast({
          title: 'Upload failed',
          description: (data.message || response.statusText || 'Failed to upload file') + nginxHint,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const uploadUrl = `${API_BASE_URL}/api/super-admin/content/upload-file`;
      console.error('Failed to upload content file:', error, { uploadUrl });
      const msg = error instanceof Error ? error.message : String(error);
      const looksLikeDroppedConnection =
        msg.includes('fetch') ||
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('Load failed') ||
        msg.includes('aborted');
      toast({
        title: 'Upload failed',
        description: looksLikeDroppedConnection
          ? 'The request never got a normal response—usually nginx default 1MB body limit or a short proxy timeout. On the server that serves api.aslilearn.ai: set client_max_body_size 100m; proxy_read_timeout 300s; reload nginx. Redeploy the frontend after git pull if you still see an old message.'
          : `Upload error: ${msg}. If this only happens in production with large files, raise nginx client_max_body_size (see server docs).`,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!window.confirm('Delete this content item?')) return;
    setDeletingContentId(contentId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/super-admin/content/${contentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast({
          title: 'Content deleted',
          description: 'Content deleted successfully.',
        });
        await fetchContents();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete content',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete content',
        variant: 'destructive',
      });
    } finally {
      setDeletingContentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Subject &amp; Content Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage subjects and learning content by class in one place.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Row 1: Classes | Subjects */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px,minmax(0,1fr)] gap-5">
          {/* Left: Classes */}
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Classes</span>
              {isLoadingSubjects && <Loader2 className="w-4 h-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classOptions.length === 0 && !isLoadingSubjects ? (
              <p className="text-sm text-gray-500">
                No classes found yet. Create a subject first to populate classes.
              </p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
                {classOptions.map((label) => {
                  const isActive = label === selectedClassLabel;
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        setSelectedClassLabel(label);
                        setSelectedSubjectId(null);
                      }}
                      className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-sky-400 bg-sky-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{label}</div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
          </Card>

          {/* Right: Subjects under Class */}
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Subjects under Class</CardTitle>
              <p className="text-sm text-gray-500">
                {selectedClassLabel
                  ? `Showing subjects for ${selectedClassLabel}`
                  : 'Select a class to see subjects.'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAddSubject}
              disabled={!selectedClassNumber}
              className="bg-gradient-to-r from-orange-400 to-sky-400 hover:from-orange-500 hover:to-sky-500 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Subject
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingSubjects ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !selectedClassNumber ? (
              <p className="text-sm text-gray-500">
                Select a class from the left to view its subjects.
              </p>
            ) : filteredSubjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No subjects found for this class. Use &quot;Add Subject&quot; to
                create one.
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
                {filteredSubjects.map((subj) => {
                  const isActive = selectedSubjectId === subj._id;
                  const Icon = BookOpen;
                  return (
                    <div
                      key={subj._id}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                        isActive
                          ? 'border-sky-400 bg-sky-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => setSelectedSubjectId(subj._id)}
                      >
                        <div className="p-2 rounded-md bg-sky-100 text-sky-700">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {extractPlainSubjectName(subj.name)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {syllabusLabel(subj.board)}
                            </Badge>
                            {subj.board === 'STATE' && subj.stateName && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                {subj.stateName}
                              </Badge>
                            )}
                          </div>
                          {subj.description && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {subj.description}
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditSubject(subj)}
                          className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                          title="Edit subject"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSubject(subj._id)}
                          disabled={deletingSubjectId === subj._id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {deletingSubjectId === subj._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          </Card>
        </div>

        {/* Row 2: Content under Subject (full width) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Content under Subject</CardTitle>
              <p className="text-sm text-gray-500">
                {selectedSubjectId
                  ? 'Content items linked to the selected subject.'
                  : 'Select a subject to see its content.'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAddContent}
              disabled={!selectedSubjectId || !selectedClassNumber}
              className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Content
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingContents ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !selectedSubjectId ? (
              <p className="text-sm text-gray-500">Select a subject to view content.</p>
            ) : filteredContents.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No content found for this subject. Use &quot;Add Content&quot; to
                create one.
              </div>
            ) : (
              <div className="space-y-10">
                {contentSections.map((section) => (
                  <div key={section.title} className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      {section.title}
                    </h3>
                    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                      {section.items.map((content) => {
                        const Icon = getContentTypeIcon(content.type);
                        const subjectLabel = content.subject?.name
                          ? extractPlainSubjectName(content.subject.name)
                          : '';
                        const isTimedMedia =
                          content.type === 'Video' || content.type === 'Audio';
                        const durationLabel =
                          isTimedMedia && content.duration && content.duration > 0
                            ? `${content.duration} mins`
                            : null;

                        const thumbnailSrcRaw =
                          content.thumbnailUrl ||
                          content.thumbnail ||
                          content.videoThumbnail ||
                          content.previewImage ||
                          content.image ||
                          null;
                        const thumbnailSrc = normalizeMediaUrl(thumbnailSrcRaw);
                        const hasBrokenThumbnail = failedThumbnailIds.has(content._id);

                        const fileUrl =
                          normalizeMediaUrl(content.fileUrl) || content.fileUrl;

                        const showPdfPreview =
                          (!thumbnailSrc || hasBrokenThumbnail) && isPdfUrl(fileUrl);

                        return (
                          <div
                            key={content._id}
                            className="group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
                          >
                            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-sky-300 to-teal-400 flex items-center justify-center">
                              {thumbnailSrc && !hasBrokenThumbnail ? (
                                <img
                                  src={thumbnailSrc}
                                  alt={content.title}
                                  className="w-full h-full object-cover"
                                  onError={() => {
                                    setFailedThumbnailIds((prev) => {
                                      const next = new Set(prev);
                                      next.add(content._id);
                                      return next;
                                    });
                                  }}
                                />
                              ) : showPdfPreview ? (
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                  <FileText className="w-8 h-8 text-sky-500" />
                                </div>
                              ) : content.type === 'Video' ? (
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                  <Video className="w-8 h-8 text-sky-500" />
                                </div>
                              ) : content.type === 'Audio' ? (
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                  <Headphones className="w-8 h-8 text-sky-500" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                  <Icon className="w-7 h-7 text-sky-500" />
                                </div>
                              )}
                              {durationLabel && (
                                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/70 text-white text-xs">
                                  {durationLabel}
                                </div>
                              )}
                            </div>

                            <div className="p-4 flex-1 flex flex-col space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                                  {content.title}
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                {subjectLabel && (
                                  <Badge
                                    variant="outline"
                                    className="border-sky-200 bg-sky-50 text-sky-700"
                                  >
                                    {subjectLabel}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] font-normal">
                                  {syllabusLabel(content.board)}
                                </Badge>
                                {content.board === 'STATE' && content.stateName && (
                                  <Badge variant="secondary" className="text-[10px] font-normal">
                                    {content.stateName}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className="border-gray-200 bg-gray-50 text-gray-700"
                                >
                                  {content.type}
                                </Badge>
                                <span>
                                  {new Date(
                                    content.date || content.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              {content.topic && (
                                <p className="text-xs text-gray-600 line-clamp-1">
                                  Topic: {content.topic}
                                </p>
                              )}
                              {content.description && (
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {content.description}
                                </p>
                              )}

                              <div className="mt-3 flex items-center justify-between">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() =>
                                    window.open(fileUrl, '_blank', 'noopener,noreferrer')
                                  }
                                >
                                  View
                                </Button>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenEditContent(content)}
                                    className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                                    title="Edit content"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteContent(content._id)}
                                    disabled={deletingContentId === content._id}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    {deletingContentId === content._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>
              Create a new subject under the selected class. The class is auto
              selected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class</Label>
              <Input value={selectedClassLabel ?? ''} disabled />
            </div>
            <div>
              <Label>Syllabus</Label>
              <Select
                value={newSubjectSyllabus}
                onValueChange={(v) => {
                  const next = v as SyllabusBoard;
                  setNewSubjectSyllabus(next);
                  if (next !== 'STATE') setNewSubjectStateName('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select syllabus" />
                </SelectTrigger>
                <SelectContent>
                  {SYLLABUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newSubjectSyllabus === 'STATE' && (
              <div>
                <Label>State name</Label>
                <Select
                  value={newSubjectStateName || undefined}
                  onValueChange={(v) => setNewSubjectStateName(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Subject Name</Label>
              <Input
                placeholder="e.g., Mathematics"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSubjectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveSubject}
                disabled={isSavingSubject}
                className="bg-gradient-to-r from-orange-400 to-sky-400 hover:from-orange-500 hover:to-sky-500 text-white"
              >
                {isSavingSubject && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSubjectOpen} onOpenChange={setIsEditSubjectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update syllabus, state (if applicable), and subject name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Class</Label>
              <Input value={selectedClassLabel ?? ''} disabled />
            </div>
            <div>
              <Label>Syllabus</Label>
              <Select
                value={editSubjectSyllabus}
                onValueChange={(v) => {
                  const next = v as SyllabusBoard;
                  setEditSubjectSyllabus(next);
                  if (next !== 'STATE') setEditSubjectStateName('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select syllabus" />
                </SelectTrigger>
                <SelectContent>
                  {SYLLABUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editSubjectSyllabus === 'STATE' && (
              <div>
                <Label>State name</Label>
                <Select
                  value={editSubjectStateName || undefined}
                  onValueChange={(v) => setEditSubjectStateName(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Subject Name</Label>
              <Input
                placeholder="e.g., Mathematics"
                value={editSubjectName}
                onChange={(e) => setEditSubjectName(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditSubjectOpen(false);
                  setEditingSubject(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateSubject}
                disabled={isSavingSubject}
                className="bg-gradient-to-r from-orange-400 to-sky-400 hover:from-orange-500 hover:to-sky-500 text-white"
              >
                {isSavingSubject && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddContentOpen} onOpenChange={setIsAddContentOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContentId ? 'Edit Content' : 'Add Content'}</DialogTitle>
            <DialogDescription>
              {editingContentId
                ? 'Update content details for the selected subject.'
                : 'Upload or link learning content for the selected subject. Class and subject are auto selected.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Class <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input value={selectedClassLabel ?? ''} disabled />
              </div>
              <div>
                <Label>
                  Subject <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  value={
                    linkedSubjectForContent
                      ? extractPlainSubjectName(linkedSubjectForContent.name)
                      : ''
                  }
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div>
              <Label>Syllabus</Label>
              <Input
                value={
                  linkedSubjectForContent
                    ? syllabusLabel(linkedSubjectForContent.board)
                    : '—'
                }
                disabled
                className="bg-muted/50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Matches this subject&apos;s syllabus (set when you created or edited the subject).
              </p>
            </div>
            {linkedSubjectForContent?.board === 'STATE' && (
              <div>
                <Label>State name</Label>
                <Input
                  value={linkedSubjectForContent.stateName?.trim() || '—'}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            )}
            <div>
              <Label>
                Content Title <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                value={contentForm.title}
                onChange={(e) =>
                  setContentForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Algebra Basics - Part 1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={contentForm.description}
                onChange={(e) =>
                  setContentForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Short description for this content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Type <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Select
                  value={contentForm.type}
                  onValueChange={(value: ContentType) =>
                    setContentForm((prev) => ({ ...prev, type: value, fileUrl: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="TextBook">TextBook</SelectItem>
                    <SelectItem value="Workbook">Workbook</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                    <SelectItem value="Homework">Homework</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Date{' '}
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </Label>
                <Input
                  type="date"
                  value={contentForm.date}
                  onChange={(e) =>
                    setContentForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>
                Upload File (saved on DigitalOcean server){' '}
                <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="file"
                    accept={
                      isUploadType(contentForm.type)
                        ? getUploadAcceptForContentType(contentForm.type)
                        : 'video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,video/x-matroska'
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedUploadFile(file);
                    }}
                    className="cursor-pointer text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUploadContentFile}
                    disabled={isUploadingFile || !selectedUploadFile}
                  >
                    {isUploadingFile ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading
                      </span>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </div>
                <p className={`text-xs ${selectedUploadFile ? 'text-orange-700 font-medium' : 'text-gray-500'}`}>
                  {selectedUploadFile ? `Selected file: ${selectedUploadFile.name}` : 'No file selected yet'}
                </p>
                <Input
                  value={contentForm.fileUrl}
                  readOnly
                  placeholder="Uploaded file path will appear here (/uploads/...)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddContentOpen(false);
                  setEditingContentId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveContent}
                disabled={isSavingContent}
                className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white"
              >
                {isSavingContent && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingContentId ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

