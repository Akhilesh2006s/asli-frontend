import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { getExamClassStrings } from '@/lib/exam-classes';
import { normalizeAndFormatExamDisplayText } from '@/lib/exam-text-normalize';
import { Plus, Trash2, Edit, Eye, Calendar, Clock, BookOpen, FileQuestion, X, Upload, Download, School, GraduationCap, Loader2 } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  classNumber?: string;
  subject: 'maths' | 'physics' | 'chemistry' | 'biology';
  subjects?: Array<'maths' | 'physics' | 'chemistry' | 'biology'>;
  maxAttempts: number;
  assignedClasses?: string[];
  board: string;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  instructions: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  questions?: string[];
  targetSchools?: Array<{ _id: string; schoolName?: string; fullName?: string; email?: string }>;
  schoolId?: string;
  isSchoolSpecific?: boolean;
  createdAt: string;
  updatedAt?: string;
}

const BOARDS = [
  { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'Asli Prep (exclusive)' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'SSC', label: 'SSC / State Board' },
  { value: 'STATE', label: 'State Board (generic)' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IB', label: 'IB' },
  { value: 'CAMBRIDGE', label: 'Cambridge (CAIE)' },
];

const EXAM_TYPES = [
  { value: 'mains', label: 'Mains' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'practice', label: 'Practice' }
];

const EXAM_SUBJECTS = [
  { value: 'maths', label: 'Mathematics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' }
];

const CLASS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

type FilterType = 'all-schools' | 'specific-schools';
type BulkQuestionUploadMode = 'csv' | 'pdf';
type PdfQuestionRow = {
  row: number;
  questionText: string;
  questionType: 'mcq' | 'multiple' | 'integer';
  subject: string;
  marks: number;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctAnswer: string;
  explanation: string;
};

/** Canonical subject for PDF rows / upload (no exam default). */
function normalizePdfRowSubjectSlug(
  raw: string,
): '' | 'maths' | 'physics' | 'chemistry' | 'biology' {
  const t = String(raw || '').trim().toLowerCase();
  if (!t) return '';
  const map: Record<string, 'maths' | 'physics' | 'chemistry' | 'biology'> = {
    maths: 'maths',
    mathematics: 'maths',
    math: 'maths',
    physics: 'physics',
    chemistry: 'chemistry',
    biology: 'biology',
    biological: 'biology',
  };
  if (map[t]) return map[t];
  if (t === 'maths' || t === 'physics' || t === 'chemistry' || t === 'biology') return t;
  return '';
}

const normalizeDisplayText = (value?: string) =>
  (value || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatChemistryText = (value: unknown, subject?: string) =>
  normalizeAndFormatExamDisplayText(value, subject);

const toIsoFromDateTimeLocal = (value: string) => {
  if (!value) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

const toDateTimeLocalInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const sanitizeMarksInput = (value: string) => {
  if (value.trim() === '') return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return String(Math.max(0, parsed));
};

// Keep negative-marking as positive magnitude in UI/backend; deduction logic applies it as negative.
const sanitizeNegativeMarksInput = (value: string) => {
  if (value.trim() === '') return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return String(Math.max(0, Math.abs(parsed)));
};

const examDisplayDedupKey = (exam: Exam) => {
  const classKey = getExamClassStrings(exam)
    .map((c) => String(c).trim())
    .filter(Boolean)
    .sort()
    .join('|');
  const targetSchoolsKey = (exam.targetSchools || [])
    .map((s: any) => (typeof s === 'string' ? s : s?._id))
    .filter(Boolean)
    .map((id: any) => String(id))
    .sort()
    .join('|');

  return [
    (exam.title || '').trim().toLowerCase(),
    (exam.description || '').trim().toLowerCase(),
    exam.examType || '',
    classKey,
    String(exam.duration || ''),
    String(exam.totalQuestions || ''),
    String(exam.totalMarks || ''),
    exam.startDate || '',
    exam.endDate || '',
    exam.isSchoolSpecific ? 'school-specific' : 'all-schools',
    targetSchoolsKey,
  ].join('::');
};

const getExamSubjects = (exam: Partial<Exam>) => {
  const fromArray = Array.isArray(exam.subjects) ? exam.subjects : [];
  const merged = [...fromArray, exam.subject].filter(Boolean) as Array<'maths' | 'physics' | 'chemistry' | 'biology'>;
  return Array.from(new Set(merged.map((s) => String(s).trim().toLowerCase() as any))).filter(Boolean) as Array<'maths' | 'physics' | 'chemistry' | 'biology'>;
};

const getExamTimestamp = (exam: Partial<Exam>) => {
  const raw = exam.updatedAt || exam.createdAt || '';
  const ts = new Date(raw).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

export default function ExamManagement() {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState('all-schools');
  const [selectedClass, setSelectedClass] = useState('all-classes');
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [classModalSearch, setClassModalSearch] = useState('');
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionCsvFile, setQuestionCsvFile] = useState<File | null>(null);
  const [questionPdfFile, setQuestionPdfFile] = useState<File | null>(null);
  const [bulkQuestionUploadMode, setBulkQuestionUploadMode] = useState<BulkQuestionUploadMode>('csv');
  const [isUploadingQuestionCsv, setIsUploadingQuestionCsv] = useState(false);
  const [isExtractingPdfQuestions, setIsExtractingPdfQuestions] = useState(false);
  const [isUploadingExtractedQuestions, setIsUploadingExtractedQuestions] = useState(false);
  const [isDeletingAllQuestions, setIsDeletingAllQuestions] = useState(false);
  const [questionCsvUploadResults, setQuestionCsvUploadResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [pdfQuestionRows, setPdfQuestionRows] = useState<PdfQuestionRow[]>([]);
  const [pdfPreviewPage, setPdfPreviewPage] = useState(1);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<{ id: string; index: number } | null>(null);
  // Default ON: duplicate rows are uploaded instead of skipped.
  const [allowDuplicateQuestionsInCsv, setAllowDuplicateQuestionsInCsv] = useState(true);
  const pdfRowsMissingSubject = useMemo(
    () => pdfQuestionRows.length > 0 && pdfQuestionRows.some((r) => !String(r.subject || '').trim()),
    [pdfQuestionRows],
  );
  const pdfSubjectInvalidForUpload = useMemo(
    () => pdfQuestionRows.length > 0 && pdfQuestionRows.some((r) => !normalizePdfRowSubjectSlug(r.subject)),
    [pdfQuestionRows],
  );
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [isUploadingQuestionImage, setIsUploadingQuestionImage] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [csvUploadResults, setCsvUploadResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [questionFormData, setQuestionFormData] = useState({
    questionText: '',
    questionImage: '',
    questionType: 'mcq' as 'mcq' | 'multiple' | 'integer',
    subject: 'maths',
    marks: '1',
    negativeMarks: '0',
    explanation: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    correctAnswers: [] as string[],
    integerAnswer: ''
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    examType: 'mains' as 'mains' | 'advanced' | 'weekend' | 'practice',
    classNumber: '',
    assignedClasses: [] as string[],
    subjects: ['maths'] as Array<'maths' | 'physics' | 'chemistry' | 'biology'>,
    maxAttempts: '1',
    board: 'ASLI_EXCLUSIVE_SCHOOLS',
    filterType: 'all-schools' as FilterType,
    selectedSchools: [] as string[],
    duration: '',
    totalQuestions: '',
    totalMarks: '',
    instructions: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem('examCalendarPrefill');
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as {
        startDate?: string;
        endDate?: string;
        filterType?: FilterType;
        selectedSchools?: string[];
      };
      sessionStorage.removeItem('examCalendarPrefill');
      setFormData((prev) => ({
        ...prev,
        startDate: p.startDate ?? prev.startDate,
        endDate: p.endDate ?? prev.endDate,
        filterType: p.filterType ?? prev.filterType,
        selectedSchools: Array.isArray(p.selectedSchools) ? p.selectedSchools : prev.selectedSchools,
      }));
      setIsDialogOpen(true);
    } catch {
      sessionStorage.removeItem('examCalendarPrefill');
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchQuestions = async (examId: string) => {
    setIsLoadingQuestions(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams/${examId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuestions(data.data || []);
        }
      } else {
        // If endpoint doesn't exist, fetch exam and get questions from there
        const examResponse = await fetch(`${API_BASE_URL}/api/super-admin/exams/${examId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (examResponse.ok) {
          const examData = await examResponse.json();
          if (examData.success && examData.data.questions) {
            setQuestions(examData.data.questions);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleDownloadQuestionTemplate = () => {
    // Create CSV template for questions
    const headers = [
      'questionText',
      'questionImage',
      'questionType',
      'subject',
      'marks',
      'negativeMarks',
      'explanation',
      'option1',
      'option2',
      'option3',
      'option4',
      'correctAnswer',
      'correctAnswers',
      'integerAnswer'
    ];
    
    // Example rows for different question types
    const mcqExample = [
      'What is 2 + 2?',
      '',
      'mcq',
      'maths',
      '1',
      '0',
      'Basic addition',
      '3',
      '4',
      '5',
      '6',
      '1',
      '',
      ''
    ];
    
    const multipleExample = [
      'Which are prime numbers?',
      '',
      'multiple',
      'maths',
      '2',
      '0.5',
      'Prime numbers are divisible only by 1 and themselves',
      '2',
      '3',
      '4',
      '5',
      '',
      '0,1,3',
      ''
    ];
    
    const integerExample = [
      'What is the square root of 16?',
      '',
      'integer',
      'maths',
      '2',
      '0',
      'Square root of 16 is 4',
      '',
      '',
      '',
      '',
      '',
      '',
      '4'
    ];
    
    const csvContent = [
      headers.join(','),
      mcqExample.join(','),
      multipleExample.join(','),
      integerExample.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'question_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully. Fill it with your question data and upload it.',
    });
  };

  const handleQuestionCsvUpload = async () => {
    if (!questionCsvFile || !selectedExam) {
      toast({
        title: 'Validation Error',
        description: 'Please select a CSV file and ensure an exam is selected',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingQuestionCsv(true);
    setQuestionCsvUploadResults(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', questionCsvFile);
      formData.append('allowDuplicates', allowDuplicateQuestionsInCsv ? 'true' : 'false');

      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setQuestionCsvUploadResults({
          success: data.created || data.data?.length || 0,
          errors: data.errors || []
        });
        toast({
          title: 'Success',
          description: `Successfully created ${data.created || data.data?.length || 0} question(s)${data.errors?.length > 0 ? ` with ${data.errors.length} error(s)` : ''}`,
        });
        fetchQuestions(selectedExam._id);
        fetchExams(); // Refresh exam list to update question count
        // Reset file input
        setQuestionCsvFile(null);
        // Close dialog after 3 seconds if successful
        if (!data.errors || data.errors.length === 0) {
          setTimeout(() => {
            setQuestionCsvUploadResults(null);
          }, 3000);
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to upload CSV file',
          variant: 'destructive'
        });
        setQuestionCsvUploadResults({
          success: 0,
          errors: [data.message || 'Upload failed']
        });
      }
    } catch (error) {
      console.error('Failed to upload question CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload CSV file. Please try again.',
        variant: 'destructive'
      });
      setQuestionCsvUploadResults({
        success: 0,
        errors: ['Network error: Failed to upload file']
      });
    } finally {
      setIsUploadingQuestionCsv(false);
    }
  };

  const mapPdfRowToQuestionPayload = (row: PdfQuestionRow) => {
    const optionTexts = [row.option1, row.option2, row.option3, row.option4]
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    const options = optionTexts.map((text) => ({ text, isCorrect: false }));
    const type = row.questionType;
    const base = {
      questionText: String(row.questionText || '').trim(),
      questionType: type,
      subject: String(row.subject || availableQuestionSubjects[0] || 'maths').trim().toLowerCase(),
      marks: Number(row.marks || 1) || 1,
      negativeMarks: 0,
      explanation: String(row.explanation || '').trim() || undefined,
      board: selectedExam?.board,
    } as any;

    if (type === 'integer') {
      const n = Number(String(row.correctAnswer || '').trim());
      return {
        ...base,
        options: [],
        correctAnswer: Number.isFinite(n) ? n : String(row.correctAnswer || '').trim(),
      };
    }

    const answerText = String(row.correctAnswer || '').trim();
    if (type === 'multiple') {
      const answerSet = new Set(
        answerText
          .split(',')
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      );
      options.forEach((opt) => {
        if (answerSet.has(String(opt.text || '').trim().toLowerCase())) opt.isCorrect = true;
      });
      return {
        ...base,
        options,
        correctAnswer: options.filter((o) => o.isCorrect).map((o) => o.text),
      };
    }

    // mcq
    const idx = options.findIndex((o) => String(o.text || '').trim().toLowerCase() === answerText.toLowerCase());
    if (idx >= 0) options[idx].isCorrect = true;
    return {
      ...base,
      options,
      correctAnswer: idx >= 0 ? options[idx].text : answerText,
    };
  };

  const handleExtractQuestionsFromPdf = async () => {
    if (!selectedExam || !questionPdfFile) {
      toast({
        title: 'Validation Error',
        description: 'Please select a PDF file and exam.',
        variant: 'destructive'
      });
      return;
    }
    setIsExtractingPdfQuestions(true);
    setPdfQuestionRows([]);
    setPdfPreviewPage(1);
    try {
      const token = localStorage.getItem('authToken');
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120000);
      const form = new FormData();
      form.append('file', questionPdfFile);
      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions/pdf-convert`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
          signal: controller.signal,
        });
        // Some deployments expose super-admin routes only under /protected.
        if (res.status === 404) {
          res = await fetch(`${API_BASE_URL}/api/super-admin/protected/exams/${selectedExam._id}/questions/pdf-convert`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
            signal: controller.signal,
          });
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { success: false, message: raw || `Request failed (${res.status})` };
      }
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Failed to extract questions from PDF (${res.status})`);
      }
      const rows = Array.isArray(data?.data) ? data.data : [];
      if (rows.length === 0) {
        throw new Error('No extractable questions found in this PDF. Please try a clearer PDF or different pages.');
      }
      setPdfQuestionRows(rows);
      toast({
        title: 'Extraction complete',
        description: `Extracted ${rows.length} question(s) from PDF. Not saved yet - click "Upload These Questions" to save.`,
      });
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'Extraction timed out. Please try again with a smaller PDF.'
        : error?.message || 'Gemini failed to extract questions.';
      toast({
        title: 'Extraction failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExtractingPdfQuestions(false);
    }
  };

  const handleDownloadExtractedCsv = () => {
    if (pdfQuestionRows.length === 0) return;
    const headers = ['questionText', 'questionType', 'subject', 'marks', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation'];
    const sanitizeCsvCell = (v: unknown) =>
      String(v ?? '')
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const escapeCsv = (v: unknown) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`;
    const body = pdfQuestionRows.map((r) => [
      r.questionText, r.questionType, r.subject, r.marks, r.option1, r.option2, r.option3, r.option4, r.correctAnswer, r.explanation
    ].map(escapeCsv).join(','));
    const csv = [headers.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pdf-extracted-questions-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadExtractedQuestions = async () => {
    if (!selectedExam || pdfQuestionRows.length === 0) return;
    if (pdfSubjectInvalidForUpload) {
      toast({
        title: 'Subject required',
        description:
          'Each question must have a valid subject: maths, physics, chemistry, or biology. Fill empty cells in the preview table.',
        variant: 'destructive',
      });
      return;
    }
    const shouldUpload = window.confirm(
      `Upload ${pdfQuestionRows.length} extracted question(s) to this exam now?\n\nThis will immediately save them to the database.`
    );
    if (!shouldUpload) return;
    setIsUploadingExtractedQuestions(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = ['questionText', 'questionType', 'subject', 'marks', 'option1', 'option2', 'option3', 'option4', 'correctAnswer', 'explanation'];
      const sanitizeCsvCell = (v: unknown) =>
        String(v ?? '')
          .replace(/\r\n/g, ' ')
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      const escapeCsv = (v: unknown) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`;

      const normalizeType = (raw: unknown): 'mcq' | 'multiple' | 'integer' => {
        const value = String(raw || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, '');
        if (['msq', 'multiple', 'multipleselect', 'multiselect', 'multiplechoice'].includes(value)) return 'multiple';
        if (['integer', 'numeric', 'number'].includes(value)) return 'integer';
        return 'mcq';
      };

      const preValidationErrors: string[] = [];
      const normalizedRows = pdfQuestionRows
        .map((r, idx) => {
          const questionText = sanitizeCsvCell(r.questionText);
          if (!questionText) {
            preValidationErrors.push(`Row ${idx + 1}: questionText is required`);
            return null;
          }

          let questionType = normalizeType(r.questionType);
          const optionValues = [r.option1, r.option2, r.option3, r.option4].map((x) => sanitizeCsvCell(x));
          const nonEmptyOptions = optionValues.filter(Boolean);
          const correctAnswer = sanitizeCsvCell(r.correctAnswer);
          const correctAnswerNumber = Number(correctAnswer);

          if ((questionType === 'mcq' || questionType === 'multiple') && nonEmptyOptions.length === 0) {
            if (correctAnswer && Number.isFinite(correctAnswerNumber)) {
              questionType = 'integer';
            } else {
              preValidationErrors.push(`Row ${idx + 1}: At least one option is required for ${questionType} questions`);
              return null;
            }
          }

          return {
            questionText,
            questionType,
            subject: sanitizeCsvCell(normalizePdfRowSubjectSlug(r.subject)),
            marks: Number(r.marks || 1) > 0 ? Number(r.marks) : 1,
            option1: questionType === 'integer' ? '' : optionValues[0],
            option2: questionType === 'integer' ? '' : optionValues[1],
            option3: questionType === 'integer' ? '' : optionValues[2],
            option4: questionType === 'integer' ? '' : optionValues[3],
            correctAnswer,
            explanation: sanitizeCsvCell(r.explanation),
          };
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r));

      if (normalizedRows.length === 0) {
        setQuestionCsvUploadResults({ success: 0, errors: preValidationErrors.length > 0 ? preValidationErrors : ['No valid extracted rows to upload'] });
        throw new Error('No valid extracted rows to upload');
      }

      const csvRows = normalizedRows.map((r) => [
        r.questionText,
        r.questionType,
        r.subject,
        r.marks,
        r.option1,
        r.option2,
        r.option3,
        r.option4,
        r.correctAnswer,
        r.explanation,
      ].map(escapeCsv).join(','));
      const csv = [headers.join(','), ...csvRows].join('\n');
      const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const file = new File([csvBlob], `pdf-extracted-${Date.now()}.csv`, { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('allowDuplicates', allowDuplicateQuestionsInCsv ? 'true' : 'false');

      let res = await fetch(`${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions/bulk-upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/super-admin/protected/exams/${selectedExam._id}/questions/bulk-upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }
      const data = await res.json().catch(() => null);
      const created = Number(data?.created || data?.data?.length || 0);
      const errors: string[] = [
        ...preValidationErrors,
        ...(Array.isArray(data?.errors) ? data.errors : []),
      ];
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Bulk upload failed (${res.status})`);
      }
      setQuestionCsvUploadResults({ success: created, errors });
      toast({
        title: created > 0 ? 'Upload complete' : 'Upload failed',
        description: `Created ${created} question(s)${errors.length ? `, ${errors.length} error(s)` : ''}.`,
        variant: created > 0 ? 'default' : 'destructive',
      });
      await fetchQuestions(selectedExam._id);
      await fetchExams();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error?.message || 'Could not upload extracted questions.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingExtractedQuestions(false);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedExam || !pendingDeleteQuestion) return;
    try {
      const token = localStorage.getItem('authToken');
      let res = await fetch(
        `${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions/${pendingDeleteQuestion.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.status === 404) {
        res = await fetch(
          `${API_BASE_URL}/api/super-admin/protected/exams/${selectedExam._id}/questions/${pendingDeleteQuestion.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Delete failed');
      setQuestions((prev) => prev.filter((q) => String(q._id) !== String(pendingDeleteQuestion.id)));
      setPendingDeleteQuestion(null);
      toast({
        title: 'Question deleted',
        description: 'Question deleted. Questions renumbered.',
      });
      await fetchExams();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Could not delete question.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (!selectedExam) return;
    if (questions.length === 0) {
      toast({
        title: 'No questions to delete',
        description: 'This exam does not have any questions yet.',
      });
      return;
    }

    const shouldDelete = window.confirm(
      `Are you sure you want to delete all ${questions.length} question(s)? This cannot be undone.`
    );
    if (!shouldDelete) return;

    setIsDeletingAllQuestions(true);
    try {
      const token = localStorage.getItem('authToken');
      let res = await fetch(`${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/super-admin/protected/exams/${selectedExam._id}/questions`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to delete all questions');
      }

      setQuestions([]);
      setPendingDeleteQuestion(null);
      toast({
        title: 'All questions deleted',
        description: data?.message || 'All questions removed successfully.',
      });
      await fetchExams();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Could not delete all questions.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAllQuestions(false);
    }
  };

  const parseCSVLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map((v) => v.replace(/^"|"$/g, ''));
  };

  const prefillQuestionFormFromCsv = async (file: File) => {
    try {
      // Prefill only works for plain-text CSV. .xlsx / .xls are binary zip
      // archives, so skip prefill for those — the server handles them fine.
      const nameLower = (file.name || '').toLowerCase();
      if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) return;

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) return;

      const normalizeHeader = (header: string) =>
        String(header || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
      const headers = parseCSVLine(lines[0]).map((h) => normalizeHeader(h));
      const values = parseCSVLine(lines[1]);
      if (values.length !== headers.length) return;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const getRowValue = (...keys: string[]) => {
        for (const key of keys) {
          const normalizedKey = normalizeHeader(key);
          if (row[normalizedKey] !== undefined && row[normalizedKey] !== '') {
            return row[normalizedKey];
          }
        }
        return '';
      };

      const questionTypeRaw = getRowValue('questionType', 'question_type', 'type').toLowerCase();
      const questionType = (questionTypeRaw === 'multiple' || questionTypeRaw === 'integer' || questionTypeRaw === 'mcq'
        ? questionTypeRaw
        : 'mcq') as 'mcq' | 'multiple' | 'integer';

      const optionValues = [
        getRowValue('option1', 'option_1', 'option 1', 'optiona', 'option_a', 'a'),
        getRowValue('option2', 'option_2', 'option 2', 'optionb', 'option_b', 'b'),
        getRowValue('option3', 'option_3', 'option 3', 'optionc', 'option_c', 'c'),
        getRowValue('option4', 'option_4', 'option 4', 'optiond', 'option_d', 'd'),
      ];
      const hasAnyOption = optionValues.some((opt) => String(opt || '').trim() !== '');
      const normalizedOptions = optionValues.map((opt) => String(opt || '').trim().toLowerCase());

      const toOptionIndexString = (token: string) => {
        const normalizedToken = String(token || '').trim().toLowerCase();
        if (!normalizedToken) return '';

        if (/^\d+$/.test(normalizedToken)) {
          const numeric = parseInt(normalizedToken, 10);
          if (numeric >= 0 && numeric < optionValues.length) return String(numeric);
          if (numeric >= 1 && numeric <= optionValues.length) return String(numeric - 1);
        }

        if (/^[a-z]$/.test(normalizedToken)) {
          const idx = normalizedToken.charCodeAt(0) - 97;
          if (idx >= 0 && idx < optionValues.length) return String(idx);
        }

        const optionMatch = normalizedToken.match(/^option\s*([a-z0-9])$/);
        if (optionMatch) {
          const optionToken = optionMatch[1];
          if (/^\d$/.test(optionToken)) {
            const n = parseInt(optionToken, 10);
            if (n >= 1 && n <= optionValues.length) return String(n - 1);
            if (n >= 0 && n < optionValues.length) return String(n);
          }
          if (/^[a-z]$/.test(optionToken)) {
            const idx = optionToken.charCodeAt(0) - 97;
            if (idx >= 0 && idx < optionValues.length) return String(idx);
          }
        }

        const textIndex = normalizedOptions.findIndex((opt) => opt !== '' && opt === normalizedToken);
        return textIndex >= 0 ? String(textIndex) : '';
      };

      const csvSubject = getRowValue('subject').trim().toLowerCase();
      const subject = availableQuestionSubjects.includes(csvSubject as any)
        ? csvSubject
        : (availableQuestionSubjects[0] || 'maths');

      let correctAnswer = '';
      let correctAnswers: string[] = [];
      let integerAnswer = '';
      if (questionType === 'multiple') {
        correctAnswers = (getRowValue('correctAnswers', 'correct_answers', 'correctanswer', 'answer') || '')
          .split(/[;,]/)
          .map((x) => toOptionIndexString(x))
          .filter((x) => x !== '');
        correctAnswers = Array.from(new Set(correctAnswers));
      } else if (questionType === 'integer') {
        integerAnswer = getRowValue('integerAnswer', 'integer_answer', 'correctanswer', 'answer');
      } else {
        correctAnswer = toOptionIndexString(getRowValue('correctanswer', 'correct_answer', 'answer'));
      }

      const resolvedQuestionType: 'mcq' | 'multiple' | 'integer' =
        questionType === 'mcq' && !hasAnyOption && integerAnswer
          ? 'integer'
          : questionType;

      setQuestionFormData((prev) => ({
        ...prev,
        questionText: getRowValue('questionText', 'question_text') || '',
        questionImage: getRowValue('questionImage', 'question_image') || '',
        questionType: resolvedQuestionType,
        subject,
        marks: getRowValue('marks') || '1',
        negativeMarks: getRowValue('negativeMarks', 'negative_marks') || '0',
        explanation: getRowValue('explanation') || '',
        options: optionValues,
        correctAnswer,
        correctAnswers,
        integerAnswer,
      }));
      toast({
        title: 'CSV Preview Loaded',
        description: 'First CSV row auto-filled in question form',
      });
    } catch (error) {
      console.error('Failed to prefill question form from CSV:', error);
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedExam) return;

    // In PDF upload mode, treat "Add Question" as final save action
    // for extracted rows so users can confirm before persistence.
    if (bulkQuestionUploadMode === 'pdf' && pdfQuestionRows.length > 0) {
      await handleUploadExtractedQuestions();
      return;
    }

    if (!questionFormData.questionText.trim() && !questionFormData.questionImage) {
      toast({
        title: 'Validation Error',
        description: 'Question text or image is required',
        variant: 'destructive'
      });
      return;
    }

    if ((questionFormData.questionType === 'mcq' || questionFormData.questionType === 'multiple') && 
        questionFormData.options.every(opt => !opt.trim())) {
      toast({
        title: 'Validation Error',
        description: 'At least one option is required for MCQ questions',
        variant: 'destructive'
      });
      return;
    }

    // Validate and format correct answer
    let correctAnswer: any;
    if (questionFormData.questionType === 'integer') {
      correctAnswer = parseInt(questionFormData.integerAnswer);
      if (isNaN(correctAnswer)) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid integer answer',
          variant: 'destructive'
        });
        return;
      }
    } else if (questionFormData.questionType === 'multiple') {
      const selectedAnswers = questionFormData.correctAnswers.filter(ans => ans.trim() !== '');
      if (selectedAnswers.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one correct answer',
          variant: 'destructive'
        });
        return;
      }
      // Send as array of indices
      correctAnswer = selectedAnswers;
    } else {
      // Single MCQ
      if (!questionFormData.correctAnswer.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please select a correct answer',
          variant: 'destructive'
        });
        return;
      }
      // Send as single index
      correctAnswer = questionFormData.correctAnswer;
    }

    // Format options for MCQ/Multiple - keep as array of objects with text
    const formattedOptions = questionFormData.questionType === 'integer' 
      ? [] 
      : questionFormData.options
          .filter(opt => opt.trim() !== '')
          .map(opt => ({ text: opt.trim(), isCorrect: false }));

    const buildQuestionPayload = (replaceDuplicate = false) => ({
      questionText: questionFormData.questionText.trim(),
      questionImage: questionFormData.questionImage.trim() || undefined,
      questionType: questionFormData.questionType,
      options: formattedOptions,
      correctAnswer,
      marks: Math.max(0, Number(questionFormData.marks) || 1),
      negativeMarks: Math.max(0, Math.abs(Number(questionFormData.negativeMarks) || 0)),
      explanation: questionFormData.explanation.trim() || undefined,
      subject: questionFormData.subject,
      board: selectedExam.board,
      replaceDuplicate,
    });

    const handleQuestionSaved = () => {
      setQuestionFormData({
        questionText: '',
        questionImage: '',
        questionType: 'mcq',
        subject: 'maths',
        marks: '1',
        negativeMarks: '0',
        explanation: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        correctAnswers: [],
        integerAnswer: ''
      });
      setQuestionImageFile(null);
      fetchQuestions(selectedExam._id);
      fetchExams(); // Refresh exam list to update question count
    };

    setIsAddingQuestion(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const endpoint = `${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildQuestionPayload(false))
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Question added successfully'
        });
        handleQuestionSaved();
      } else if (response.status === 409 && String(data.message || '').toLowerCase().includes('duplicate')) {
        const shouldReplace = window.confirm(
          'This question already exists for the same exam and subject.\n\nDo you want to replace the existing duplicate with this one?'
        );

        if (!shouldReplace) {
          return;
        }

        const replaceResponse = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(buildQuestionPayload(true))
        });
        const replaceData = await replaceResponse.json();

        if (replaceResponse.ok && replaceData.success) {
          toast({
            title: 'Success',
            description: 'Duplicate question replaced successfully'
          });
          handleQuestionSaved();
        } else {
          toast({
            title: 'Error',
            description: replaceData.message || 'Failed to replace duplicate question',
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to add question',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to add question:', error);
      toast({
        title: 'Error',
        description: 'Failed to add question',
        variant: 'destructive'
      });
    } finally {
      setIsAddingQuestion(false);
    }
  };

  const handleQuestionImageUpload = async (file: File) => {
    if (!file) return;

    setQuestionImageFile(file);
    setIsUploadingQuestionImage(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/api/super-admin/upload-question-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload image');
      }

      setQuestionFormData((prev) => ({
        ...prev,
        questionImage: data.imageUrl || ''
      }));

      toast({
        title: 'Image uploaded',
        description: 'Question image saved successfully.'
      });
    } catch (error: any) {
      setQuestionImageFile(null);
      setQuestionFormData((prev) => ({ ...prev, questionImage: '' }));
      toast({
        title: 'Upload Error',
        description: error?.message || 'Failed to upload question image',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingQuestionImage(false);
    }
  };

  const fetchSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const adminsList = Array.isArray(data) ? data : (data.data || []);
        const mappedSchools = adminsList
          .map((admin: any) => ({
            id: admin.id || admin._id,
            name: admin.schoolName || admin.name,
            email: admin.email,
            board: admin.board
          }))
          .sort((a: any, b: any) =>
            normalizeDisplayText(a.name).localeCompare(
              normalizeDisplayText(b.name),
              undefined,
              { sensitivity: 'base' }
            )
          );
        setSchools(mappedSchools);
      }
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      let url = `${API_BASE_URL}/api/super-admin/exams`;
      
      console.log('🌐 Fetching exams from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const raw = (data.data || []) as Exam[];
          const fetchedExams = raw.map((ex) => {
            const labels = getExamClassStrings(ex);
            const normalizedSubjects = getExamSubjects(ex);
            return {
              ...ex,
              assignedClasses: labels,
              classNumber: labels[0] ?? ex.classNumber ?? '',
              subject: (normalizedSubjects[0] || ex.subject || 'maths') as 'maths' | 'physics' | 'chemistry' | 'biology',
              subjects: normalizedSubjects.length > 0 ? normalizedSubjects : [(ex.subject || 'maths') as 'maths' | 'physics' | 'chemistry' | 'biology'],
            };
          });

          // Note: Backend already filters by schoolIds, so no additional frontend filtering needed
          // The backend returns exams that are either:
          // 1. Available to all schools (isSchoolSpecific: false)
          // 2. Available to the selected schools (isSchoolSpecific: true AND targetSchools includes selected schools)

          setExams(fetchedExams);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(
          '[exams] request failed',
          response.status,
          response.statusText,
          errorData,
          { hasToken: !!token }
        );
        const hint =
          response.status === 401 || response.status === 400
            ? ' Try logging out and logging in again on this site (production uses a different session than localhost).'
            : '';
        toast({
          title: 'Error',
          description: (errorData.message || `Failed to fetch exams (${response.status})`) + hint,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch exams:', error);
      
      // Handle network errors specifically
      let errorMessage = 'Failed to fetch exams';
      
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_NETWORK')) {
          errorMessage = 'Network error: Cannot connect to server. Please check your internet connection and try again.';
        } else {
          errorMessage = `Network error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || 'Failed to fetch exams';
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

  const handleSaveExam = async () => {
    if (!formData.title || formData.assignedClasses.length === 0 || formData.subjects.length === 0 || !formData.maxAttempts || !formData.duration || !formData.totalQuestions || !formData.totalMarks || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if ((parseInt(formData.maxAttempts, 10) || 0) < 1) {
      toast({
        title: 'Validation Error',
        description: 'No. of Attempts must be at least 1',
        variant: 'destructive'
      });
      return;
    }

    if (formData.filterType === 'specific-schools' && formData.selectedSchools.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one school',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('authToken');
      const normalizedSubjects = Array.from(
        new Set(
          formData.subjects
            .map((s) => String(s).trim().toLowerCase())
            .filter(Boolean)
        )
      ) as Array<'maths' | 'physics' | 'chemistry' | 'biology'>;

      // Prepare shared payload fields
      const payload: any = {
        title: formData.title,
        description: formData.description,
        examType: formData.examType,
        classNumber: formData.assignedClasses[0],
        assignedClasses: formData.assignedClasses,
        subject: normalizedSubjects[0],
        subjects: normalizedSubjects,
        maxAttempts: parseInt(formData.maxAttempts, 10),
        board: formData.board,
        duration: parseInt(formData.duration),
        totalQuestions: parseInt(formData.totalQuestions),
        totalMarks: parseInt(formData.totalMarks),
        instructions: formData.instructions,
        startDate: toIsoFromDateTimeLocal(formData.startDate),
        endDate: toIsoFromDateTimeLocal(formData.endDate)
      };
      console.log('🧾 Exam save payload:', payload);

      // Add school-specific targeting if selected
      if (formData.filterType === 'specific-schools' && formData.selectedSchools.length > 0) {
        payload.targetSchools = formData.selectedSchools;
        payload.isSchoolSpecific = true;
        payload.isAllBoards = false;
      } else if (formData.filterType === 'all-schools') {
        // All schools can see this exam
        payload.isSchoolSpecific = false;
        payload.isAllBoards = true;
        payload.targetSchools = [];
      }

      const endpoint = isEditing && editingExamId
        ? `${API_BASE_URL}/api/super-admin/exams/${editingExamId}`
        : `${API_BASE_URL}/api/super-admin/exams`;
      console.log('🌐 Exam save endpoint:', endpoint, 'method:', isEditing ? 'PUT' : 'POST');

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('📦 Exam save response:', { status: response.status, ok: response.ok, data });

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: isEditing ? 'Exam updated successfully' : 'Exam created successfully'
        });
        setIsDialogOpen(false);
        setIsEditing(false);
        setEditingExamId(null);
        setClassModalSearch('');
        setFormData({
          title: '',
          description: '',
          examType: 'mains',
          classNumber: '',
          assignedClasses: [],
          subjects: ['maths'],
          maxAttempts: '1',
          board: 'ASLI_EXCLUSIVE_SCHOOLS',
          filterType: 'all-schools',
          selectedSchools: [],
          duration: '',
          totalQuestions: '',
          totalMarks: '',
          instructions: '',
          startDate: '',
          endDate: ''
        });
        await fetchExams();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to save exam',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create CSV template
    const headers = [
      'title',
      'description',
      'examType',
      'classNumber',
      'subject',
      'maxAttempts',
      'board',
      'duration',
      'totalQuestions',
      'totalMarks',
      'instructions',
      'startDate',
      'endDate',
      'filterType',
      'targetSchools'
    ];
    
    const exampleRow = [
      'JEE Mains Mock Test 2024',
      'Mock test for JEE Mains preparation',
      'mains',
      '10',
      'maths',
      '1',
      'ASLI_EXCLUSIVE_SCHOOLS',
      '180',
      '90',
      '360',
      'Read all instructions carefully',
      '2024-12-25T10:00:00',
      '2024-12-25T13:00:00',
      'all-schools',
      ''
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'exam_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Template Downloaded',
      description: 'CSV template downloaded successfully. Fill it with your exam data and upload it.',
    });
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast({
        title: 'Validation Error',
        description: 'Please select a CSV file',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingCsv(true);
    setCsvUploadResults(null);
    
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCsvUploadResults({
          success: data.created || data.data?.length || 0,
          errors: data.errors || []
        });
        toast({
          title: 'Success',
          description: `Successfully created ${data.created || data.data?.length || 0} exam(s)${data.errors?.length > 0 ? ` with ${data.errors.length} error(s)` : ''}`,
        });
        fetchExams();
        // Reset file input
        setCsvFile(null);
        // Close dialog after 3 seconds if successful
        if (!data.errors || data.errors.length === 0) {
          setTimeout(() => {
            setIsCsvDialogOpen(false);
            setCsvUploadResults(null);
          }, 3000);
        }
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to upload CSV file',
          variant: 'destructive'
        });
        setCsvUploadResults({
          success: 0,
          errors: [data.message || 'Upload failed']
        });
      }
    } catch (error) {
      console.error('Failed to upload CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload CSV file. Please try again.',
        variant: 'destructive'
      });
      setCsvUploadResults({
        success: 0,
        errors: ['Network error: Failed to upload file']
      });
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This will also delete all associated questions.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams/${examId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Exam deleted successfully'
        });
        fetchExams();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to delete exam',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to delete exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete exam',
        variant: 'destructive'
      });
    }
  };

  const getExamTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'mains': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      case 'weekend': return 'bg-green-100 text-green-800';
      case 'practice': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBoardBadgeColor = (board: string) => {
    switch (board) {
      case 'ASLI_EXCLUSIVE_SCHOOLS': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExams = exams.filter((exam) => {
    const schoolMatches = selectedSchool === 'all-schools'
      ? true
      : (!exam.isSchoolSpecific || (exam.targetSchools || []).some((school: any) => {
          const schoolId = typeof school === 'string' ? school : school._id;
          return schoolId === selectedSchool;
        }));

    const examClasses = getExamClassStrings(exam);
    const classMatches =
      selectedClass === 'all-classes'
        ? true
        : examClasses.map((c) => String(c)).includes(String(selectedClass));

    return schoolMatches && classMatches;
  });
  const dedupedFilteredExams = (() => {
    const byKey = new Map<string, Exam>();
    filteredExams.forEach((exam) => {
      const key = examDisplayDedupKey(exam);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, exam);
        return;
      }

      const existingSubjectCount = getExamSubjects(existing).length;
      const nextSubjectCount = getExamSubjects(exam).length;
      if (nextSubjectCount > existingSubjectCount) {
        byKey.set(key, exam);
        return;
      }

      if (nextSubjectCount === existingSubjectCount && getExamTimestamp(exam) > getExamTimestamp(existing)) {
        byKey.set(key, exam);
      }
    });
    return Array.from(byKey.values());
  })();
  const groupedExams = dedupedFilteredExams.reduce((acc, exam) => {
    const examClassLabels = getExamClassStrings(exam);
    const classBuckets = examClassLabels.length > 0 ? examClassLabels : ['unassigned'];

    classBuckets.forEach((classKey) => {
      if (!acc[classKey]) {
        acc[classKey] = [];
      }
      acc[classKey].push(exam);
    });

    return acc;
  }, {} as Record<string, Exam[]>);
  Object.keys(groupedExams).forEach((classKey) => {
    groupedExams[classKey].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  });
  const classSectionKeys = Object.keys(groupedExams).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return Number(a) - Number(b);
  });

  const classWiseStats = CLASS_OPTIONS
    .map((cls) => {
      const count = exams.filter((exam) => {
        const classes = getExamClassStrings(exam);
        return classes.map((c) => String(c)).includes(String(cls));
      }).length;
      return { cls, count };
    })
    .filter((x) => x.count > 0);
  const availableQuestionSubjects = useMemo(() => {
    if (!selectedExam) {
      return EXAM_SUBJECTS.map((s) => s.value);
    }
    const subjects = getExamSubjects(selectedExam);
    return subjects.length > 0 ? subjects : EXAM_SUBJECTS.map((s) => s.value);
  }, [selectedExam]);

  useEffect(() => {
    if (!selectedExam) return;
    if (!availableQuestionSubjects.includes(questionFormData.subject as any)) {
      setQuestionFormData((prev) => ({
        ...prev,
        subject: availableQuestionSubjects[0] || 'maths',
      }));
    }
  }, [selectedExam, availableQuestionSubjects, questionFormData.subject]);

  const openCreateExamDialog = () => {
    setIsEditing(false);
    setEditingExamId(null);
    setClassModalSearch('');
    setFormData({
      title: '',
      description: '',
      examType: 'mains',
      classNumber: '',
      assignedClasses: [],
      subjects: ['maths'],
      maxAttempts: '1',
      board: 'ASLI_EXCLUSIVE_SCHOOLS',
      filterType: 'all-schools',
      selectedSchools: [],
      duration: '',
      totalQuestions: '',
      totalMarks: '',
      instructions: '',
      startDate: '',
      endDate: ''
    });
    setIsDialogOpen(true);
  };

  const openEditExamDialog = (exam: Exam) => {
    const assigned = getExamClassStrings(exam);
    setIsEditing(true);
    setEditingExamId(exam._id);
    setClassModalSearch('');
    setFormData({
      title: exam.title || '',
      description: exam.description || '',
      examType: exam.examType || 'mains',
      classNumber: assigned[0] || '',
      assignedClasses: assigned,
      subjects: getExamSubjects(exam).length > 0
        ? getExamSubjects(exam)
        : ['maths'],
      maxAttempts: String(exam.maxAttempts || 1),
      board: exam.board || 'ASLI_EXCLUSIVE_SCHOOLS',
      filterType: exam.isSchoolSpecific ? 'specific-schools' : 'all-schools',
      selectedSchools: exam.targetSchools?.map((s: any) => s._id || s).filter(Boolean) || [],
      duration: String(exam.duration || ''),
      totalQuestions: String(exam.totalQuestions || ''),
      totalMarks: String(exam.totalMarks || ''),
      instructions: exam.instructions || '',
      startDate: toDateTimeLocalInput(exam.startDate),
      endDate: toDateTimeLocalInput(exam.endDate)
    });
    if (exam.isSchoolSpecific && schools.length === 0) {
      fetchSchools();
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">Exam Management</h2>
          <p className="text-gray-600 mt-1">Create and manage exams</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-2xl"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Bulk Upload Exams via CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to create multiple exams at once. Download the template to see the required format.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm">Need a template?</p>
                    <p className="text-xs text-gray-600">Download the CSV template with example data</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="border-blue-500 text-blue-600 hover:bg-blue-100"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="csvFile">Select Excel (.xlsx) or CSV File *</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        setCsvUploadResults(null);
                      }
                    }}
                    className="mt-1 cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-200"
                  />
                  <p className={`text-xs mt-1 ${csvFile ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
                    {csvFile ? `Selected file: ${csvFile.name}` : 'No file selected yet'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    File should contain: title, description, examType, classNumber, subject, maxAttempts, board, duration, totalQuestions, totalMarks, instructions, startDate, endDate, filterType, targetSchools
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Tip: upload the original .xlsx file to keep characters like °, ², ³, θ, π, √, Δ, ≤, ≥. Plain CSV exports from Excel drop these.
                  </p>
                </div>

                {csvUploadResults && (
                  <div className={`p-4 rounded-lg ${csvUploadResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                    <p className="font-semibold text-sm mb-2">
                      {csvUploadResults.success > 0 ? `✅ Successfully created ${csvUploadResults.success} exam(s)` : '❌ No exams created'}
                    </p>
                    {csvUploadResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-yellow-800 mb-1">Errors:</p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                          {csvUploadResults.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCsvDialogOpen(false);
                  setCsvFile(null);
                  setCsvUploadResults(null);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCsvUpload} 
                  disabled={isUploadingCsv || !csvFile}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  {isUploadingCsv ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateExamDialog} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Exam
              </Button>
            </DialogTrigger>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
              <DialogDescription>
                Create a new exam for students. You can make it available to all schools or specific schools only. Exams can be Mains, Advanced, Weekend, or Practice type.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., JEE Mains Mock Test 2024"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the exam"
                  rows={3}
                />
              </div>
                <div>
                <Label htmlFor="filterType">Exam Visibility *</Label>
                  <Select
                  value={formData.filterType}
                  onValueChange={(value: FilterType) => {
                    setFormData({ 
                      ...formData, 
                      filterType: value,
                      selectedSchools: value !== 'specific-schools' ? [] : formData.selectedSchools
                    });
                    if (value === 'specific-schools' && schools.length === 0) {
                      fetchSchools();
                    }
                  }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all-schools">All Schools (All schools can see)</SelectItem>
                    <SelectItem value="specific-schools">Specific Schools (Only selected schools)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.filterType === 'specific-schools' && (
                <div>
                  <Label htmlFor="schools">Select Schools *</Label>
                  {isLoadingSchools ? (
                    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span>Loading schools...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {schools.length === 0 ? (
                        <p className="text-sm text-gray-500">No schools available</p>
                      ) : (
                        schools.map((school) => (
                          <div key={school.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`school-${school.id}`}
                              checked={formData.selectedSchools.includes(school.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedSchools: [...formData.selectedSchools, school.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedSchools: formData.selectedSchools.filter(id => id !== school.id)
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border border-gray-400 accent-orange-500"
                            />
                            <Label htmlFor={`school-${school.id}`} className="text-sm cursor-pointer">
                              {school.name} (Asli Exclusive Schools)
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {formData.filterType === 'specific-schools' && formData.selectedSchools.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ Please select at least one school</p>
                  )}
                </div>
              )}


              <div>
                <Label htmlFor="examType">Exam Type *</Label>
                <Select
                  value={formData.examType}
                  onValueChange={(value: any) => setFormData({ ...formData, examType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="classSearch">Assigned Classes *</Label>
                  <Input
                    id="classSearch"
                    value={classModalSearch}
                    onChange={(e) => setClassModalSearch(e.target.value)}
                    placeholder="Search class..."
                  />
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-md border bg-white p-2 space-y-2">
                    {CLASS_OPTIONS.filter((cls) => `Class ${cls}`.toLowerCase().includes(classModalSearch.toLowerCase())).map((cls) => (
                      <label key={cls} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.assignedClasses.includes(cls)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const next = [...formData.assignedClasses, cls];
                              setFormData({ ...formData, assignedClasses: next, classNumber: next[0] || '' });
                            } else {
                              const next = formData.assignedClasses.filter((c) => c !== cls);
                              setFormData({ ...formData, assignedClasses: next, classNumber: next[0] || '' });
                            }
                          }}
                          className="h-4 w-4 rounded border border-gray-400 accent-orange-500"
                        />
                        <span>{`Class ${cls}`}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.assignedClasses.map((cls) => (
                      <Badge key={cls} className="bg-sky-100 text-sky-700 font-semibold rounded-full">
                        {`Class ${cls}`}
                        <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => {
                          const next = formData.assignedClasses.filter((c) => c !== cls);
                          setFormData({ ...formData, assignedClasses: next, classNumber: next[0] || '' });
                        }} />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Subjects *</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-md border bg-white p-2 space-y-2">
                    {EXAM_SUBJECTS.map((subject) => (
                      <label key={subject.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.subjects.includes(subject.value as any)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                subjects: formData.subjects.includes(subject.value as any)
                                  ? formData.subjects
                                  : [...formData.subjects, subject.value as any]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                subjects: formData.subjects.filter((s) => s !== subject.value)
                              });
                            }
                          }}
                          className="h-4 w-4 rounded border border-gray-400 accent-orange-500"
                        />
                        <span>{subject.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Multiple subjects are saved under a single exam.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.subjects.map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] bg-gray-50">
                        {EXAM_SUBJECTS.find((x) => x.value === s)?.label || normalizeDisplayText(s)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="maxAttempts">No. of Attempts *</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    min={1}
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({ ...formData, maxAttempts: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="180"
                  />
                </div>
                <div>
                  <Label htmlFor="totalQuestions">Total Questions *</Label>
                  <Input
                    id="totalQuestions"
                    type="number"
                    value={formData.totalQuestions}
                    onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })}
                    placeholder="90"
                  />
                </div>
                <div>
                  <Label htmlFor="totalMarks">Total Marks *</Label>
                  <Input
                    id="totalMarks"
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                    placeholder="360"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Exam instructions and guidelines"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveExam} disabled={isCreating} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">
                {isCreating ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Exam' : 'Create Exam')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      {classWiseStats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {classWiseStats.map((item) => (
            <Badge key={item.cls} className="bg-sky-100 text-sky-700 font-semibold rounded-full">
              {`Class ${item.cls} -> ${item.count} Exams`}
            </Badge>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-center">
          {/* Quick Add Questions Option */}
          {dedupedFilteredExams.length > 0 ? (
            <Select
              value=""
              onValueChange={(examId) => {
                const exam = dedupedFilteredExams.find(e => e._id === examId);
                if (exam) {
                  setSelectedExam(exam);
                  setIsQuestionDialogOpen(true);
                  fetchQuestions(exam._id);
                }
              }}
            >
              <SelectTrigger className="h-10 rounded-md border border-gray-300 bg-white text-sm">
                <SelectValue placeholder="Quick Add Questions" />
              </SelectTrigger>
              <SelectContent>
                {dedupedFilteredExams.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id}>
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-3.5 w-3.5" />
                      <span className="truncate">{exam.title}</span>
                      {exam.questions && exam.questions.length > 0 && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {exam.questions.length} Q
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div />
          )}

          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="h-10 rounded-md border border-gray-300 bg-white text-sm">
              <div className="flex items-center gap-2">
                <School className="h-3.5 w-3.5 text-gray-600" />
                <SelectValue placeholder="All Schools" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-schools">All Schools</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-10 rounded-md border border-gray-300 bg-white text-sm">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5 text-gray-600" />
                <SelectValue placeholder="All Classes" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-classes">All Classes</SelectItem>
              {CLASS_OPTIONS.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {`Class ${cls}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex xl:justify-end">
            <Badge variant="outline" className="w-fit bg-white">
              {dedupedFilteredExams.length} {dedupedFilteredExams.length === 1 ? 'Exam' : 'Exams'}
            </Badge>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3 text-gray-600">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <p className="text-sm font-medium">Loading exams...</p>
            </div>
          </CardContent>
        </Card>
      ) : dedupedFilteredExams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No exams found</p>
            <p className="text-sm text-gray-400 mt-2">
              Create your first exam to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {classSectionKeys.map((classKey) => {
            const classLabel = classKey === 'unassigned' ? 'Unassigned Class' : `Class ${classKey}`;
            const classExams = groupedExams[classKey];

            return (
              <section key={classKey} className="space-y-5">
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{classLabel}</h3>
                </div>

                <div className="grid grid-cols-1 items-stretch md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {classExams.map((exam) => {
                        const examClassLabels = getExamClassStrings(exam);
                        const examSubjects = getExamSubjects(exam);

                        return (
                          <Card className="flex h-full flex-col border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="px-4 pb-2 pt-4">
                              <div className="space-y-2">
                                <CardTitle className="text-base font-bold text-gray-900 leading-tight line-clamp-2">{exam.title}</CardTitle>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge className={`${getExamTypeBadgeColor(exam.examType)} border text-[11px]`}>
                                    {EXAM_TYPES.find(t => t.value === exam.examType)?.label}
                                  </Badge>
                                  {exam.isActive ? (
                                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-[11px]">Active</Badge>
                                  ) : (
                                    <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[11px]">Inactive</Badge>
                                  )}
                                  <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-[11px]">Asli Exclusive Schools</Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-1">
                              <div className="min-h-0 flex-1 space-y-3">
                                {exam.description && (
                                  <p className="text-xs text-gray-600 line-clamp-2">{exam.description}</p>
                                )}
                                <div className="space-y-1.5 text-xs text-gray-600">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                                    <span>{exam.duration} min</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                                    <span>{exam.totalQuestions} questions · {exam.totalMarks} marks</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                                    <span>{exam.maxAttempts || 1} attempt(s)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                                    <span>
                                      {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {examSubjects.map((subj) => (
                                    <Badge key={`${exam._id}-subject-${subj}`} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                      {EXAM_SUBJECTS.find((x) => x.value === subj)?.label || normalizeDisplayText(subj)}
                                    </Badge>
                                  ))}
                                  {examClassLabels.length > 0 ? (
                                    examClassLabels.map((cls: string, idx: number) => (
                                      <Badge key={`${exam._id}-class-${idx}`} variant="outline" className="text-[10px] bg-gray-50">
                                        {`Class ${cls}`}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] bg-gray-50">No Class Assigned</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="mt-auto grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 select-none">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 justify-center px-2 text-xs select-none"
                                  onClick={() => openEditExamDialog(exam)}
                                >
                                  <Edit className="mr-1 h-3.5 w-3.5 shrink-0" />
                                  <span className="whitespace-nowrap">Edit</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 justify-center px-2 text-xs select-none"
                                  onClick={() => {
                                    setSelectedExam(exam);
                                    setIsQuestionDialogOpen(true);
                                    fetchQuestions(exam._id);
                                  }}
                                >
                                  <FileQuestion className="mr-1 h-3.5 w-3.5 shrink-0" />
                                  <span className="whitespace-nowrap">Add Questions</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="col-span-2 h-8 justify-center px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 select-none"
                                  onClick={() => handleDeleteExam(exam._id)}
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5 shrink-0" />
                                  <span className="whitespace-nowrap">Delete</span>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Question Management Dialog */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={(open) => {
        setIsQuestionDialogOpen(open);
        if (!open) {
          // Reset CSV upload state when dialog closes
          setQuestionCsvFile(null);
          setQuestionPdfFile(null);
          setQuestionCsvUploadResults(null);
          setPdfQuestionRows([]);
          setPdfPreviewPage(1);
          setBulkQuestionUploadMode('csv');
          setPendingDeleteQuestion(null);
        }
      }}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Manage Questions - {selectedExam?.title}</DialogTitle>
            <DialogDescription>
              Add single MCQ, multiple MCQ, or integer type questions to this exam
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* CSV Upload Section */}
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Bulk Upload Questions via CSV</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQuestionTemplate}
                    className="border-blue-500 text-blue-600 hover:bg-blue-100"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={bulkQuestionUploadMode === 'csv' ? 'default' : 'outline'}
                  onClick={() => setBulkQuestionUploadMode('csv')}
                >
                  Upload CSV/XLSX
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulkQuestionUploadMode === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setBulkQuestionUploadMode('pdf')}
                >
                  Upload from PDF
                </Button>
              </div>
              {bulkQuestionUploadMode === 'csv' ? (
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <div>
                  <Label htmlFor="questionCsvFile">Select Excel (.xlsx) or CSV File *</Label>
                  <Input
                    id="questionCsvFile"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setQuestionCsvFile(file);
                        setQuestionCsvUploadResults(null);
                        prefillQuestionFormFromCsv(file);
                      }
                    }}
                    className="mt-1 cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-200"
                  />
                  <p className={`text-xs mt-1 ${questionCsvFile ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
                    {questionCsvFile ? `Selected file: ${questionCsvFile.name}` : 'No file selected yet'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    File should contain: questionText, questionType, subject, marks, options (option1-option4), correctAnswer/correctAnswers/integerAnswer
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Tip: upload the original .xlsx to preserve x², x³, θ, π, √, Δ, ≤, ≥. A plain Excel CSV export silently replaces these with "?".
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={allowDuplicateQuestionsInCsv}
                    onChange={(e) => setAllowDuplicateQuestionsInCsv(e.target.checked)}
                    className="h-4 w-4 rounded border border-gray-400 accent-orange-500"
                  />
                  Allow duplicate questions in this upload
                </label>
                {questionCsvUploadResults && (
                  <div className={`p-3 rounded-lg ${questionCsvUploadResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                    <p className="font-semibold text-sm mb-2">
                      {questionCsvUploadResults.success > 0 ? `✅ Successfully created ${questionCsvUploadResults.success} question(s)` : '❌ No questions created'}
                    </p>
                    {questionCsvUploadResults.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-yellow-800 mb-1">Errors:</p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
                          {questionCsvUploadResults.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  onClick={handleQuestionCsvUpload}
                  disabled={isUploadingQuestionCsv || !questionCsvFile}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  {isUploadingQuestionCsv ? 'Uploading...' : 'Upload Questions CSV'}
                </Button>
              </div>
              ) : (
                <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                  <div>
                    <Label htmlFor="questionPdfFile">Select PDF File *</Label>
                    <Input
                      id="questionPdfFile"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setQuestionPdfFile(file);
                        setPdfQuestionRows([]);
                        setPdfPreviewPage(1);
                      }}
                      className="mt-1 cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-200"
                    />
                    <p className={`text-xs mt-1 ${questionPdfFile ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
                      {questionPdfFile ? `Selected file: ${questionPdfFile.name}` : 'No PDF selected yet'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleExtractQuestionsFromPdf}
                    disabled={isExtractingPdfQuestions || !questionPdfFile}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white"
                  >
                    {isExtractingPdfQuestions ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                        <span>Extracting questions from PDF...</span>
                      </span>
                    ) : (
                      'Extract Questions from PDF'
                    )}
                  </Button>
                  <p className="text-xs text-slate-500">
                    Tip: multi-page papers often need 1–3 minutes. Very large PDFs may take longer; the button shows a
                    spinner while extraction runs.
                  </p>

                  {pdfQuestionRows.length > 0 && (
                    <div className="space-y-3 rounded-md border border-blue-200 bg-white p-3">
                      <p className="text-xs text-blue-700">
                        Preview only: extracted questions are not saved until you click <span className="font-semibold">Upload These Questions</span>.
                      </p>
                      {pdfRowsMissingSubject && (
                        <div
                          role="status"
                          className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900"
                        >
                          Some questions have no subject detected. Please review and fill in the subject before
                          uploading.
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          Preview ({pdfQuestionRows.length} question{pdfQuestionRows.length === 1 ? '' : 's'})
                        </p>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={handleDownloadExtractedCsv}>
                            <Download className="mr-1 h-3.5 w-3.5" />
                            Download as CSV
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleUploadExtractedQuestions}
                            disabled={isUploadingExtractedQuestions || pdfSubjectInvalidForUpload}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isUploadingExtractedQuestions ? 'Uploading...' : 'Upload These Questions'}
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto border rounded-md">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-2">#</th>
                              <th className="text-left p-2">Question</th>
                              <th className="text-left p-2">Type</th>
                              <th className="text-left p-2">Subject</th>
                              <th className="text-left p-2">Marks</th>
                              <th className="text-left p-2">Answer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pdfQuestionRows.slice((pdfPreviewPage - 1) * 10, pdfPreviewPage * 10).map((row, i) => {
                              const globalIdx = (pdfPreviewPage - 1) * 10 + i;
                              return (
                              <tr key={`${row.row}-${globalIdx}`} className="border-t">
                                <td className="p-2">{(pdfPreviewPage - 1) * 10 + i + 1}</td>
                                <td className="p-2 max-w-[420px] truncate" title={row.questionText}>{row.questionText}</td>
                                <td className="p-2">{String(row.questionType || '').toUpperCase()}</td>
                                <td className="p-1 align-middle min-w-[120px]">
                                  <Input
                                    type="text"
                                    className="h-8 text-xs"
                                    value={row.subject}
                                    placeholder="e.g. maths"
                                    title="Click to edit subject (maths, physics, chemistry, biology)"
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setPdfQuestionRows((prev) =>
                                        prev.map((x, j) => (j === globalIdx ? { ...x, subject: v } : x)),
                                      );
                                    }}
                                  />
                                </td>
                                <td className="p-2">{row.marks}</td>
                                <td className="p-2 max-w-[200px] truncate" title={row.correctAnswer}>{row.correctAnswer}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {pdfQuestionRows.length > 10 && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pdfPreviewPage <= 1}
                            onClick={() => setPdfPreviewPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </Button>
                          <span className="text-xs text-slate-600">
                            Page {pdfPreviewPage} / {Math.ceil(pdfQuestionRows.length / 10)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pdfPreviewPage >= Math.ceil(pdfQuestionRows.length / 10)}
                            onClick={() => setPdfPreviewPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {questionCsvUploadResults && (
                    <div className={`p-3 rounded-lg ${questionCsvUploadResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                      <p className="font-semibold text-sm mb-2">
                        {questionCsvUploadResults.success > 0 ? `✅ Successfully created ${questionCsvUploadResults.success} question(s)` : '❌ No questions created'}
                      </p>
                      {questionCsvUploadResults.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-yellow-800 mb-1">Row issues:</p>
                          <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1 max-h-36 overflow-y-auto">
                            {questionCsvUploadResults.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* View All Questions Section */}
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">All Questions ({questions.length})</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleDeleteAllQuestions}
                  disabled={isDeletingAllQuestions || questions.length === 0}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  {isDeletingAllQuestions ? 'Deleting...' : 'Delete All Questions'}
                </Button>
              </div>
              {isLoadingQuestions ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading questions...</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileQuestion className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No questions added yet</p>
                  <p className="text-sm mt-1">Upload a CSV file or add questions manually below</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {questions.map((q: any, idx: number) => (
                    <Card key={q._id || idx} className="p-4 border-l-4 border-l-blue-500">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-semibold">
                                Q{idx + 1}
                              </Badge>
                              <Badge variant="outline" className={
                                q.questionType === 'mcq' ? 'bg-blue-100 text-blue-800' :
                                q.questionType === 'multiple' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {q.questionType?.toUpperCase() || 'MCQ'}
                              </Badge>
                              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                                {q.subject?.toUpperCase() || 'MATHS'}
                              </Badge>
                              <Badge variant="outline" className="bg-teal-100 text-teal-800">
                                {q.marks} mark{q.marks !== 1 ? 's' : ''}
                              </Badge>
                              {q.negativeMarks > 0 && (
                                <Badge variant="outline" className="bg-red-100 text-red-800">
                                  -{q.negativeMarks} negative
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2">
                              {q.questionImage ? (
                                <div className="mb-2">
                                  <img 
                                    src={q.questionImage} 
                                    alt="Question" 
                                    className="max-w-full h-auto rounded-md border"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : null}
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                {formatChemistryText(q.questionText || 'Image question', q.subject)}
                              </p>
                              {(q.questionType === 'mcq' || q.questionType === 'multiple') && q.options && q.options.length > 0 && (
                                <div className="space-y-1 mt-3">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Options:</p>
                                  {q.options.map((option: any, optIdx: number) => {
                                    const isCorrect = Array.isArray(q.correctAnswer) 
                                      ? q.correctAnswer.includes(option.text)
                                      : q.correctAnswer === option.text;
                                    return (
                                      <div 
                                        key={optIdx} 
                                        className={`p-2 rounded text-sm ${
                                          isCorrect 
                                            ? 'bg-green-50 border border-green-300 text-green-900' 
                                            : 'bg-gray-50 border border-gray-200 text-gray-700'
                                        }`}
                                      >
                                        <span className="font-semibold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                                        {formatChemistryText(option.text || option, q.subject)}
                                        {isCorrect && (
                                          <Badge className="ml-2 bg-green-600 text-white text-xs">Correct</Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {q.questionType === 'integer' && (
                                <div className="mt-3 p-2 bg-green-50 border border-green-300 rounded">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Correct Answer:</p>
                                  <p className="text-sm font-bold text-green-900">{formatChemistryText(q.correctAnswer, q.subject)}</p>
                                </div>
                              )}
                              {q.explanation && (
                                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Explanation:</p>
                                  <p className="text-sm text-gray-700">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-600"
                            onClick={() => setPendingDeleteQuestion({ id: String(q._id), index: idx })}
                            aria-label={`Delete question ${idx + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Question Form */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold">Add New Question (Single)</h3>
              
              <div>
                <Label>Question Type *</Label>
                <Select
                  value={questionFormData.questionType}
                  onValueChange={(value: any) => {
                    setQuestionFormData({
                      ...questionFormData,
                      questionType: value,
                      correctAnswer: '',
                      correctAnswers: [],
                      integerAnswer: ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Single MCQ</SelectItem>
                    <SelectItem value="multiple">Multiple MCQ</SelectItem>
                    <SelectItem value="integer">Integer Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subject *</Label>
                <Select
                  value={questionFormData.subject}
                  onValueChange={(value) => setQuestionFormData({ ...questionFormData, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuestionSubjects.map((subjectValue: string) => (
                      <SelectItem key={subjectValue} value={subjectValue}>
                        {EXAM_SUBJECTS.find((s) => s.value === subjectValue)?.label || normalizeDisplayText(subjectValue)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Question Text (Optional)</Label>
                <Textarea
                  value={questionFormData.questionText}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, questionText: e.target.value })}
                  placeholder="Enter the question text..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">You can leave this empty and upload a question image below.</p>
              </div>

              <div>
                <Label>Question Image File (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleQuestionImageUpload(file);
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose an image file. It will be uploaded and stored on your server.
                </p>
                {isUploadingQuestionImage && (
                  <p className="text-xs text-blue-600 mt-1">Uploading image...</p>
                )}
                {questionFormData.questionImage && (
                  <div className="mt-3 space-y-2">
                    <img
                      src={questionFormData.questionImage}
                      alt="Uploaded question preview"
                      className="max-h-40 rounded border"
                    />
                    <div className="flex items-center gap-2">
                      {questionImageFile?.name && (
                        <span className="text-xs text-gray-600">{questionImageFile.name}</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQuestionImageFile(null);
                          setQuestionFormData((prev) => ({ ...prev, questionImage: '' }));
                        }}
                      >
                        Remove Image
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Options for MCQ/Multiple */}
              {(questionFormData.questionType === 'mcq' || questionFormData.questionType === 'multiple') && (
                <div className="space-y-3">
                  <Label>Options</Label>
                  {questionFormData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...questionFormData.options];
                          newOptions[index] = e.target.value;
                          setQuestionFormData({ ...questionFormData, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                      {questionFormData.questionType === 'mcq' && (
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={questionFormData.correctAnswer === String(index)}
                          onChange={() => setQuestionFormData({ ...questionFormData, correctAnswer: String(index) })}
                          className="h-4 w-4 border border-gray-400 accent-orange-500"
                        />
                      )}
                      {questionFormData.questionType === 'multiple' && (
                        <input
                          type="checkbox"
                          checked={questionFormData.correctAnswers.includes(String(index))}
                          onChange={(e) => {
                            const answers = e.target.checked
                              ? [...questionFormData.correctAnswers, String(index)]
                              : questionFormData.correctAnswers.filter((ans: string) => ans !== String(index));
                            setQuestionFormData({ ...questionFormData, correctAnswers: answers });
                          }}
                          className="h-4 w-4 rounded border border-gray-400 accent-orange-500"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newOptions = questionFormData.options.filter((_, i) => i !== index);
                          setQuestionFormData({ ...questionFormData, options: newOptions });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestionFormData({
                        ...questionFormData,
                        options: [...questionFormData.options, '']
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              )}

              {/* Integer Answer */}
              {questionFormData.questionType === 'integer' && (
                <div>
                  <Label>Correct Answer (Integer) *</Label>
                  <Input
                    type="number"
                    value={questionFormData.integerAnswer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, integerAnswer: e.target.value })}
                    placeholder="Enter the integer answer"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Marks *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    value={questionFormData.marks}
                    onChange={(e) =>
                      setQuestionFormData({
                        ...questionFormData,
                        marks: sanitizeMarksInput(e.target.value),
                      })
                    }
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Negative Marks</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    value={questionFormData.negativeMarks}
                    onChange={(e) =>
                      setQuestionFormData({
                        ...questionFormData,
                        negativeMarks: sanitizeNegativeMarksInput(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Enter positive value only. System applies it as deduction.
                  </p>
                </div>
              </div>

              <div>
                <Label>Explanation (Optional)</Label>
                <Textarea
                  value={questionFormData.explanation}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                  placeholder="Explain the correct answer..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleAddQuestion} disabled={isAddingQuestion}>
              {isAddingQuestion ? 'Adding...' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteQuestion} onOpenChange={(open) => !open && setPendingDeleteQuestion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Q{(pendingDeleteQuestion?.index ?? 0) + 1}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteQuestion();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

