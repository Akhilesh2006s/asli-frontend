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
import { Plus, Trash2, Edit, Eye, Calendar, Clock, BookOpen, FileQuestion, X } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
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

type FilterType = 'all-schools' | 'specific-schools';

export default function ExamManagement() {
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('all-schools');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
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
  }, [filterType, selectedSchools]);

  useEffect(() => {
    if (filterType === 'specific-schools') {
      fetchSchools();
    }
  }, [filterType]);

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
      
      // Add query parameters based on filter type
      const params = new URLSearchParams();
      if (filterType === 'specific-schools' && selectedSchools.length > 0) {
        params.append('schoolIds', selectedSchools.join(','));
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
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
          let fetchedExams = data.data || [];
          
          // Note: Backend already filters by schoolIds, so no additional frontend filtering needed
          // The backend returns exams that are either:
          // 1. Available to all schools (isSchoolSpecific: false)
          // 2. Available to the selected schools (isSchoolSpecific: true AND targetSchools includes selected schools)
          
          setExams(fetchedExams);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        toast({
          title: 'Error',
          description: errorData.message || `Failed to fetch exams (${response.status})`,
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

  const handleCreateExam = async () => {
    if (!formData.title || !formData.duration || !formData.totalQuestions || !formData.totalMarks || !formData.startDate || !formData.endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
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
        board: formData.board,
        duration: parseInt(formData.duration),
        totalQuestions: parseInt(formData.totalQuestions),
        totalMarks: parseInt(formData.totalMarks),
        instructions: formData.instructions,
        startDate: formData.startDate,
        endDate: formData.endDate
      };

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

      const response = await fetch(`${API_BASE_URL}/api/super-admin/exams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: 'Exam created successfully'
        });
        setIsDialogOpen(false);
        setFormData({
          title: '',
          description: '',
          examType: 'mains',
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
        fetchExams();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to create exam',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to create exam',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
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

  const filteredExams = (() => {
    if (filterType === 'all-schools') {
      return exams;
    } else if (filterType === 'specific-schools' && selectedSchools.length > 0) {
      return exams.filter(exam => 
        exam.targetSchools && exam.targetSchools.some((school: any) => {
          const schoolId = typeof school === 'string' ? school : school._id;
          return selectedSchools.includes(schoolId);
        })
      );
    }
    return exams;
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Management</h2>
          <p className="text-gray-600 mt-1">Create and manage exams</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
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
              <Button onClick={handleCreateExam} disabled={isCreating} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">
                {isCreating ? 'Creating...' : 'Create Exam'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative w-[200px]">
          <div className="absolute -inset-[2px] bg-gradient-to-r from-sky-300 to-teal-400 rounded-md"></div>
          <Select value={filterType} onValueChange={(value: FilterType) => {
            setFilterType(value);
            if (value === 'all-schools') {
              setSelectedSchools([]);
            } else if (value === 'specific-schools') {
              setSelectedSchools([]);
            }
          }}>
            <SelectTrigger className="w-full relative z-10 border-0 bg-white focus:ring-2 focus:ring-blue-700 focus:ring-offset-0">
              <SelectValue placeholder="Filter Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-schools">All Schools</SelectItem>
              <SelectItem value="specific-schools">Specific Schools</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterType === 'specific-schools' && (
          <div className="flex items-center gap-2">
            <Select 
              value="" 
              onValueChange={(value) => {
                if (value && !selectedSchools.includes(value)) {
                  setSelectedSchools([...selectedSchools, value]);
                }
              }}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={isLoadingSchools ? "Loading schools..." : "Add School"} />
              </SelectTrigger>
              <SelectContent>
                {schools.filter(school => !selectedSchools.includes(school.id)).map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name} ({BOARDS.find(b => b.value === school.board)?.label || school.board})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSchools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSchools.map((schoolId) => {
                  const school = schools.find(s => s.id === schoolId);
                  return school ? (
                    <Badge key={schoolId} variant="secondary" className="flex items-center gap-1">
                      {school.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSelectedSchools(selectedSchools.filter(id => id !== schoolId))}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}

        <Badge variant="outline" className="ml-2">
          {filteredExams.length} {filteredExams.length === 1 ? 'Exam' : 'Exams'}
        </Badge>
      </div>

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
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
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

            {/* Add New Question Form */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-semibold">Add New Question</h3>
              
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

