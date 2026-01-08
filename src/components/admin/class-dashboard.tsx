import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Trash2,
  AlertTriangle,
  UserPlus,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Eye,
  Brain
} from 'lucide-react';
import { StudentRiskAnalysisModal } from './StudentRiskAnalysisModal';
import { motion } from 'framer-motion';

interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  status: 'active' | 'inactive' | 'completed';
  createdAt: string;
  lastLogin?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  description: string;
  classNumber: string;
  section?: string;
  assignedSubjects?: Array<{
    _id: string;
    id: string;
    name: string;
    description?: string;
    code?: string;
    board?: string;
  }>;
  subject: string;
  grade: string;
  teacher: string;
  teachers?: Teacher[];
  schedule: string;
  room: string;
  studentCount: number;
  students: Student[];
  createdAt: string;
}

interface Subject {
  _id: string;
  id: string;
  name: string;
  code?: string;
  description?: string;
  board: string;
}

const ClassDashboard = () => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [newClass, setNewClass] = useState({
    classNumber: '',
    section: '',
    description: ''
  });
  // Assign Subjects state
  const [selectedClassForSubjects, setSelectedClassForSubjects] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isAssigningSubjects, setIsAssigningSubjects] = useState(false);
  const [selectedClassesForPromotion, setSelectedClassesForPromotion] = useState<Set<string>>(new Set());
  const [isPromoting, setIsPromoting] = useState(false);
  const [completedStudents, setCompletedStudents] = useState<Student[]>([]);
  const [isLoadingCompletedStudents, setIsLoadingCompletedStudents] = useState(false);
  const [selectedStudentForAnalysis, setSelectedStudentForAnalysis] = useState<Student | null>(null);
  const [isStudentAnalysisDialogOpen, setIsStudentAnalysisDialogOpen] = useState(false);
  const [studentAnalysis, setStudentAnalysis] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isAIRiskAnalysisModalOpen, setIsAIRiskAnalysisModalOpen] = useState(false);
  const [selectedStudentForAIRisk, setSelectedStudentForAIRisk] = useState<Student | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  // When a class number is selected, pre-populate selectedSubjectIds with already assigned subjects
  useEffect(() => {
    console.log('useEffect triggered - selectedClassForSubjects:', selectedClassForSubjects, 'classes.length:', classes.length, 'subjects.length:', subjects.length);
    
    if (selectedClassForSubjects && classes.length > 0 && subjects.length > 0) {
      // Find all classes with this classNumber
      const classesWithThisNumber = classes.filter(c => c.classNumber === selectedClassForSubjects);
      console.log('Classes with this number:', classesWithThisNumber.length, classesWithThisNumber.map(c => ({ 
        classNumber: c.classNumber, 
        section: c.section,
        hasAssignedSubjects: !!c.assignedSubjects,
        assignedSubjectsCount: c.assignedSubjects?.length || 0
      })));
      
      if (classesWithThisNumber.length > 0) {
        // Get assigned subjects from the first class (all sections should have the same subjects)
        const firstClass = classesWithThisNumber[0];
        console.log('First class assignedSubjects:', firstClass.assignedSubjects);
        
        if (firstClass.assignedSubjects && firstClass.assignedSubjects.length > 0) {
          // Extract subject IDs - need to match with the subjects array format
          // The assignedSubjects from class have id or _id, and we need to match them with subjects array
          const assignedSubjectIds = firstClass.assignedSubjects.map(subj => {
            const subjectId = subj.id || subj._id;
            console.log('Matching subject:', { subjectId, subjName: subj.name });
            
            // Find matching subject in the subjects array to ensure ID format matches
            const matchingSubject = subjects.find(s => {
              const match = s.id === subjectId || s._id === subjectId || 
                           s.id === subj._id || s._id === subj._id ||
                           String(s.id) === String(subjectId) || String(s._id) === String(subjectId);
              if (match) {
                console.log('Found match:', { subjectId, matchedId: s.id || s._id, subjectName: s.name });
              }
              return match;
            });
            
            const finalId = matchingSubject ? (matchingSubject.id || matchingSubject._id) : subjectId;
            console.log('Final ID for subject:', subj.name, '->', finalId);
            return finalId;
          }).filter(id => id); // Filter out any undefined/null values
          
          console.log('Setting selectedSubjectIds to:', assignedSubjectIds);
          setSelectedSubjectIds(assignedSubjectIds);
        } else {
          // No subjects assigned yet, clear selection
          console.log('No assigned subjects found, clearing selection');
          setSelectedSubjectIds([]);
        }
      } else {
        // Class not found, clear selection
        console.log('Class not found, clearing selection');
        setSelectedSubjectIds([]);
      }
    } else if (!selectedClassForSubjects) {
      // No class selected, clear selection
      console.log('No class selected, clearing selection');
      setSelectedSubjectIds([]);
    }
  }, [selectedClassForSubjects, classes, subjects]);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subjectsArray = Array.isArray(data) ? data : (data.data || []);
        setSubjects(subjectsArray.map((subject: any) => ({
          _id: subject._id || subject.id,
          id: subject._id || subject.id,
          name: subject.name,
          code: subject.code,
          description: subject.description,
          board: subject.board
        })));
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects',
        variant: 'destructive'
      });
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', data);
        throw new Error('Invalid data format received from server');
      }
      
      // Note: Students are already included in classes data from backend
      // This function is kept for potential future use
    } catch (error) {
      console.error('Failed to fetch students:', error);
      // Note: Students are fetched as part of classes data
    }
  };

  const handleViewStudentAnalysis = async (student: Student) => {
    setSelectedStudentForAnalysis(student);
    setIsStudentAnalysisDialogOpen(true);
    setIsLoadingAnalysis(true);
    setStudentAnalysis(null); // Reset previous analysis
    
    try {
      const token = localStorage.getItem('authToken');
      const studentId = student.id;
      
      if (!studentId) {
        console.error('Student ID is missing');
        setIsLoadingAnalysis(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/students/${studentId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudentAnalysis(data);
      } else if (response.status === 404) {
        // 404 means no analytics data exists yet - this is not an error, just no data
        setStudentAnalysis(null);
        // Don't show error toast for 404 - it's expected for new students
      } else {
        // Only show error for actual server errors (500, 503, etc.)
        console.error('Failed to fetch student analysis:', response.status, response.statusText);
        toast({
          title: 'Error',
          description: 'Failed to fetch student analysis. Please try again later.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      // Only show error toast for network errors or unexpected errors
      console.error('Failed to fetch student analysis:', error);
      toast({
        title: 'Error',
        description: 'Network error. Please check your connection and try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const fetchCompletedStudents = async () => {
    try {
      setIsLoadingCompletedStudents(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      const data = responseData.data || responseData;
      
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', responseData);
        throw new Error('Invalid data format received from server');
      }
      
      // Filter students who have completed (classNumber === 'Finished' or isActive === false)
      const completed = data
        .filter((user: any) => {
          const classNum = user.classNumber || '';
          const isFinished = classNum === 'Finished' || classNum === 'finished' || 
                           (user.isActive === false && (classNum.includes('12') || classNum === '12'));
          return isFinished;
        })
        .map((user: any) => ({
          id: user._id || user.id,
          name: user.fullName || user.name || 'Unknown Student',
          email: user.email || '',
          classNumber: user.classNumber || 'Finished',
          phone: user.phone || '',
          status: 'completed' as const,
          createdAt: user.createdAt || new Date().toISOString(),
          lastLogin: user.lastLogin || null,
          assignedClass: user.assignedClass?._id || user.assignedClass || null
        }));
      
      setCompletedStudents(completed);
    } catch (error) {
      console.error('Failed to fetch completed students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch completed students',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingCompletedStudents(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Handle different response formats
      let data = responseData;
      if (responseData && Array.isArray(responseData.data)) {
        data = responseData.data;
      } else if (responseData && Array.isArray(responseData)) {
        data = responseData;
      } else {
        console.error('Expected array but got:', responseData);
        throw new Error('Invalid data format received from server');
      }
      
      // Use the data directly from backend (already grouped by class)
      console.log('Classes data received:', data);
      console.log('Classes with classNumber and assignedSubjects:', data.map(c => ({ 
        id: c.id,
        name: c.name, 
        classNumber: c.classNumber,
        section: c.section,
        studentCount: c.studentCount,
        assignedSubjects: c.assignedSubjects ? c.assignedSubjects.map(s => ({ id: s.id, name: s.name })) : []
      })));
      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      // Set mock data for development
      setClasses([
        {
          id: '10A',
          name: 'Class 10A',
          description: 'Grade 10 Section A',
          subject: 'General',
          grade: '10',
          teacher: 'Ms. Sarah Wilson',
          schedule: 'Mon-Fri 9:00 AM - 3:00 PM',
          room: 'Room 101',
          studentCount: 2,
          students: [],
          createdAt: new Date().toISOString()
        },
        {
          id: '12B',
          name: 'Class 12B',
          description: 'Grade 12 Section B',
          subject: 'General',
          grade: '12',
          teacher: 'Mr. David Brown',
          schedule: 'Mon-Fri 10:00 AM - 4:00 PM',
          room: 'Room 201',
          studentCount: 1,
          students: [],
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newClass.classNumber || !newClass.section) {
      alert('Please fill in all required fields: Class Number and Section.');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classNumber: newClass.classNumber.trim(),
          section: newClass.section,
          description: newClass.description.trim()
        })
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.success !== false) {
        setNewClass({ classNumber: '', section: '', description: '' });
        setIsAddClassDialogOpen(false);
        fetchClasses();
        toast({
          title: 'Success',
          description: 'Class created successfully!',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: responseData.message || 'Failed to create class. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create class:', error);
      toast({
        title: 'Error',
        description: 'Failed to create class. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes/${classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      if (response.ok && responseData.success !== false) {
        fetchClasses();
        toast({
          title: 'Success',
          description: 'Class deleted successfully!',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: responseData.message || 'Failed to delete class. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete class. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAllClasses = async () => {
    setIsDeletingAll(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes/delete-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const responseData = await response.json();

      if (response.ok && responseData.success !== false) {
        fetchClasses();
        setIsDeleteAllDialogOpen(false);
        toast({
          title: 'Success',
          description: `All ${classes.length} classes deleted successfully!`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: responseData.message || 'Failed to delete all classes. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to delete all classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete all classes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handlePromoteClasses = async () => {
    if (selectedClassesForPromotion.size === 0) {
      toast({
        title: 'No Classes Selected',
        description: 'Please select at least one class to promote.',
        variant: 'destructive'
      });
      return;
    }

    const classIds = Array.from(selectedClassesForPromotion);
    const classesToPromote = classes.filter(c => classIds.includes(c.id));
    
    // Show confirmation with details
    const promotionDetails = classesToPromote.map(c => {
      // Handle both positive and negative class numbers
      const cleanClassNum = c.classNumber.replace(/[^-\d]/g, '');
      const currentClassNum = parseInt(cleanClassNum);
      const absClassNum = Math.abs(currentClassNum);
      const willBeFinished = absClassNum === 12;
      // Calculate next class number (same logic as backend)
      let nextClassNum;
      if (absClassNum === 11) {
        nextClassNum = 12;
      } else if (absClassNum < 11) {
        nextClassNum = absClassNum + 1;
      } else {
        nextClassNum = absClassNum + 1; // Should not reach here
      }
      return `Class ${c.classNumber}${c.section ? c.section : ''} → ${willBeFinished ? 'Finished Academic Career' : `Class ${nextClassNum}${c.section ? c.section : ''}`}`;
    }).join('\n');

    if (!confirm(`Are you sure you want to promote the following ${classIds.length} class(es)?\n\n${promotionDetails}\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsPromoting(true);
    try {
      console.log('Promoting classes - Class IDs:', classIds);
      console.log('Promoting classes - Classes to promote:', classesToPromote.map(c => ({
        id: c.id,
        name: c.name,
        classNumber: c.classNumber,
        section: c.section
      })));
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes/promote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classIds: classIds
        })
      });

      const responseData = await response.json();
      console.log('Promote classes response:', responseData);

      if (response.ok && responseData.success !== false) {
        fetchClasses();
        setSelectedClassesForPromotion(new Set());
        toast({
          title: 'Success',
          description: `Successfully promoted ${responseData.promotedCount || classIds.length} class(es)!`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: responseData.message || 'Failed to promote classes. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to promote classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to promote classes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleClassCardClick = (classId: string) => {
    // If clicking the same class, collapse it
    if (expandedClassId === classId) {
      setExpandedClassId(null);
    } else {
      // Expand the clicked class and collapse any previously expanded class
      setExpandedClassId(classId);
    }
  };

  const handleAssignSubjects = async () => {
    if (!selectedClassForSubjects) {
      toast({
        title: 'Validation Error',
        description: 'Please select a class number',
        variant: 'destructive'
      });
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one subject',
        variant: 'destructive'
      });
      return;
    }

    setIsAssigningSubjects(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // selectedClassForSubjects is now the classNumber (e.g., "10")
      const classNumber = selectedClassForSubjects.trim();
      
      // Validate that we have a valid class number (not an ObjectId)
      if (!classNumber || classNumber.length > 10) {
        toast({
          title: 'Validation Error',
          description: 'Invalid class number selected. Please select a valid class number.',
          variant: 'destructive'
        });
        setIsAssigningSubjects(false);
        return;
      }

      console.log('Assigning subjects to class number:', classNumber);

      // Save subjects for all sections of this class number in the database
      const response = await fetch(`${API_BASE_URL}/api/admin/classes/${encodeURIComponent(classNumber)}/assign-subjects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subjectIds: selectedSubjectIds })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Count sections that were updated
        const sectionsForClass = classes.filter(c => c.classNumber === classNumber);
        const sectionCount = sectionsForClass.length;
        toast({
          title: 'Success',
          description: `Subjects assigned to all sections of Class ${classNumber} (${sectionCount} section${sectionCount !== 1 ? 's' : ''}) successfully`,
        });
        // Reset form
        setSelectedClassForSubjects('');
        setSelectedSubjectIds([]);
        // Refresh classes to show updated data
        fetchClasses();
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to assign subjects to classes',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to assign subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign subjects to classes',
        variant: 'destructive'
      });
    } finally {
      setIsAssigningSubjects(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classItem.teacher.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || classItem.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const classSubjects = Array.from(new Set(classes.map(c => c.subject)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="space-y-8 p-6">
        {/* Hero Section with Vibrant Class Stats */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 opacity-20 rounded-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
                  Class Management
                </h1>
                <p className="text-gray-700 mt-3 text-xl font-medium">Organize and manage your classes and students with style</p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full flex items-center justify-center shadow-xl">
                  <GraduationCap className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Total Classes</p>
                      <p className="text-3xl font-bold text-white">{classes.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>Active classes</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Total Students</p>
                      <p className="text-3xl font-bold text-white">{classes.reduce((total, cls) => total + cls.studentCount, 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <Users className="w-4 h-4 mr-1" />
                    <span>Enrolled students</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Avg. Class Size</p>
                      <p className="text-3xl font-bold text-white">
                        {classes.length > 0 ? Math.round(classes.reduce((total, cls) => total + cls.studentCount, 0) / classes.length) : 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>Students per class</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Subjects</p>
                      <p className="text-3xl font-bold text-white">{classSubjects.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>Different subjects</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="classes" className="space-y-6" onValueChange={(value) => {
          if (value === 'completed-students') {
            fetchCompletedStudents();
          }
        }}>
          <TabsList className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl p-1">
            <TabsTrigger value="classes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-2xl">
              <GraduationCap className="w-4 h-4 mr-2" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="assign-subjects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-2xl">
              <BookOpen className="w-4 h-4 mr-2" />
              Assign Subjects
            </TabsTrigger>
            <TabsTrigger value="promote-class" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-2xl">
              <ArrowUp className="w-4 h-4 mr-2" />
              Promote Class
            </TabsTrigger>
            <TabsTrigger value="completed-students" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-2xl">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-6">
            {/* Action Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <Input
                      placeholder="Search classes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64 rounded-xl bg-white/70 border-gray-200 text-gray-900 backdrop-blur-sm"
                    />
                  </div>
                  
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-48 rounded-xl bg-white/70 border-gray-200 text-gray-900 backdrop-blur-sm">
                      <SelectValue placeholder="Filter by subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {classSubjects.map(subject => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  {classes.length > 0 && (
                    <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Delete All Classes?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-600">
                            This will permanently delete all {classes.length} classes. This action cannot be undone.
                            <br /><br />
                            <strong className="text-red-600">Are you absolutely sure?</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeletingAll}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAllClasses}
                            disabled={isDeletingAll}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isDeletingAll ? 'Deleting...' : 'Delete All Classes'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button 
                    onClick={() => setIsAddClassDialogOpen(true)}
                    className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Class
                  </Button>
                </div>
              </div>
            </div>

            {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((classItem, index) => {
              const isExpanded = expandedClassId === classItem.id;
              return (
              <motion.div
                key={classItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border ${
                  isExpanded ? 'border-sky-400 border-2' : 'border-white/20'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 to-blue-500/10 backdrop-blur-sm"></div>
                <div className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-white/40 rounded-xl backdrop-blur-sm">
                        <GraduationCap className="w-6 h-6 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sky-900 text-lg">
                          {classItem.name || `Class ${classItem.classNumber}${classItem.section || ''}`}
                        </h3>
                        {classItem.description && (
                          <p className="text-sky-700 text-sm mt-1">{classItem.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-sky-700">
                        <Users className="w-4 h-4 mr-3 text-sky-600" />
                        <span>Students:</span>
                      </div>
                      <span className="font-medium text-sky-900">{classItem.studentCount || 0}</span>
                    </div>
                    {classItem.teachers && classItem.teachers.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-sky-700">
                          <UserPlus className="w-4 h-4 mr-3 text-sky-600" />
                          <span>Teachers:</span>
                        </div>
                        <span className="font-medium text-sky-900">
                          {classItem.teachers.length} {classItem.teachers.length === 1 ? 'teacher' : 'teachers'}
                        </span>
                      </div>
                    )}
                    {(!classItem.teachers || classItem.teachers.length === 0) && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-sky-700">
                          <UserPlus className="w-4 h-4 mr-3 text-sky-600" />
                          <span>Teachers:</span>
                        </div>
                        <span className="font-medium text-sky-500 text-xs">No teachers assigned</span>
                      </div>
                    )}
                    {classItem.schedule && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-sky-700">
                          <Calendar className="w-4 h-4 mr-3 text-sky-600" />
                          <span>Schedule:</span>
                        </div>
                        <span className="font-medium text-sky-900">{classItem.schedule}</span>
                      </div>
                    )}
                    {classItem.room && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-sky-700">
                          <BookOpen className="w-4 h-4 mr-3 text-sky-600" />
                          <span>Room:</span>
                        </div>
                        <span className="font-medium text-sky-900">{classItem.room}</span>
                      </div>
                    )}
                    {classItem.section && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-sky-700">
                          <GraduationCap className="w-4 h-4 mr-3 text-sky-600" />
                          <span>Section:</span>
                        </div>
                        <span className="font-medium text-sky-900">{classItem.section}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Teachers List */}
                  {classItem.teachers && classItem.teachers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-semibold text-sky-900 text-sm">Assigned Teachers:</h4>
                      <div className="space-y-2">
                        {classItem.teachers.map(teacher => (
                          <div key={teacher.id} className="flex items-center justify-between bg-sky-50 rounded-lg p-2 hover:bg-sky-100 transition-colors border border-sky-200">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {teacher.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-sky-900">{teacher.name}</p>
                                <p className="text-xs text-sky-600">{teacher.email}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="border-sky-300 text-sky-700 bg-sky-100 text-xs">
                              Teacher
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sky-900 text-sm">Students List:</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-sky-200 text-sky-700 hover:bg-sky-50 text-xs"
                        onClick={() => handleClassCardClick(classItem.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            View
                          </>
                        )}
                      </Button>
                    </div>
                    <div className={`space-y-1 transition-all duration-300 ${
                      isExpanded ? 'max-h-64 overflow-y-auto' : 'max-h-0 overflow-hidden'
                    }`}>
                      {classItem.students && classItem.students.length > 0 ? (
                        classItem.students.map(student => (
                        <div key={student.id} className="flex items-center justify-between bg-white/50 rounded-lg p-2 hover:bg-white/70 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-sky-900">{student.name}</p>
                            <p className="text-xs text-sky-600">{student.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-sky-100"
                              onClick={() => handleViewStudentAnalysis(student)}
                              title="View Student Analysis"
                            >
                              <Eye className="w-4 h-4 text-sky-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-orange-100"
                              onClick={() => {
                                setSelectedStudentForAIRisk(student);
                                setIsAIRiskAnalysisModalOpen(true);
                              }}
                              title="AI Risk Analysis"
                            >
                              <Brain className="w-4 h-4 text-orange-600" />
                            </Button>
                            <Badge variant="outline" className={`text-xs ${
                              student.status === 'active' 
                                ? 'border-green-200 text-green-700 bg-green-50' 
                                : 'border-gray-200 text-gray-700 bg-gray-50'
                            }`}>
                              {student.status}
                            </Badge>
                          </div>
                        </div>
                        ))
                      ) : (
                        <div className="text-sm text-sky-600 text-center py-2">
                          No students assigned to this class
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 pt-4 border-t border-sky-200">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(classItem.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">No classes found</p>
              <p className="text-gray-500 text-sm">Create your first class by clicking the "Add Class" button above</p>
            </div>
          )}
          </div>
          </TabsContent>

          <TabsContent value="assign-subjects" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 bg-clip-text text-transparent">
                  Assign Subjects to Class
                </CardTitle>
                <p className="text-gray-600 mt-2">Select a class and assign subjects to all students in that class</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="class-select" className="text-base font-semibold mb-2 block">Select Class Number *</Label>
                  <Select value={selectedClassForSubjects} onValueChange={setSelectedClassForSubjects}>
                    <SelectTrigger id="class-select" className="w-full">
                      <SelectValue placeholder="Choose a class number" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(classes.map(c => c.classNumber).filter(cn => cn))) // Filter out undefined/null
                        .sort((a, b) => {
                          // Sort numerically if both are numbers, otherwise alphabetically
                          const numA = parseInt(a);
                          const numB = parseInt(b);
                          if (!isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                          }
                          return a.localeCompare(b);
                        })
                        .map(classNumber => {
                          // Count total students across all sections of this class number
                          const sectionsForClass = classes.filter(c => c.classNumber === classNumber);
                          const totalStudents = sectionsForClass.reduce((sum, c) => sum + (c.studentCount || 0), 0);
                          const sectionCount = sectionsForClass.length;
                          return (
                            <SelectItem key={classNumber} value={classNumber}>
                              Class {classNumber} ({sectionCount} section{sectionCount !== 1 ? 's' : ''}, {totalStudents} students)
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  {selectedClassForSubjects && (
                    <p className="text-sm text-gray-600 mt-2">
                      Subjects will be assigned to all sections of Class {selectedClassForSubjects} (A, B, C)
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold mb-4 block">Select Subjects *</Label>
                  {subjects.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No subjects available. Please create subjects first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-xl">
                      {subjects.map(subject => {
                        const isSelected = selectedSubjectIds.includes(subject.id) || selectedSubjectIds.includes(subject._id);
                        return (
                        <div
                          key={subject.id || subject._id}
                          className={`flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                          }`}
                          onClick={() => handleSubjectToggle(subject.id || subject._id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSubjectToggle(subject.id || subject._id)}
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{subject.name}</p>
                            {subject.code && (
                              <p className="text-sm text-gray-600">Code: {subject.code}</p>
                            )}
                            {subject.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{subject.description}</p>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedSubjectIds.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>{selectedSubjectIds.length}</strong> subject(s) selected
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubjectIds.map(subjectId => {
                          const subject = subjects.find(s => s.id === subjectId);
                          return subject ? (
                            <Badge key={subjectId} className="bg-purple-100 text-purple-700">
                              {subject.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedClassForSubjects('');
                      setSelectedSubjectIds([]);
                    }}
                    disabled={isAssigningSubjects}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleAssignSubjects}
                    disabled={!selectedClassForSubjects || selectedSubjectIds.length === 0 || isAssigningSubjects}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    {isAssigningSubjects ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promote-class" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  Promote Classes
                </CardTitle>
                <p className="text-gray-600 mt-2">Promote classes to the next grade level. Classes will move from Class 1 → Class 2 → ... → Class 12 → Finished Academic Career</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Select classes to promote them to the next grade level</li>
                        <li>Class 1 will become Class 2, Class 2 will become Class 3, and so on</li>
                        <li>Class 12 will be marked as "Finished Academic Career"</li>
                        <li>All students in the selected classes will be moved to the new class</li>
                        <li>This action cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Select Classes to Promote</Label>
                  <div className="space-y-4 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {(() => {
                      // Group classes by class number
                      const classesByNumber = classes
                        .filter(c => {
                          // Handle both positive and negative class numbers
                          // Extract numeric part (including negative sign)
                          const cleanClassNum = c.classNumber.replace(/[^-\d]/g, '');
                          const classNum = parseInt(cleanClassNum);
                          // Use absolute value to check if it's between 1-12
                          const absClassNum = Math.abs(classNum);
                          // Allow classes from 1-12 (including negative like -10, -11, -12)
                          return !isNaN(classNum) && absClassNum >= 1 && absClassNum <= 12;
                        })
                        .reduce((acc, classItem) => {
                          // Use the original classNumber as key to preserve negative signs
                          const classNum = classItem.classNumber;
                          if (!acc[classNum]) {
                            acc[classNum] = [];
                          }
                          acc[classNum].push(classItem);
                          return acc;
                        }, {} as Record<string, typeof classes>);

                      // Sort class numbers (handle negative numbers)
                      const sortedClassNumbers = Object.keys(classesByNumber).sort((a, b) => {
                        // Clean the class numbers for comparison
                        const cleanA = a.replace(/[^-\d]/g, '');
                        const cleanB = b.replace(/[^-\d]/g, '');
                        const numA = parseInt(cleanA);
                        const numB = parseInt(cleanB);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          return numA - numB;
                        }
                        return a.localeCompare(b);
                      });

                      return sortedClassNumbers.map((classNum) => {
                        const classItems = classesByNumber[classNum].sort((a, b) => {
                          // Sort by section (A, B, C)
                          const sectionA = a.section || '';
                          const sectionB = b.section || '';
                          return sectionA.localeCompare(sectionB);
                        });

                        // Clean class number for calculations
                        const cleanClassNum = classNum.replace(/[^-\d]/g, '');
                        const currentClassNum = parseInt(cleanClassNum);
                        const absClassNum = Math.abs(currentClassNum);
                        // Calculate next class number
                        // - If abs value is 11, promote to 12 (regardless of sign)
                        // - If abs value < 11, promote to abs value + 1 (always positive)
                        let nextClassNum;
                        if (absClassNum === 11) {
                          nextClassNum = 12;
                        } else if (absClassNum < 11) {
                          nextClassNum = absClassNum + 1;
                        } else {
                          nextClassNum = absClassNum + 1; // Should not reach here
                        }
                        const willBeFinished = absClassNum === 12;

                        return (
                          <div key={classNum} className="space-y-2">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-700">Class {classNum}</h4>
                              <Badge variant="outline" className="text-xs">
                                {classItems.length} section{classItems.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4">
                              {classItems.map((classItem) => {
                                const isSelected = selectedClassesForPromotion.has(classItem.id);
                                
                                return (
                                  <div
                                    key={classItem.id}
                                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                      const newSet = new Set(selectedClassesForPromotion);
                                      if (isSelected) {
                                        newSet.delete(classItem.id);
                                      } else {
                                        newSet.add(classItem.id);
                                      }
                                      setSelectedClassesForPromotion(newSet);
                                    }}
                                  >
                                    <div className="flex items-start space-x-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          const newSet = new Set(selectedClassesForPromotion);
                                          if (checked) {
                                            newSet.add(classItem.id);
                                          } else {
                                            newSet.delete(classItem.id);
                                          }
                                          setSelectedClassesForPromotion(newSet);
                                        }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-semibold text-gray-900 text-sm">
                                            Section {classItem.section || 'N/A'}
                                          </span>
                                          {isSelected && (
                                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1">
                                          {classItem.studentCount || 0} students
                                        </p>
                                        <div className="flex items-center space-x-1 text-xs">
                                          <ArrowUp className="w-3 h-3 text-gray-400" />
                                          <span className="text-gray-500">
                                            {willBeFinished 
                                              ? 'Finished'
                                              : `Class ${nextClassNum}${classItem.section ? classItem.section : ''}`
                                            }
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {classes.filter(c => {
                    // Handle both positive and negative class numbers
                    const cleanClassNum = c.classNumber.replace(/[^-\d]/g, '');
                    const classNum = parseInt(cleanClassNum);
                    const absClassNum = Math.abs(classNum);
                    return !isNaN(classNum) && absClassNum >= 1 && absClassNum <= 12;
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <GraduationCap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>No classes available for promotion</p>
                      <p className="text-sm">Classes must be between Class 1 and Class 12</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedClassesForPromotion(new Set());
                    }}
                    disabled={isPromoting || selectedClassesForPromotion.size === 0}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    onClick={handlePromoteClasses}
                    disabled={isPromoting || selectedClassesForPromotion.size === 0}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    {isPromoting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Promoting...
                      </>
                    ) : (
                      <>
                        <ArrowUp className="w-4 h-4 mr-2" />
                        Promote {selectedClassesForPromotion.size} Class{selectedClassesForPromotion.size !== 1 ? 'es' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed-students" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      Completed Students
                    </CardTitle>
                    <p className="text-gray-600 mt-2">Students who have completed Class 12 and finished their academic career</p>
                  </div>
                  <Button
                    onClick={fetchCompletedStudents}
                    disabled={isLoadingCompletedStudents}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                  >
                    {isLoadingCompletedStudents ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingCompletedStudents ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-spin" />
                    <p className="text-gray-600">Loading completed students...</p>
                  </div>
                ) : completedStudents.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline" className="text-lg px-4 py-2">
                        Total: {completedStudents.length} student{completedStudents.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {completedStudents.map((student) => (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{student.name}</h4>
                                <p className="text-xs text-gray-600">{student.email}</p>
                              </div>
                            </div>
                            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
                              Completed
                            </Badge>
                          </div>
                          <div className="space-y-2 mt-4 pt-4 border-t border-green-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Status:</span>
                              <span className="font-medium text-green-700">Finished Academic Career</span>
                            </div>
                            {student.phone && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium text-gray-900">{student.phone}</span>
                              </div>
                            )}
                            {student.createdAt && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Joined:</span>
                                <span className="font-medium text-gray-900">
                                  {new Date(student.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg mb-2">No completed students found</p>
                    <p className="text-gray-500 text-sm">Students who complete Class 12 will appear here</p>
                    <Button
                      onClick={fetchCompletedStudents}
                      className="mt-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Refresh List
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Class Dialog */}
        <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
          <DialogContent className="bg-white/90 backdrop-blur-xl border-sky-200">
            <DialogHeader>
              <DialogTitle className="text-sky-900">Add New Class</DialogTitle>
              <DialogDescription>
                Create a new class to organize your students
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classNumber" className="text-sm font-medium text-sky-800">
                    Class Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="classNumber"
                    value={newClass.classNumber}
                    onChange={(e) => setNewClass({ ...newClass, classNumber: e.target.value })}
                    className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm"
                    required
                    placeholder="e.g., 10, 11, 12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section" className="text-sm font-medium text-sky-800">
                    Section <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={newClass.section}
                    onValueChange={(value) => setNewClass({ ...newClass, section: value })}
                    required
                  >
                    <SelectTrigger className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-sky-800">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                  className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm"
                  rows={3}
                  placeholder="Optional description for this class"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddClassDialogOpen(false)}
                  className="border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white">
                  Create Class
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

        {/* Student Analysis Dialog */}
        <Dialog open={isStudentAnalysisDialogOpen} onOpenChange={setIsStudentAnalysisDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                Student Analysis - {selectedStudentForAnalysis?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedStudentForAnalysis?.email}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingAnalysis ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                <span className="ml-2 text-gray-600">Loading analysis...</span>
              </div>
            ) : studentAnalysis ? (
              <div className="space-y-6">
                {/* Performance Summary */}
                {studentAnalysis.performance && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {studentAnalysis.performance.totalExams > 0 && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Total Exams</p>
                            <p className="text-2xl font-bold text-blue-700">{studentAnalysis.performance.totalExams}</p>
                          </div>
                        )}
                        {studentAnalysis.performance.averageScore && (
                          <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Average Score</p>
                            <p className="text-2xl font-bold text-green-700">{studentAnalysis.performance.averageScore}%</p>
                          </div>
                        )}
                        {studentAnalysis.performance.overallProgress && (
                          <div className="bg-purple-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Overall Progress</p>
                            <p className="text-2xl font-bold text-purple-700">{studentAnalysis.performance.overallProgress}%</p>
                          </div>
                        )}
                        {studentAnalysis.performance.watchTime && (
                          <div className="bg-orange-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Watch Time</p>
                            <p className="text-2xl font-bold text-orange-700">{Math.round(studentAnalysis.performance.watchTime / 60)}h</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                {studentAnalysis.recentActivity && studentAnalysis.recentActivity.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {studentAnalysis.recentActivity.map((activity: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{activity.title || activity.type}</p>
                              <p className="text-sm text-gray-600">{activity.date || activity.createdAt}</p>
                            </div>
                            {activity.score && (
                              <Badge className="bg-sky-100 text-sky-700">{activity.score}%</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!studentAnalysis.performance && !studentAnalysis.recentActivity && (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No analysis data available for this student yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No analysis data available for this student yet.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* AI Risk Analysis Modal */}
        {selectedStudentForAIRisk && (
          <StudentRiskAnalysisModal
            open={isAIRiskAnalysisModalOpen}
            onOpenChange={setIsAIRiskAnalysisModalOpen}
            studentId={selectedStudentForAIRisk.id}
            studentName={selectedStudentForAIRisk.name}
            isSuperAdmin={false}
          />
        )}
    </div>
  );
};

export default ClassDashboard;
