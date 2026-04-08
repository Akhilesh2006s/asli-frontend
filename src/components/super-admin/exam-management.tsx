import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/lib/api-config';
import { getExamClassStrings } from '@/lib/exam-classes';
import { Plus, Trash2, Edit, Eye, Calendar, Clock, BookOpen, FileQuestion, X, Upload, Download, School, GraduationCap } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  classNumber?: string;
  subject: 'maths' | 'physics' | 'chemistry' | 'biology';
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
}

const BOARDS = [
  { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'Asli Exclusive Schools' }
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

const normalizeDisplayText = (value?: string) =>
  (value || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
  const [isUploadingQuestionCsv, setIsUploadingQuestionCsv] = useState(false);
  const [questionCsvUploadResults, setQuestionCsvUploadResults] = useState<{ success: number; errors: string[] } | null>(null);
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
    subject: 'maths' as 'maths' | 'physics' | 'chemistry' | 'biology',
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

  const handleAddQuestion = async () => {
    if (!selectedExam) return;

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

    setIsAddingQuestion(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams/${selectedExam._id}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionText: questionFormData.questionText.trim(),
          questionImage: questionFormData.questionImage.trim() || undefined,
          questionType: questionFormData.questionType,
          options: formattedOptions,
          correctAnswer,
          marks: parseInt(questionFormData.marks) || 1,
          negativeMarks: parseFloat(questionFormData.negativeMarks) || 0,
          explanation: questionFormData.explanation.trim() || undefined,
          subject: questionFormData.subject,
          board: selectedExam.board
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Question added successfully'
        });
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
        fetchQuestions(selectedExam._id);
        fetchExams(); // Refresh exam list to update question count
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
        setSchools(adminsList.map((admin: any) => ({
          id: admin.id || admin._id,
          name: admin.schoolName || admin.name,
          email: admin.email,
          board: admin.board
        })));
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
            return {
              ...ex,
              assignedClasses: labels,
              classNumber: labels[0] ?? ex.classNumber ?? '',
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
    if (!formData.title || formData.assignedClasses.length === 0 || !formData.subject || !formData.maxAttempts || !formData.duration || !formData.totalQuestions || !formData.totalMarks || !formData.startDate || !formData.endDate) {
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
      
      // Prepare payload based on filter type
      const payload: any = {
        title: formData.title,
        description: formData.description,
        examType: formData.examType,
        classNumber: formData.assignedClasses[0],
        assignedClasses: formData.assignedClasses,
        subject: formData.subject,
        maxAttempts: parseInt(formData.maxAttempts, 10),
        board: formData.board,
        duration: parseInt(formData.duration),
        totalQuestions: parseInt(formData.totalQuestions),
        totalMarks: parseInt(formData.totalMarks),
        instructions: formData.instructions,
        startDate: formData.startDate,
        endDate: formData.endDate
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
          subject: 'maths',
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

  const classWiseStats = CLASS_OPTIONS
    .map((cls) => {
      const count = exams.filter((exam) => {
        const classes = getExamClassStrings(exam);
        return classes.map((c) => String(c)).includes(String(cls));
      }).length;
      return { cls, count };
    })
    .filter((x) => x.count > 0);

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
      subject: 'maths',
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
      subject: (exam.subject || 'maths') as any,
      maxAttempts: String(exam.maxAttempts || 1),
      board: exam.board || 'ASLI_EXCLUSIVE_SCHOOLS',
      filterType: exam.isSchoolSpecific ? 'specific-schools' : 'all-schools',
      selectedSchools: exam.targetSchools?.map((s: any) => s._id || s).filter(Boolean) || [],
      duration: String(exam.duration || ''),
      totalQuestions: String(exam.totalQuestions || ''),
      totalMarks: String(exam.totalMarks || ''),
      instructions: exam.instructions || '',
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 16) : '',
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 16) : ''
    });
    if (exam.isSchoolSpecific && schools.length === 0) {
      fetchSchools();
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
          <p className="text-gray-600 mt-1">Create and manage exams</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                  <Label htmlFor="csvFile">Select CSV File *</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        setCsvUploadResults(null);
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV file should contain: title, description, examType, classNumber, subject, maxAttempts, board, duration, totalQuestions, totalMarks, instructions, startDate, endDate, filterType, targetSchools
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
              <Button onClick={openCreateExamDialog} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Exam
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <p className="text-sm text-gray-500">Loading schools...</p>
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
                              className="rounded"
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
                          className="rounded"
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
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value: any) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_SUBJECTS.map((subject) => (
                        <SelectItem key={subject.value} value={subject.value}>
                          {subject.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Quick Add Questions Option */}
        {filteredExams.length > 0 && (
          <div className="relative">
            <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-300 to-purple-400 rounded-md"></div>
            <Select 
              value="" 
              onValueChange={(examId) => {
                const exam = filteredExams.find(e => e._id === examId);
                if (exam) {
                  setSelectedExam(exam);
                  setIsQuestionDialogOpen(true);
                  fetchQuestions(exam._id);
                }
              }}
            >
              <SelectTrigger className="w-full min-h-11 relative z-10 rounded-xl border border-gray-200 bg-white px-[14px] py-[10px] focus:ring-2 focus:ring-purple-500 focus:ring-offset-0">
                <SelectValue placeholder="Quick Add Questions" />
              </SelectTrigger>
              <SelectContent>
                {filteredExams.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id}>
                    <div className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4" />
                      <span>{exam.title}</span>
                      {exam.questions && exam.questions.length > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {exam.questions.length} Q
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="relative">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-sky-300 to-teal-400 rounded-md"></div>
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-full min-h-11 relative z-10 rounded-xl border border-gray-200 bg-white px-[14px] py-[10px] focus:ring-2 focus:ring-teal-500 focus:ring-offset-0">
              <div className="flex items-center gap-2">
                <School className="h-4 w-4 text-gray-600" />
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
        </div>

        <div className="relative">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-sky-300 to-teal-400 rounded-md"></div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full min-h-11 relative z-10 rounded-xl border border-gray-200 bg-white px-[14px] py-[10px] focus:ring-2 focus:ring-teal-500 focus:ring-offset-0">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-gray-600" />
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
        </div>
      </div>
      <Badge variant="outline" className="w-fit">
        {filteredExams.length} {filteredExams.length === 1 ? 'Exam' : 'Exams'}
      </Badge>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading exams...</p>
        </div>
      ) : filteredExams.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam, index) => {
            // Randomly assign one of the three dashboard colors
            const colorSchemes = [
              { bg: 'from-orange-300 to-orange-400', text: 'text-white', badge: 'bg-orange-500/20 text-orange-100' },
              { bg: 'from-sky-300 to-sky-400', text: 'text-white', badge: 'bg-sky-500/20 text-sky-100' },
              { bg: 'from-teal-400 to-teal-500', text: 'text-white', badge: 'bg-teal-500/20 text-teal-100' }
            ];
            const colorScheme = colorSchemes[index % 3];
            const examClassLabels = getExamClassStrings(exam);
            
            return (
              <Card key={exam._id} className={`bg-gradient-to-br ${colorScheme.bg} border-0 hover:shadow-xl transition-all duration-300`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 text-gray-900">{exam.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={`${colorScheme.badge} border-0`}>
                          {EXAM_TYPES.find(t => t.value === exam.examType)?.label}
                        </Badge>
                        <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs font-semibold rounded-full">
                          {examClassLabels.length > 0
                            ? examClassLabels.length === 1
                              ? `Class ${examClassLabels[0]}`
                              : `${examClassLabels.length} classes`
                            : 'Class —'}
                        </Badge>
                        <Badge className="bg-orange-600 text-white border-2 border-white/50 shadow-lg font-semibold">
                          Asli Exclusive Schools
                        </Badge>
                        {exam.isActive ? (
                          <Badge className="bg-teal-600 text-white border-2 border-white/50 shadow-lg font-semibold">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-600 text-white border-2 border-white/50 shadow-lg font-semibold">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExam(exam._id)}
                      className="text-white hover:text-white/80 hover:bg-white/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {exam.description && (
                    <p className={`text-sm ${colorScheme.text}/90 mb-4 line-clamp-2`}>{exam.description}</p>
                  )}
                  {exam.targetSchools && exam.targetSchools.length > 0 && (
                    <div className="mb-3">
                      <p className={`text-xs ${colorScheme.text}/90 mb-1`}>Visible to:</p>
                      <div className="flex flex-wrap gap-1">
                        {exam.targetSchools.map((school: any, idx: number) => (
                          <Badge key={idx} className={`${colorScheme.badge} border-0 text-xs`}>
                            {school.schoolName || school.fullName || 'School'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <p className={`text-xs ${colorScheme.text}/90 mb-1`}>Assigned Classes</p>
                    {examClassLabels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {examClassLabels.map((cls: string, idx: number) => (
                          <Badge key={`${exam._id}-class-${idx}`} className="bg-white/80 text-gray-900 border-0 text-xs font-semibold rounded-full">
                            {`Class ${cls}`}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-200">No Class Assigned</p>
                    )}
                  </div>
                  <div className={`space-y-2 text-sm ${colorScheme.text}`}>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{exam.duration} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span>{exam.totalQuestions} questions • {exam.totalMarks} marks</span>
                    </div>
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      <span>
                        {[
                          examClassLabels.length > 0
                            ? examClassLabels.map((c) => `Class ${normalizeDisplayText(c)}`).join(', ')
                            : '',
                          normalizeDisplayText(exam.subject),
                          `${exam.maxAttempts || 1} attempt(s)`
                        ].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="text-xs">
                        {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    {exam.questions && exam.questions.length > 0 && (
                      <div className={`text-xs ${colorScheme.text}/90 mt-2`}>
                        {exam.questions.length} {exam.questions.length === 1 ? 'question' : 'questions'} added
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/90 text-gray-900 border-gray-300 hover:bg-white hover:border-gray-400"
                      onClick={() => openEditExamDialog(exam)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-white/90 text-gray-900 border-gray-300 hover:bg-white hover:border-gray-400"
                      onClick={() => {
                        setSelectedExam(exam);
                        setIsQuestionDialogOpen(true);
                        fetchQuestions(exam._id);
                      }}
                    >
                      <FileQuestion className="h-4 w-4 mr-1" />
                      Add Questions
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red-500/80 hover:bg-red-600/80 text-white border-white/30"
                      onClick={() => handleDeleteExam(exam._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
          setQuestionCsvUploadResults(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Questions - {selectedExam?.title}</DialogTitle>
            <DialogDescription>
              Add single MCQ, multiple MCQ, or integer type questions to this exam
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Existing Questions */}
            {isLoadingQuestions ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading questions...</p>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold">Existing Questions ({questions.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {questions.map((q: any, idx: number) => (
                    <Card key={q._id || idx} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{q.questionType?.toUpperCase() || 'MCQ'}</Badge>
                            <span className="text-sm text-gray-600">{q.marks} marks</span>
                          </div>
                          <p className="text-sm line-clamp-2">{q.questionText || 'Image question'}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <FileQuestion className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No questions added yet</p>
              </div>
            )}

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
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <div>
                  <Label htmlFor="questionCsvFile">Select CSV File *</Label>
                  <Input
                    id="questionCsvFile"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setQuestionCsvFile(file);
                        setQuestionCsvUploadResults(null);
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV should contain: questionText, questionType, subject, marks, options (option1-option4), correctAnswer/correctAnswers/integerAnswer
                  </p>
                </div>
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
            </div>

            {/* View All Questions Section */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold">All Questions ({questions.length})</h3>
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
                                {q.questionText || 'Image question'}
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
                                        {option.text || option}
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
                                  <p className="text-sm font-bold text-green-900">{q.correctAnswer}</p>
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
                    <SelectItem value="maths">Mathematics</SelectItem>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Question Text *</Label>
                <Textarea
                  value={questionFormData.questionText}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, questionText: e.target.value })}
                  placeholder="Enter the question text..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Or provide a question image URL below</p>
              </div>

              <div>
                <Label>Question Image URL (Optional)</Label>
                <Input
                  value={questionFormData.questionImage}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, questionImage: e.target.value })}
                  placeholder="https://example.com/question-image.png"
                />
              </div>

              {/* Options for MCQ/Multiple */}
              {(questionFormData.questionType === 'mcq' || questionFormData.questionType === 'multiple') && (
                <div className="space-y-3">
                  <Label>Options *</Label>
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
                    value={questionFormData.marks}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, marks: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Negative Marks</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={questionFormData.negativeMarks}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, negativeMarks: e.target.value })}
                    placeholder="0"
                  />
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
    </div>
  );
}

