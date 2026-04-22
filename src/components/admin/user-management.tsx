import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Upload, 
  Download, 
  UserPlus,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Loader2,
  Edit,
  Brain,
  AlertTriangle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { StudentRiskAnalysisModal } from './StudentRiskAnalysisModal';
interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  assignedClass?: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [studentViewMode, setStudentViewMode] = useState<'all' | 'class-wise' | 'section-wise'>('class-wise');
  const [collapsedClasses, setCollapsedClasses] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [deleteAllConfirmStep, setDeleteAllConfirmStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    classNumber: '',
    phone: ''
  });
  const [isAssignClassDialogOpen, setIsAssignClassDialogOpen] = useState(false);
  const [selectedStudentForClass, setSelectedStudentForClass] = useState<Student | null>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState({
    name: '',
    email: '',
    classNumber: '',
    phone: '',
    isActive: true
  });
  const [isRiskAnalysisModalOpen, setIsRiskAnalysisModalOpen] = useState(false);
  const [selectedStudentForAnalysis, setSelectedStudentForAnalysis] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableClasses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
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
      
      // Backend returns { success: true, data: [...] } format
      const data = responseData.data || responseData;
      
      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', responseData);
        throw new Error('Invalid data format received from server');
      }
      
      // Map backend data to frontend format
      const mappedStudents = data.map((user: any) => ({
        id: user._id || user.id,
        name: user.fullName || user.name || 'Unknown Student',
        email: user.email || '',
        classNumber: user.classNumber || 'N/A',
        phone: user.phone || '',
        status: (user.isActive ? 'active' : 'inactive') as 'active' | 'inactive',
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || null,
        assignedClass: user.assignedClass?._id || user.assignedClass || null
      }));
      
      setStudents(mappedStudents);
    } catch (error) {
      console.error('Failed to fetch students:', error);
      // Set mock data for development
      setStudents([
        {
          id: '1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          classNumber: '10A',
          phone: '+1234567890',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          classNumber: '12B',
          phone: '+1234567891',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      ]);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newStudent.name || !newStudent.email || !newStudent.classNumber) {
      alert('Please fill in all required fields: Full Name, Email, and Class Number.');
      return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/admin/students`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
        body: JSON.stringify({
          fullName: newStudent.name.trim(),
          email: newStudent.email.trim(),
          classNumber: newStudent.classNumber.trim(),
          phone: newStudent.phone.trim(),
          password: 'Password123' // Default password for all students
        })
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('Failed to parse JSON response:', text);
        alert(`Failed to add student: Server returned invalid response. Status: ${response.status}`);
        return;
      }
      
      if (response.ok && (responseData.success === true || responseData.success === undefined)) {
        // Reset form and close dialog
        setNewStudent({ name: '', email: '', classNumber: '', phone: '' });
        setIsAddDialogOpen(false);
        // Refresh the students list
        fetchStudents();
        alert('Student added successfully! Default password: Password123');
      } else {
        const errorMsg = responseData.message || responseData.error || 'Unknown error occurred';
        console.error('Error response:', responseData);
        alert(`Failed to add student: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Failed to add student:', error);
      const errorMsg = error.message || 'Network error. Please check your connection and try again.';
      alert(`Failed to add student: ${errorMsg}`);
    }
  };

  const handleCSVUpload = async (file: File) => {
    if (isUploading) return; // Prevent multiple uploads
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Uploading file:', file.name, file.size, 'bytes');
      console.log('API Base URL:', API_BASE_URL);
      console.log('Upload endpoint:', `${API_BASE_URL}/api/admin/students/upload`);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('You are not authenticated. Please log in again.');
        setIsUploading(false);
        return;
      }

      // Test connection first
      try {
        const healthCheck = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        console.log('Health check response:', healthCheck.status);
      } catch (healthError) {
        console.warn('Health check failed, but continuing with upload:', healthError);
      }

      // Check if API_BASE_URL is accessible
      console.log('Making request to:', `${API_BASE_URL}/api/admin/students/upload`);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/students/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        setIsUploadDialogOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchStudents();
        
        // Show detailed results
        let description = `Created ${result.createdUsers?.length || 0} students. Default password: Password123`;
        
        if (result.classesCreated && result.classesCreated > 0) {
          description += ` Created ${result.classesCreated} new class${result.classesCreated > 1 ? 'es' : ''} automatically.`;
        }
        
        if (result.errors && result.errors.length > 0) {
          description += `\n\nSome errors occurred:\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? `\n...and ${result.errors.length - 5} more` : ''}`;
        }
        
        toast({
          title: 'CSV Upload Successful',
          description: description,
          variant: result.errors && result.errors.length > 0 ? 'default' : 'default'
        });
      } else {
        let errorData;
        try {
          const text = await response.text();
          console.log('Error response text:', text);
          errorData = JSON.parse(text);
        } catch (e) {
          errorData = { 
            message: `Server error (${response.status}): ${response.statusText}`,
            hint: 'The server returned an error. Please check the console for details.'
          };
        }
        
        const errorMessage = errorData.message || 'Unknown error';
        const errorHint = errorData.hint || '';
        
        toast({
          title: 'CSV Upload Failed',
          description: `${errorMessage}${errorHint ? `\n\n${errorHint}` : ''}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to upload CSV:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = 'Network error';
      let description = 'Please check your connection and try again.';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server';
        description = `Cannot connect to ${API_BASE_URL}. Please check:\n1. The backend server is running\n2. The API_BASE_URL is correct\n3. CORS is properly configured`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        description = 'Please check:\n1. Your admin account has a board assigned\n2. The CSV file format is correct\n3. Your internet connection is stable';
      }
      
      toast({
        title: 'CSV Upload Failed',
        description: description,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${studentId}`, {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json' 
          }
        });

        if (response.ok) {
          fetchStudents();
          alert(`${studentName} has been deleted successfully.`);
        } else {
          const errorData = await response.json();
          alert(`Failed to delete student: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to delete student:', error);
        alert('Failed to delete student. Please try again.');
      }
    }
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudentForEdit(student);
    setEditStudent({
      name: student.name || '',
      email: student.email || '',
      classNumber: student.classNumber || '',
      phone: student.phone || '',
      isActive: student.status === 'active'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentForEdit) return;
    
    if (!editStudent.name || !editStudent.email) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields: Full Name and Email.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/students/${selectedStudentForEdit.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          fullName: editStudent.name.trim(),
          classNumber: editStudent.classNumber.trim(),
          phone: editStudent.phone.trim(),
          isActive: editStudent.isActive
        })
      });

      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        setIsEditDialogOpen(false);
        setSelectedStudentForEdit(null);
        fetchStudents();
        toast({
          title: 'Success',
          description: 'Student details updated successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: responseData.message || 'Failed to update student',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Failed to update student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update student. Please try again.',
        variant: 'destructive'
      });
    }
  };


  const handleDeleteAllStudents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/delete-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setStudents([]);
        setIsDeleteAllDialogOpen(false);
        setDeleteAllConfirmStep(1);
        alert('All students have been deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete all students: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete all students:', error);
      alert('Failed to delete all students. Please try again.');
    }
  };

  const resetDeleteAllDialog = () => {
    setDeleteAllConfirmStep(1);
    setIsDeleteAllDialogOpen(false);
  };

  const getClassSectionMeta = (classNumber: string) => {
    const raw = (classNumber || '').trim();
    if (!raw || raw === 'N/A') {
      return { classKey: 'Unassigned', sectionKey: 'General' };
    }

    const compact = raw.replace(/\s+/g, '');
    const compactMatch = compact.match(/^(\d+)([A-Za-z])$/);
    if (compactMatch) {
      return {
        classKey: `Class ${compactMatch[1]}`,
        sectionKey: `Section ${compactMatch[2].toUpperCase()}`
      };
    }

    const labeledMatch = raw.match(/class[-\s]*(\d+)\s*([A-Za-z])?/i);
    if (labeledMatch) {
      return {
        classKey: `Class ${labeledMatch[1]}`,
        sectionKey: labeledMatch[2] ? `Section ${labeledMatch[2].toUpperCase()}` : 'General'
      };
    }

    return { classKey: raw, sectionKey: 'General' };
  };

  const getClassSortValue = (label: string) => {
    const match = label.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  const sortByClassLabel = (a: string, b: string) => {
    const numDiff = getClassSortValue(a) - getClassSortValue(b);
    if (numDiff !== 0) return numDiff;
    return a.localeCompare(b);
  };

  // Get all unique classes/sections from students
  const allClasses = Array.from(
    new Set(students.map((s) => getClassSectionMeta(s.classNumber).classKey))
  ).sort(sortByClassLabel);

  const sectionsByClass = allClasses.reduce<Record<string, string[]>>((acc, classKey) => {
    const sections = Array.from(
      new Set(
        students
          .filter((s) => getClassSectionMeta(s.classNumber).classKey === classKey)
          .map((s) => getClassSectionMeta(s.classNumber).sectionKey)
      )
    ).sort();
    acc[classKey] = sections;
    return acc;
  }, {});

  const availableSectionsForClass = selectedClassFilter === 'all'
    ? []
    : (sectionsByClass[selectedClassFilter] || []);

  const filteredStudents = students.filter(student => {
    // Search filter
    const matchesSearch = 
      (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.classNumber || '').includes(searchTerm);
    
    // Class filter
    const { classKey, sectionKey } = getClassSectionMeta(student.classNumber || '');
    const matchesClass = selectedClassFilter === 'all' || classKey === selectedClassFilter;
    const matchesSection = selectedSectionFilter === 'all' || sectionKey === selectedSectionFilter;
    
    return matchesSearch && matchesClass && matchesSection;
  });

  useEffect(() => {
    setSelectedSectionFilter('all');
  }, [selectedClassFilter]);

  const classSectionGroups = filteredStudents.reduce<Record<string, Record<string, Student[]>>>((acc, student) => {
    const { classKey, sectionKey } = getClassSectionMeta(student.classNumber || '');
    if (!acc[classKey]) acc[classKey] = {};
    if (!acc[classKey][sectionKey]) acc[classKey][sectionKey] = [];
    acc[classKey][sectionKey].push(student);
    return acc;
  }, {});

  const sectionClassGroups = filteredStudents.reduce<Record<string, Record<string, Student[]>>>((acc, student) => {
    const { classKey, sectionKey } = getClassSectionMeta(student.classNumber || '');
    if (!acc[sectionKey]) acc[sectionKey] = {};
    if (!acc[sectionKey][classKey]) acc[sectionKey][classKey] = [];
    acc[sectionKey][classKey].push(student);
    return acc;
  }, {});

  const toggleClassCollapse = (classKey: string) => {
    setCollapsedClasses((prev) => ({ ...prev, [classKey]: !(prev[classKey] ?? true) }));
  };

  const toggleSectionCollapse = (scopeKey: string) => {
    setCollapsedSections((prev) => ({ ...prev, [scopeKey]: !(prev[scopeKey] ?? true) }));
  };

  const renderStudentCard = (student: Student, indexKey: string | number) => (
    <motion.div
      key={student.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: typeof indexKey === 'number' ? 0.03 * indexKey : 0 }}
      className="group relative bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-sky-200 hover:border-sky-400 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
              {(student.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              (student.status || 'inactive') === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sky-900 text-sm leading-tight break-words">
              {student.name || 'Unknown Student'}
            </h4>
            <p className="text-sky-700 text-xs break-all">{student.email || 'No email'}</p>
          </div>
        </div>
        <Badge className="bg-sky-100 text-sky-700 border border-sky-200 text-[10px] shrink-0 max-w-[40%] truncate">
          {student.classNumber || 'N/A'}
        </Badge>
      </div>

      <div className="space-y-1.5 mb-3">
        {student.phone && (
          <div className="flex items-center text-xs text-sky-700">
            <Phone className="w-3.5 h-3.5 mr-2 text-sky-600" />
            <span className="truncate">{student.phone}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-sky-700">
          <Calendar className="w-3.5 h-3.5 mr-2 text-sky-600" />
          <span className="truncate">Last login: {student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-sky-200 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-sky-600 hover:text-blue-700 hover:bg-blue-100/50 rounded-lg h-8 w-8 p-0"
            onClick={() => handleEditStudent(student)}
            title="Edit Details"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sky-600 hover:text-red-700 hover:bg-red-100/50 rounded-lg h-8 w-8 p-0"
            onClick={() => handleDeleteStudent(student.id, student.name || 'Unknown Student')}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100/50 rounded-lg h-8 w-8 p-0"
            onClick={() => {
              setSelectedStudentForAnalysis(student);
              setIsRiskAnalysisModalOpen(true);
            }}
            title="AI Risk Analysis"
          >
            <Brain className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto text-sky-600 hover:text-sky-800 border-sky-200 hover:bg-sky-50 rounded-lg h-8 text-xs"
          onClick={() => {
            setSelectedStudentForClass(student);
            setIsAssignClassDialogOpen(true);
          }}
        >
          <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
          Assign Class
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-orange-50 via-orange-100 to-teal-50">
      <div className="space-y-6 p-3 sm:p-4 lg:space-y-8 lg:p-6">
        {/* Hero Section with Vibrant Student Stats */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 opacity-20 rounded-3xl"></div>
          <div className="relative rounded-2xl border border-white/20 bg-white/80 p-4 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
              <div>
                <h1 className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl">
                  Student Management
                </h1>
                <p className="mt-2 text-sm font-medium text-gray-700 sm:mt-3 sm:text-base lg:text-xl">Manage students and their academic progress with style</p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-xl">
                  <Users className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
        
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-5 lg:p-6"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Total Students</p>
                      <p className="text-3xl font-bold text-white">{students.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span>+12% this month</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-5 lg:p-6"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Active Students</p>
                      <p className="text-3xl font-bold text-white">{students.filter(s => s.status === 'active').length}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    <span>Online now</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 to-orange-700 p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-5 lg:p-6"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Active Classes</p>
                      <p className="text-3xl font-bold text-white">{new Set(students.map(s => s.classNumber)).size}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>Classes running</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-5 lg:p-6"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">New This Month</p>
                      <p className="text-3xl font-bold text-white">12</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <span>+25% growth</span>
                  </div>
                </div>
              </motion.div>
          </div>
        </div>
      </div>

        {/* Enhanced Action Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-xl backdrop-blur-xl sm:rounded-3xl sm:p-6"
        >
          <div className="space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-4">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-white border-sky-200 text-sky-900 rounded-xl">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Class</SelectItem>
                    {allClasses.map((classNum) => (
                      <SelectItem key={classNum} value={classNum}>
                        {classNum}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedSectionFilter}
                  onValueChange={setSelectedSectionFilter}
                  disabled={selectedClassFilter === 'all'}
                >
                  <SelectTrigger className="w-full sm:w-[220px] bg-white border-sky-200 text-sky-900 rounded-xl disabled:opacity-60">
                    <SelectValue placeholder="Select Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Section</SelectItem>
                    {availableSectionsForClass.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full xl:w-[360px] xl:ml-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <Input
                  placeholder="Search students by name, email, or class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-white/70 border-gray-200 text-gray-900 placeholder-gray-600 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex flex-wrap rounded-xl border border-sky-200 bg-white p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={studentViewMode === 'all' ? 'default' : 'ghost'}
                  className={studentViewMode === 'all' ? 'rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-xs text-white sm:text-sm' : 'rounded-lg text-xs text-sky-700 sm:text-sm'}
                  onClick={() => setStudentViewMode('all')}
                >
                  All Students
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={studentViewMode === 'class-wise' ? 'default' : 'ghost'}
                  className={studentViewMode === 'class-wise' ? 'rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-xs text-white sm:text-sm' : 'rounded-lg text-xs text-sky-700 sm:text-sm'}
                  onClick={() => setStudentViewMode('class-wise')}
                >
                  Class-wise View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={studentViewMode === 'section-wise' ? 'default' : 'ghost'}
                  className={studentViewMode === 'section-wise' ? 'rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 text-xs text-white sm:text-sm' : 'rounded-lg text-xs text-sky-700 sm:text-sm'}
                  onClick={() => setStudentViewMode('section-wise')}
                >
                  Section-wise View
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 text-white shadow-lg hover:from-orange-600 hover:to-orange-500 sm:px-6"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 text-white shadow-lg hover:from-green-600 hover:to-emerald-600 sm:px-6"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-md bg-white/80 border-sky-200 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-sky-900">Upload Students CSV</DialogTitle>
                    <DialogDescription className="text-sky-700">
                      Upload a CSV file with student information. All students will have the default password "Password123".
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="border-2 border-dashed border-sky-300 rounded-xl p-8 text-center hover:border-sky-400 transition-colors bg-sky-50 backdrop-blur-sm">
                      <FileSpreadsheet className="w-16 h-16 text-sky-600 mx-auto mb-4" />
                      <p className="text-sky-800 mb-2 font-medium">Drop your CSV file here</p>
                      <p className="text-sm text-sky-700 mb-4">CSV Format (comma-separated):</p>
                      <div className="bg-white/70 rounded-lg p-4 mb-4 text-left">
                        <p className="text-xs text-sky-600 mb-2 font-medium">Required columns:</p>
                        <p className="text-xs text-sky-700">name, email, classnumber, phone</p>
                        <p className="text-xs text-sky-600 mt-2 font-medium">Example:</p>
                        <p className="text-xs text-sky-700">John Doe, john@email.com, Class-101, +1234567890</p>
                        <p className="text-xs text-sky-600 mt-2 font-medium">Note: All students will have default password "Password123"</p>
                        <div className="mt-3">
                          <Button 
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs border-sky-200 text-sky-700 hover:bg-sky-50"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = '/student_template.csv';
                              link.download = 'student_template.csv';
                              link.click();
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download Template
                          </Button>
                        </div>
                      </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                      }
                    }}
                    className="mt-4 w-full"
                    ref={fileInputRef}
                  />
                  
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-sky-50 rounded-lg border border-sky-200">
                      <p className="text-sm text-sky-700 mb-2">Selected file:</p>
                      <p className="text-sm font-medium text-sky-900">{selectedFile.name}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsUploadDialogOpen(false);
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="border-sky-200 text-sky-700 hover:bg-sky-50"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => {
                        if (selectedFile && !isUploading) {
                          handleCSVUpload(selectedFile);
                        }
                      }}
                      disabled={!selectedFile || isUploading}
                      className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Students
                        </>
                      )}
                    </Button>
                  </div>
                </div>
        </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 px-4 text-white shadow-lg transition-all duration-300 hover:from-orange-600 hover:to-teal-600 hover:shadow-xl sm:px-8"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Student
            </Button>
          </DialogTrigger>
                <DialogContent className="max-w-lg bg-white/80 border-sky-200 backdrop-blur-xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-sky-900">Add New Student</DialogTitle>
                    <DialogDescription className="text-sky-700">
                      Add a new student to the system. The student will have the default password "Password123".
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddStudent} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-sky-800">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                  <Input
                    id="name"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                          className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm"
                    required
                  />
                </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-sky-800">
                          Email <span className="text-red-500">*</span>
                        </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                          className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm"
                    required
                  />
                </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="classNumber" className="text-sm font-medium text-sky-800">
                          Class Number <span className="text-red-500">*</span>
                        </Label>
                  <Input
                    id="classNumber"
                    value={newStudent.classNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, classNumber: e.target.value })}
                          className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm"
                    required
                    placeholder="e.g., 10, 11, 12"
                  />
                </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-sky-800">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                          className="rounded-xl bg-white/70 border-sky-200 text-sky-900 backdrop-blur-sm"
                  />
                </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-sky-800">Default Password</Label>
                      <Input
                        id="password"
                        value="Password123"
                        disabled
                        className="rounded-xl bg-sky-50 border-sky-200 text-sky-700 backdrop-blur-sm cursor-not-allowed"
                      />
                      <p className="text-xs text-sky-600">This is the default password for all new students</p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddDialogOpen(false)}
                        className="rounded-xl border-sky-200 text-sky-800 hover:bg-sky-50 backdrop-blur-sm"
                      >
                    Cancel
                  </Button>
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 rounded-xl backdrop-blur-sm"
                      >
                  Add Student
                </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Delete All Students Button */}
            <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="default"
                  variant="destructive"
                  className="rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 text-white backdrop-blur-sm hover:from-red-600 hover:to-red-700 sm:px-6"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Students
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white/80 border-red-200 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-red-900">
                    {deleteAllConfirmStep === 1 ? 'Delete All Students' : 'Final Confirmation'}
                  </DialogTitle>
                  <DialogDescription className="text-red-700">
                    {deleteAllConfirmStep === 1 
                      ? 'This action will permanently delete ALL students from the system. This cannot be undone.'
                      : 'Are you absolutely sure you want to delete ALL students? This is your final warning.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {deleteAllConfirmStep === 1 ? (
                    <>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 text-red-800">
                          <XCircle className="w-5 h-5" />
                          <span className="font-medium">Warning: This will delete {students.length} students</span>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetDeleteAllDialog}
                          className="rounded-xl border-red-200 text-red-800 hover:bg-red-50 backdrop-blur-sm"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="button"
                          onClick={() => setDeleteAllConfirmStep(2)}
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl backdrop-blur-sm"
                        >
                          Continue
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                        <div className="flex items-center space-x-2 text-red-900">
                          <XCircle className="w-6 h-6" />
                          <span className="font-bold">FINAL WARNING</span>
                        </div>
                        <p className="text-red-800 mt-2">
                          You are about to permanently delete ALL {students.length} students. 
                          This action cannot be undone and will remove all student data from the system.
                        </p>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setDeleteAllConfirmStep(1)}
                          className="rounded-xl border-red-200 text-red-800 hover:bg-red-50 backdrop-blur-sm"
                        >
                          Go Back
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleDeleteAllStudents}
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl backdrop-blur-sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          DELETE ALL STUDENTS
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
          </div>
        </motion.div>

        {/* Modern Students Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="overflow-hidden rounded-2xl border border-sky-200 bg-white/60 shadow-lg backdrop-blur-xl"
        >
          <div className="p-6 border-b border-sky-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-sky-900">Students Directory</h3>
                <p className="text-sky-700 mt-1">{filteredStudents.length} students found</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 text-white backdrop-blur-sm hover:from-sky-600 hover:to-blue-700 sm:px-6"
                >
                <Download className="w-4 h-4 mr-2" />
                  Export Data
              </Button>
            </div>
          </div>
        </div>
        
          {filteredStudents.length > 0 ? (
            <div className="p-6 space-y-6">
              {studentViewMode === 'all' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredStudents.map((student, index) => renderStudentCard(student, index))}
                </div>
              )}

              {studentViewMode === 'class-wise' && (
                <div className="space-y-4">
                  {Object.keys(classSectionGroups).sort(sortByClassLabel).map((classKey) => {
                    const isClassCollapsed = collapsedClasses[classKey] ?? true;
                    return (
                      <div key={classKey} className="rounded-xl border border-sky-200 bg-white/70 shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleClassCollapse(classKey)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sky-50/70 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            {isClassCollapsed ? <ChevronRight className="w-4 h-4 text-sky-700" /> : <ChevronDown className="w-4 h-4 text-sky-700" />}
                            <span className="font-semibold text-sky-900">{classKey}</span>
                          </div>
                          <Badge className="bg-sky-100 text-sky-700 border border-sky-200">
                            {Object.values(classSectionGroups[classKey]).flat().length} students
                          </Badge>
                        </button>

                        {!isClassCollapsed && (
                          <div className="px-4 pb-4 space-y-3">
                            {Object.keys(classSectionGroups[classKey]).sort().map((sectionKey) => {
                              const sectionScopeKey = `${classKey}::${sectionKey}`;
                              const isSectionCollapsed = collapsedSections[sectionScopeKey] ?? true;
                              return (
                                <div key={sectionScopeKey} className="rounded-lg border border-sky-100 bg-white p-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleSectionCollapse(sectionScopeKey)}
                                    className="w-full flex items-center justify-between text-left"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isSectionCollapsed ? <ChevronRight className="w-4 h-4 text-teal-700" /> : <ChevronDown className="w-4 h-4 text-teal-700" />}
                                      <span className="font-medium text-sky-900">{sectionKey}</span>
                                    </div>
                                    <Badge className="bg-teal-100 text-teal-700 border border-teal-200">
                                      {classSectionGroups[classKey][sectionKey].length}
                                    </Badge>
                                  </button>
                                  {!isSectionCollapsed && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
                                      {classSectionGroups[classKey][sectionKey].map((student, idx) => renderStudentCard(student, `${sectionScopeKey}-${idx}`))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {studentViewMode === 'section-wise' && (
                <div className="space-y-4">
                  {Object.keys(sectionClassGroups).sort().map((sectionKey) => {
                    const isSectionCollapsed = collapsedSections[sectionKey] ?? true;
                    return (
                      <div key={sectionKey} className="rounded-xl border border-teal-200 bg-white/70 shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleSectionCollapse(sectionKey)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-teal-50/70 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            {isSectionCollapsed ? <ChevronRight className="w-4 h-4 text-teal-700" /> : <ChevronDown className="w-4 h-4 text-teal-700" />}
                            <span className="font-semibold text-teal-900">{sectionKey}</span>
                          </div>
                          <Badge className="bg-teal-100 text-teal-700 border border-teal-200">
                            {Object.values(sectionClassGroups[sectionKey]).flat().length} students
                          </Badge>
                        </button>

                        {!isSectionCollapsed && (
                          <div className="px-4 pb-4 space-y-3">
                            {Object.keys(sectionClassGroups[sectionKey]).sort(sortByClassLabel).map((classKey) => (
                              <div key={`${sectionKey}::${classKey}`} className="rounded-lg border border-sky-100 bg-white p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-medium text-sky-900">{classKey}</span>
                                  <Badge className="bg-sky-100 text-sky-700 border border-sky-200">
                                    {sectionClassGroups[sectionKey][classKey].length}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {sectionClassGroups[sectionKey][classKey].map((student, idx) =>
                                    renderStudentCard(student, `${sectionKey}-${classKey}-${idx}`)
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <Users className="w-12 h-12 text-sky-600" />
              </div>
              <h3 className="text-xl font-semibold text-sky-900 mb-2">No students found</h3>
              <p className="text-sky-700 mb-6">Try adjusting your search criteria or add new students</p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl px-6 backdrop-blur-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Student
              </Button>
        </div>
          )}
        </motion.div>
      </div>

      {/* Assign Class Dialog */}
      <Dialog open={isAssignClassDialogOpen} onOpenChange={setIsAssignClassDialogOpen}>
        <DialogContent className="max-w-md bg-white/80 border-sky-200 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sky-900">Assign Class to Student</DialogTitle>
            <DialogDescription className="text-sky-700">
              {selectedStudentForClass && `Assign a class to ${selectedStudentForClass.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableClasses.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No classes available. Please create a class first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedStudentForClass?.assignedClass === classItem.id
                        ? 'bg-sky-100 border-sky-400 border-2'
                        : 'bg-white border-sky-200 hover:border-sky-300 hover:bg-sky-50'
                    }`}
                    onClick={async () => {
                      if (selectedStudentForClass) {
                        try {
                          const token = localStorage.getItem('authToken');
                          const response = await fetch(`${API_BASE_URL}/api/admin/students/${selectedStudentForClass.id}/assign-class`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ classId: classItem.id })
                          });

                          const responseData = await response.json();

                          if (response.ok && responseData.success !== false) {
                            setIsAssignClassDialogOpen(false);
                            setSelectedStudentForClass(null);
                            fetchStudents();
                            alert('Class assigned successfully!');
                          } else {
                            alert(`Failed to assign class: ${responseData.message || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Failed to assign class:', error);
                          alert('Failed to assign class. Please try again.');
                        }
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sky-900">{classItem.name}</p>
                        {classItem.description && (
                          <p className="text-sm text-sky-600">{classItem.description}</p>
                        )}
                        <p className="text-xs text-sky-500 mt-1">
                          {classItem.studentCount || 0} students
                        </p>
                      </div>
                      {selectedStudentForClass?.assignedClass === classItem.id && (
                        <CheckCircle className="w-5 h-5 text-sky-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-sky-200">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignClassDialogOpen(false);
                  setSelectedStudentForClass(null);
                }}
                className="border-sky-200 text-sky-700 hover:bg-sky-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white/80 border-sky-200 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sky-900">Edit Student Details</DialogTitle>
            <DialogDescription className="text-sky-700">
              {selectedStudentForEdit && `Update information for ${selectedStudentForEdit.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStudent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sky-900">Full Name *</Label>
              <Input
                id="edit-name"
                value={editStudent.name}
                onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                placeholder="Enter full name"
                required
                className="border-sky-200 focus:border-sky-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-sky-900">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={editStudent.email}
                onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })}
                placeholder="Enter email"
                required
                disabled
                className="border-sky-200 bg-gray-100"
              />
              <p className="text-xs text-sky-600">Email cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-classNumber" className="text-sky-900">Class Number</Label>
              <Input
                id="edit-classNumber"
                value={editStudent.classNumber}
                onChange={(e) => setEditStudent({ ...editStudent, classNumber: e.target.value })}
                placeholder="Enter class number (e.g., 10, 11, 12)"
                className="border-sky-200 focus:border-sky-400"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-sky-900">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editStudent.phone}
                onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                placeholder="Enter phone number"
                className="border-sky-200 focus:border-sky-400"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={editStudent.isActive}
                onChange={(e) => setEditStudent({ ...editStudent, isActive: e.target.checked })}
                className="rounded border-sky-200"
              />
              <Label htmlFor="edit-isActive" className="text-sky-900 cursor-pointer">
                Active Account
              </Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4 border-t border-sky-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedStudentForEdit(null);
                }}
                className="border-sky-200 text-sky-700 hover:bg-sky-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
              >
                Update Student
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Risk Analysis Modal */}
      {selectedStudentForAnalysis && (
        <StudentRiskAnalysisModal
          open={isRiskAnalysisModalOpen}
          onOpenChange={setIsRiskAnalysisModalOpen}
          studentId={selectedStudentForAnalysis.id}
          studentName={selectedStudentForAnalysis.name}
          isSuperAdmin={false}
        />
      )}
    </div>
  );
};

export default UserManagement;