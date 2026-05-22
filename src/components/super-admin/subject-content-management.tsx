import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL, getEmbeddedPdfIframeSrc, isOurBackendPdfUrl } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import {
  getCurriculumClassLabels,
  saveCurriculumClass,
} from '@/lib/super-admin-curriculum-classes';
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
  Edit,
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

/** Section order for content cards (every type gets its own heading; avoids mis-labelling Material/Homework as "Other"). */
const CONTENT_TYPE_SECTIONS: { title: string; types: ContentType[] }[] = [
  { title: 'Textbooks', types: ['TextBook'] },
  { title: 'Workbooks', types: ['Workbook'] },
  { title: 'Materials', types: ['Material'] },
  { title: 'Homework', types: ['Homework'] },
  { title: 'Videos', types: ['Video'] },
  { title: 'Audio', types: ['Audio'] },
];

const extractClassNumberFromSubjectName = (name: string): string | null => {
  const match = name.match(/_(\d+)$/);
  return match ? match[1] : null;
};

const extractPlainSubjectName = (name: string): string => {
  const match = name.match(/^(.+?)_\d+$/);
  return match ? match[1] : name;
};

/** Compare class numbers consistently ("8", "08", Class 8). */
function normalizeClassNumber(value: string | null | undefined): string {
  const trimmed = value != null ? String(value).trim() : '';
  if (!trimmed) return '';
  const parsed = parseInt(trimmed, 10);
  if (!Number.isNaN(parsed)) return String(parsed);
  return trimmed;
}

function isValidGradeClassNumber(value: string | null | undefined): boolean {
  const n = normalizeClassNumber(value);
  if (!n) return false;
  const parsed = parseInt(n, 10);
  return !Number.isNaN(parsed) && parsed >= 1 && parsed <= 12;
}

function getContentSubjectId(item: ContentItem): string | null {
  const subj = item.subject as { _id?: string } | string | null | undefined;
  if (!subj) return null;
  if (typeof subj === 'string') return subj;
  return subj._id ? String(subj._id) : null;
}

function inferSubjectLabelFromContent(item: ContentItem): string {
  const text = `${item.title || ''} ${item.description || ''} ${item.topic || ''}`.toLowerCase();
  if (/ganita|mathematics|maths|\bmath\b/.test(text)) return 'Mathematics';
  if (/science|curiosity|physics|chemistry|biology/.test(text)) return 'Science';
  if (/english/.test(text)) return 'English';
  if (/social|history|geography/.test(text)) return 'Social Studies';
  if (/hindi/.test(text)) return 'Hindi';
  if (/telugu/.test(text)) return 'Telugu';
  const fromTitle = String(item.title || '')
    .replace(/\s+(vol\s*\d+\s*)?class\s*\d+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return fromTitle || 'General';
}

function isCatalogSubjectId(id: string | null, catalog: SubjectItem[]): boolean {
  if (!id || id.startsWith('inferred-')) return false;
  return catalog.some((s) => String(s._id) === String(id));
}

/** Prefer content.classNumber; else derive from linked subject (matches selected class in UI). */
function effectiveContentClass(
  item: ContentItem,
  subjects: SubjectItem[]
): string | null {
  if (item.classNumber != null && String(item.classNumber).trim() !== '') {
    return normalizeClassNumber(item.classNumber);
  }
  const sid = item.subject?._id;
  if (!sid) return null;
  const subj = subjects.find((s) => String(s._id) === String(sid));
  if (!subj) return null;
  if (subj.classNumber != null && String(subj.classNumber).trim() !== '') {
    return normalizeClassNumber(subj.classNumber);
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

const isHttpUrl = (url: string): boolean => {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Video: external URL only. Audio: URL or upload. Other types: upload only. */
function isValidContentSourceUrl(url: string, type: ContentType): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (type === 'Video') return isHttpUrl(trimmed);
  if (type === 'Audio') return isServerHostedFileUrl(trimmed) || isHttpUrl(trimmed);
  return isServerHostedFileUrl(trimmed);
}

const normalizeMediaUrl = (value?: string | null): string | null => {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/uploads/')) return `${API_BASE_URL}${trimmed}`;
  return trimmed;
};

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) return match[2];
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/);
  return match ? match[1] : null;
}

function isImageFileUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
}

type ContentCardPreview =
  | { kind: 'image'; src: string }
  | { kind: 'pdf'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'icon'; contentType: ContentType };

function resolveContentCardPreview(content: ContentItem, fileUrl: string): ContentCardPreview {
  const storedRaw =
    content.thumbnailUrl ||
    content.thumbnail ||
    content.videoThumbnail ||
    content.previewImage ||
    content.image;
  const stored = normalizeMediaUrl(storedRaw);
  if (stored) return { kind: 'image', src: stored };

  const url = normalizeMediaUrl(fileUrl) || String(fileUrl || '').trim();
  if (!url) return { kind: 'icon', contentType: content.type };

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return { kind: 'image', src: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return { kind: 'image', src: `https://vumbnail.com/${vimeoId}.jpg` };
  }

  if (isImageFileUrl(url)) return { kind: 'image', src: url };

  if (isPdfUrl(url)) {
    const pdfSrc = isOurBackendPdfUrl(url)
      ? url
      : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return { kind: 'pdf', src: pdfSrc };
  }

  if (
    (content.type === 'Video' || content.type === 'Audio') &&
    /\.(mp4|webm|ogg|m4a|mp3|wav)(\?|#|$)/i.test(url)
  ) {
    return { kind: 'video', src: url };
  }

  return { kind: 'icon', contentType: content.type };
}

/** YouTube / Vimeo URLs must use an iframe; <video src> cannot play them. */
function getStreamingEmbedSrc(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}`;
      const embed = u.pathname.match(/\/embed\/([^/?]+)/);
      if (embed?.[1]) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embed[1])}`;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts?.[1]) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(shorts[1])}`;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function SubjectContentManagement() {
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassNumber, setNewClassNumber] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');

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
  /** In-page preview instead of opening files in a new browser tab. */
  const [contentPreviewItem, setContentPreviewItem] = useState<ContentItem | null>(null);

  const contentPreviewUrl = useMemo(() => {
    if (!contentPreviewItem) return null;
    const u =
      normalizeMediaUrl(contentPreviewItem.fileUrl) || contentPreviewItem.fileUrl;
    const t = String(u || '').trim();
    return t ? t : null;
  }, [contentPreviewItem]);

  useEffect(() => {
    // Load subjects and content as soon as the page mounts
    fetchSubjects();
    fetchContents();
  }, []);

  // Class labels from subjects, linked content, and manual entries
  const classOptions = useMemo(() => {
    const classSet = new Set<string>();
    const addClassNum = (num: string | null | undefined) => {
      if (!isValidGradeClassNumber(num)) return;
      classSet.add(`Class ${normalizeClassNumber(num)}`);
    };

    subjects.forEach((subj) => {
      if (subj.classNumber) {
        addClassNum(subj.classNumber);
        return;
      }
      addClassNum(extractClassNumberFromSubjectName(subj.name));
    });

    contents.forEach((item) => {
      addClassNum(effectiveContentClass(item, subjects));
    });

    return Array.from(classSet).sort((a, b) => {
      const aNum = parseInt(a.replace('Class ', ''), 10);
      const bNum = parseInt(b.replace('Class ', ''), 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
  }, [subjects, contents]);

  const [selectedClassLabel, setSelectedClassLabel] = useState<string | null>(null);
  /** Classes added manually before any subject exists (unblocks first subject). */
  const [manualClassLabels, setManualClassLabels] = useState<string[]>([]);

  useEffect(() => {
    setManualClassLabels(getCurriculumClassLabels());
  }, []);

  const displayClassOptions = useMemo(() => {
    const merged = new Set([...classOptions, ...manualClassLabels]);
    return Array.from(merged).sort((a, b) => {
      const aNum = parseInt(a.replace('Class ', ''), 10);
      const bNum = parseInt(b.replace('Class ', ''), 10);
      if (Number.isNaN(aNum) || Number.isNaN(bNum)) return a.localeCompare(b);
      return aNum - bNum;
    });
  }, [classOptions, manualClassLabels]);

  // When subjects load, auto-select first class (for auto page load UX)
  useEffect(() => {
    if (!selectedClassLabel && displayClassOptions.length > 0) {
      setSelectedClassLabel(displayClassOptions[0]);
    }
  }, [displayClassOptions, selectedClassLabel]);

  const selectedClassNumber = selectedClassLabel?.startsWith('Class ')
    ? normalizeClassNumber(selectedClassLabel.replace('Class ', ''))
    : '';

  /** Subjects from catalog + groups inferred from content (orphan / deleted subject refs). */
  const subjectsForClass = useMemo(() => {
    if (!selectedClassNumber) return [];
    const normClass = normalizeClassNumber(selectedClassNumber);
    const map = new Map<string, SubjectItem>();

    subjects.forEach((subj) => {
      const subjClass = subj.classNumber
        ? normalizeClassNumber(subj.classNumber)
        : normalizeClassNumber(extractClassNumberFromSubjectName(subj.name) || '');
      const linkedViaContent = contents.some((item) => {
        if (normalizeClassNumber(effectiveContentClass(item, subjects) || '') !== normClass) {
          return false;
        }
        const sid = getContentSubjectId(item);
        return sid != null && String(sid) === String(subj._id);
      });
      if (subjClass === normClass || linkedViaContent) {
        map.set(String(subj._id), subj);
      }
    });

    contents.forEach((item) => {
      if (normalizeClassNumber(effectiveContentClass(item, subjects) || '') !== normClass) {
        return;
      }
      const sid = getContentSubjectId(item);
      const label = item.subject?.name
        ? extractPlainSubjectName(item.subject.name)
        : inferSubjectLabelFromContent(item);
      const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const key =
        sid && subjects.some((s) => String(s._id) === String(sid))
          ? String(sid)
          : `inferred-${slug}`;
      if (!map.has(key)) {
        map.set(key, {
          _id: key,
          name: label,
          board: item.board || BOARD_CODE,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      extractPlainSubjectName(a.name).localeCompare(extractPlainSubjectName(b.name))
    );
  }, [subjects, selectedClassNumber, contents]);

  // Auto-select first subject when class changes or subject list loads
  useEffect(() => {
    if (!selectedClassNumber || subjectsForClass.length === 0) return;
    const stillValid = subjectsForClass.some(
      (s) => String(s._id) === String(selectedSubjectId)
    );
    if (!stillValid) {
      setSelectedSubjectId(subjectsForClass[0]._id);
    }
  }, [selectedClassNumber, subjectsForClass, selectedSubjectId]);

  const filteredContents = useMemo(() => {
    if (!selectedSubjectId || !selectedClassNumber) return [];

    const selectedRow = subjectsForClass.find((s) => String(s._id) === String(selectedSubjectId));
    const selectedPlain = selectedRow
      ? extractPlainSubjectName(selectedRow.name).toLowerCase()
      : '';

    return contents.filter((item) => {
      const effClass = effectiveContentClass(item, subjects);
      if (normalizeClassNumber(effClass || '') !== selectedClassNumber) return false;

      const sid = getContentSubjectId(item);
      if (sid && String(sid) === String(selectedSubjectId)) return true;
      if (String(item.subject?._id) === String(selectedSubjectId)) return true;

      const itemPlain = (
        item.subject?.name
          ? extractPlainSubjectName(item.subject.name)
          : inferSubjectLabelFromContent(item)
      ).toLowerCase();
      return selectedPlain !== '' && itemPlain === selectedPlain;
    });
  }, [contents, selectedSubjectId, selectedClassNumber, subjects, subjectsForClass]);

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
    const knownTypes = new Set(
      CONTENT_TYPE_SECTIONS.flatMap((s) => s.types)
    );
    const sections = CONTENT_TYPE_SECTIONS.map(({ title, types }) => ({
      title,
      items: filteredContents.filter((c) => types.includes(c.type)),
    }));
    const other = filteredContents.filter((c) => !knownTypes.has(c.type));
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

  const handleOpenAddClass = () => {
    setNewClassNumber('');
    setNewClassDescription('');
    setIsAddClassOpen(true);
  };

  const handleSaveClass = () => {
    const num = newClassNumber.trim().replace(/^class\s*/i, '');
    if (!num || !/^\d{1,2}$/.test(num)) {
      toast({
        title: 'Enter a class number',
        description: 'Use a number like 6, 7, 10, or 12.',
        variant: 'destructive',
      });
      return;
    }
    const label = `Class ${num}`;
    const alreadyListed =
      classOptions.includes(label) || manualClassLabels.includes(label);
    if (!alreadyListed) {
      const saved = saveCurriculumClass({
        classNumber: num,
        description: newClassDescription.trim(),
        label,
      });
      if (!saved) {
        toast({
          title: 'Class already exists',
          description: `${label} is already in the list.`,
          variant: 'destructive',
        });
        return;
      }
    }
    setManualClassLabels((prev) => (prev.includes(label) ? prev : [...prev, label]));
    setSelectedClassLabel(label);
    setSelectedSubjectId(null);
    setIsAddClassOpen(false);
    setNewClassNumber('');
    setNewClassDescription('');
    toast({
      title: 'Class added',
      description: `${label} selected. Use Add Subject to add subjects for this class.`,
    });
  };

  const handleOpenAddSubject = () => {
    if (!selectedClassNumber) {
      toast({
        title: 'Select a class',
        description: 'Add or select a class on the left before adding a subject.',
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

    if (!isValidContentSourceUrl(contentForm.fileUrl, contentForm.type)) {
      toast({
        title: contentForm.type === 'Video' ? 'Video source required' : 'Upload required',
        description:
          contentForm.type === 'Video'
            ? 'Enter a valid video URL (YouTube, Vimeo, or direct https link).'
            : contentForm.type === 'Audio'
              ? 'Enter an audio URL or upload a file to the server first.'
              : 'Please upload the file first. Only server files (/uploads/...) are allowed.',
        variant: 'destructive',
      });
      return;
    }

    const subj =
      subjects.find((s) => String(s._id) === String(subjectIdForValidation)) ??
      subjectsForClass.find((s) => String(s._id) === String(subjectIdForValidation));

    if (!subj || !isCatalogSubjectId(subjectIdForValidation, subjects)) {
      toast({
        title: 'Validation error',
        description:
          'Select a subject from your catalog (use Add Subject) before adding content. Content-only groups cannot be saved.',
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
        body.subject = subjectIdForValidation;
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
        const uploadedUrl = data.fileUrl;
        setContentForm((prev) => ({ ...prev, fileUrl: uploadedUrl }));
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Subject &amp; Content Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage subjects and learning content by class in one place.
          </p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Row 1: Classes | Subjects */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px,minmax(0,1fr)] gap-5">
          {/* Left: Classes */}
          <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>Classes</span>
                {isLoadingSubjects && <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />}
              </CardTitle>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAddClass}
              className="bg-gradient-to-r from-orange-400 to-sky-400 hover:from-orange-500 hover:to-sky-500 text-white shrink-0"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Add Class
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayClassOptions.length === 0 && !isLoadingSubjects ? (
              <p className="text-xs sm:text-sm text-gray-500 py-4 text-center">
                No classes yet. Click <strong>Add Class</strong> above to create a grade
                level, then use <strong>Add Subject</strong> on the right.
              </p>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
                {displayClassOptions.map((label) => {
                  const isActive = label === selectedClassLabel;
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        setSelectedClassLabel(label);
                        setSelectedSubjectId(null);
                      }}
                      className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                        isActive
                          ? 'border-sky-400 bg-sky-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{label}</div>
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
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
              <p className="text-xs sm:text-sm text-gray-500">
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
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Add Subject
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingSubjects ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 animate-spin text-sky-500" />
              </div>
            ) : !selectedClassNumber ? (
              <p className="text-xs sm:text-sm text-gray-500">
                Select a class from the left to view its subjects.
              </p>
            ) : subjectsForClass.length === 0 ? (
              <div className="py-4 sm:py-6 lg:py-8 text-center text-xs sm:text-sm text-gray-500">
                No subjects found for this class. Use &quot;Add Subject&quot; to
                create one.
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-auto pr-1">
                {subjectsForClass.map((subj) => {
                  const isActive = selectedSubjectId === subj._id;
                  const Icon = BookOpen;
                  const inCatalog = isCatalogSubjectId(subj._id, subjects);
                  return (
                    <div
                      key={subj._id}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs sm:text-sm ${
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
                          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {extractPlainSubjectName(subj.name)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {syllabusLabel(subj.board)}
                            </Badge>
                            {!inCatalog && (
                              <Badge variant="secondary" className="text-[10px] font-normal">
                                From content
                              </Badge>
                            )}
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
                      {inCatalog ? (
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditSubject(subj)}
                            className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                            title="Edit subject"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSubject(subj._id)}
                            disabled={deletingSubjectId === subj._id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {deletingSubjectId === subj._id ? (
                              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            )}
                          </Button>
                        </div>
                      ) : null}
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
              <p className="text-xs sm:text-sm text-gray-500">
                {selectedSubjectId
                  ? 'Content items linked to the selected subject.'
                  : 'Select a subject to see its content.'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAddContent}
              disabled={
                !selectedSubjectId ||
                !selectedClassNumber ||
                !isCatalogSubjectId(selectedSubjectId, subjects)
              }
              className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Add Content
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingContents ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 animate-spin text-sky-500" />
              </div>
            ) : !selectedSubjectId ? (
              <p className="text-xs sm:text-sm text-gray-500">Select a subject to view content.</p>
            ) : filteredContents.length === 0 ? (
              <div className="py-4 sm:py-6 lg:py-8 text-center text-xs sm:text-sm text-gray-500">
                No content found for this subject. Use &quot;Add Content&quot; to
                create one.
              </div>
            ) : (
              <div className="space-y-10">
                {contentSections.map((section) => (
                  <div key={section.title} className="space-y-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
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

                        const fileUrl =
                          normalizeMediaUrl(content.fileUrl) || content.fileUrl;
                        const hasPreviewableFile = Boolean(
                          String(content.fileUrl || '').trim()
                        );
                        const cardPreview = resolveContentCardPreview(content, fileUrl);
                        const hasBrokenThumbnail = failedThumbnailIds.has(content._id);
                        const showImageThumb =
                          cardPreview.kind === 'image' && !hasBrokenThumbnail;

                        const renderPreviewIcon = (type: ContentType) => {
                          const PreviewIcon = getContentTypeIcon(type);
                          return (
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              {type === 'Video' ? (
                                <Video className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-sky-500" />
                              ) : type === 'Audio' ? (
                                <Headphones className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-sky-500" />
                              ) : (
                                <PreviewIcon className="w-7 h-7 text-sky-500" />
                              )}
                            </div>
                          );
                        };

                        return (
                          <div
                            key={content._id}
                            className="group rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
                          >
                            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-sky-100 to-teal-100 flex items-center justify-center">
                              {showImageThumb ? (
                                <>
                                  <img
                                    src={cardPreview.src}
                                    alt={content.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={() => {
                                      setFailedThumbnailIds((prev) => {
                                        const next = new Set(prev);
                                        next.add(content._id);
                                        return next;
                                      });
                                    }}
                                  />
                                  {content.type === 'Video' && (
                                    <div
                                      className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none"
                                      aria-hidden
                                    >
                                      <div className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                                        <Video className="w-5 h-5 text-sky-600 ml-0.5" />
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : cardPreview.kind === 'pdf' && !hasBrokenThumbnail ? (
                                <iframe
                                  src={cardPreview.src}
                                  title={content.title}
                                  className="w-full h-full border-0 bg-white pointer-events-none scale-[1.02] origin-top"
                                />
                              ) : cardPreview.kind === 'video' ? (
                                <video
                                  src={cardPreview.src}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-cover bg-black"
                                />
                              ) : cardPreview.kind === 'icon' ? (
                                renderPreviewIcon(cardPreview.contentType)
                              ) : (
                                renderPreviewIcon(content.type)
                              )}
                              {durationLabel && (
                                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/70 text-white text-xs">
                                  {durationLabel}
                                </div>
                              )}
                            </div>

                            <div className="p-4 flex-1 flex flex-col space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2">
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
                                  disabled={!hasPreviewableFile}
                                  title={
                                    hasPreviewableFile
                                      ? 'View here'
                                      : 'No file uploaded for this content'
                                  }
                                  onClick={() => {
                                    if (!hasPreviewableFile) {
                                      toast({
                                        title: 'No file',
                                        description: 'Upload a file for this content before viewing.',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    setContentPreviewItem(content);
                                  }}
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
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteContent(content._id)}
                                    disabled={deletingContentId === content._id}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    {deletingContentId === content._id ? (
                                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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

      <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Class</DialogTitle>
            <DialogDescription>
              Add a grade level (e.g. Class 6) so you can attach subjects and content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-class-number-dialog">Class number</Label>
              <Input
                id="add-class-number-dialog"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 10"
                value={newClassNumber}
                onChange={(e) =>
                  setNewClassNumber(e.target.value.replace(/\D/g, '').slice(0, 2))
                }
              />
            </div>
            <div>
              <Label htmlFor="add-class-description-dialog">Description (optional)</Label>
              <Textarea
                id="add-class-description-dialog"
                placeholder="e.g. Middle school — grade 6"
                value={newClassDescription}
                onChange={(e) => setNewClassDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddClassOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveClass}
                className="bg-gradient-to-r from-orange-400 to-sky-400 hover:from-orange-500 hover:to-sky-500 text-white"
              >
                Add Class
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
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
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>
                  Type <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Select
                  value={contentForm.type}
                  onValueChange={(value: ContentType) => {
                    setContentForm((prev) => ({ ...prev, type: value, fileUrl: '' }));
                    setSelectedUploadFile(null);
                  }}
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
            {contentForm.type === 'Video' ? (
              <div>
                <Label>
                  Video URL <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  value={contentForm.fileUrl}
                  onChange={(e) =>
                    setContentForm((prev) => ({ ...prev, fileUrl: e.target.value }))
                  }
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Paste a YouTube, Vimeo, or direct https video link.
                </p>
              </div>
            ) : contentForm.type === 'Audio' ? (
              <div className="space-y-4">
                <div>
                  <Label>
                    Audio URL{' '}
                    <span className="text-destructive" aria-hidden="true">*</span>
                  </Label>
                  <Input
                    value={contentForm.fileUrl}
                    onChange={(e) =>
                      setContentForm((prev) => ({ ...prev, fileUrl: e.target.value }))
                    }
                    placeholder="https://example.com/audio.mp3"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Paste a direct audio link or upload a file below.
                  </p>
                </div>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wide">
                    <span className="bg-background px-2 text-gray-500">Or upload audio file</span>
                  </div>
                </div>
                <div>
                  <Label>
                    Upload audio (saved on server){' '}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="file"
                        accept={getUploadAcceptForContentType('Audio')}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedUploadFile(file);
                        }}
                        className="cursor-pointer text-xs sm:text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleUploadContentFile}
                        disabled={isUploadingFile || !selectedUploadFile}
                      >
                        {isUploadingFile ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                            Uploading
                          </span>
                        ) : (
                          'Upload'
                        )}
                      </Button>
                    </div>
                    <p
                      className={`text-xs ${selectedUploadFile ? 'text-orange-700 font-medium' : 'text-gray-500'}`}
                    >
                      {selectedUploadFile
                        ? `Selected file: ${selectedUploadFile.name}`
                        : 'No file selected yet'}
                    </p>
                    {isServerHostedFileUrl(contentForm.fileUrl) && (
                      <p className="text-xs text-green-700 break-all">
                        Using uploaded file: {contentForm.fileUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
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
                          : '.pdf,.doc,.docx'
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedUploadFile(file);
                      }}
                      className="cursor-pointer text-xs sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleUploadContentFile}
                      disabled={isUploadingFile || !selectedUploadFile}
                    >
                      {isUploadingFile ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          Uploading
                        </span>
                      ) : (
                        'Upload'
                      )}
                    </Button>
                  </div>
                  <p
                    className={`text-xs ${selectedUploadFile ? 'text-orange-700 font-medium' : 'text-gray-500'}`}
                  >
                    {selectedUploadFile
                      ? `Selected file: ${selectedUploadFile.name}`
                      : 'No file selected yet'}
                  </p>
                  <Input
                    value={contentForm.fileUrl}
                    readOnly
                    placeholder="Uploaded file path will appear here (/uploads/...)"
                  />
                </div>
              </div>
            )}
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
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                )}
                {editingContentId ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!contentPreviewItem}
        onOpenChange={(open) => {
          if (!open) setContentPreviewItem(null);
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-full max-w-[min(100vw-1.5rem,1280px)] flex-col gap-4 overflow-hidden p-3 sm:p-4 lg:p-6">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {contentPreviewItem?.title ?? 'Content preview'}
            </DialogTitle>
            <DialogDescription>
              {contentPreviewItem
                ? `${contentPreviewItem.type} · ${syllabusLabel(contentPreviewItem.board)}`
                : 'Preview attached file'}
            </DialogDescription>
          </DialogHeader>
          {contentPreviewItem && (
            <>
              <div
                className={`min-h-0 flex-1 rounded-md border bg-muted/30 ${
                  contentPreviewItem.type === 'Video' || contentPreviewItem.type === 'Audio'
                    ? 'overflow-hidden'
                    : 'overflow-y-auto overflow-x-hidden'
                }`}
              >
                {!contentPreviewUrl ? (
                  <p className="p-3 sm:p-4 lg:p-6 text-center text-xs sm:text-sm text-muted-foreground">
                    No file URL for this content.
                  </p>
                ) : contentPreviewItem.type === 'Video' ? (
                  (() => {
                    const embed = getStreamingEmbedSrc(contentPreviewUrl);
                    if (embed) {
                      return (
                        <div className="w-full overflow-hidden bg-black p-2 sm:p-3">
                          <div className="relative mx-auto aspect-video w-full max-w-full max-h-[min(68vh,78dvh)] overflow-hidden rounded-sm bg-black shadow-inner">
                            <iframe
                              title={contentPreviewItem.title}
                              src={embed}
                              className="absolute inset-0 box-border h-full w-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex w-full flex-col items-stretch overflow-hidden bg-black p-2 sm:p-3">
                        <video
                          key={contentPreviewUrl}
                          src={contentPreviewUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="mx-auto block w-full max-w-full bg-black object-contain"
                          style={{
                            aspectRatio: '16 / 9',
                            minHeight: 220,
                            maxHeight: 'min(72vh, 80dvh)',
                          }}
                          onError={() => {
                            toast({
                              title: 'Video could not play here',
                              description:
                                'The file may be an unsupported format, blocked by the server, or a hosted link that needs Open in new tab.',
                              variant: 'destructive',
                            });
                          }}
                        >
                          Your browser does not support embedded video.
                        </video>
                      </div>
                    );
                  })()
                ) : contentPreviewItem.type === 'Audio' ? (
                  <div className="flex flex-col items-center justify-center gap-4 p-4 sm:p-6 lg:p-8">
                    <Headphones className="h-12 w-12 text-sky-500" />
                    <audio src={contentPreviewUrl} controls className="w-full max-w-md">
                      Your browser does not support embedded audio.
                    </audio>
                  </div>
                ) : isPdfUrl(contentPreviewUrl) ? (
                  <iframe
                    title={contentPreviewItem.title}
                    src={getEmbeddedPdfIframeSrc(
                      contentPreviewUrl,
                      contentPreviewItem.title
                    )}
                    className="h-[min(78vh,900px)] w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 p-4 sm:p-6 lg:p-8 text-center text-xs sm:text-sm text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-40" />
                    <p>Preview is not available for this file type in the app.</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" onClick={() => setContentPreviewItem(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

