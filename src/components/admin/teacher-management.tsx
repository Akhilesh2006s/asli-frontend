import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/api-config';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  CheckCircle,
  XCircle,
  Filter,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  department?: string;
  qualifications?: string;
  subjects: Subject[];
  assignedClassIds?: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Class {
  id: string;
  name: string;
  description?: string;
  subject: string;
  grade: string;
  teacher: string;
  schedule: string;
  room: string;
  studentCount: number;
  students: any[];
  createdAt: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
}

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAssignClassDialogOpen, setIsAssignClassDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [assigningTeacher, setAssigningTeacher] = useState<Teacher | null>(null);
  const [assigningClassTeacher, setAssigningClassTeacher] = useState<Teacher | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [newTeacher, setNewTeacher] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    qualifications: '',
    subjects: [] as string[]
  });

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data); // Debug log
      console.log('Raw teachers data:', data);
      
      // Handle different response formats
      let teachersArray = [];
      if (Array.isArray(data)) {
        teachersArray = data;
      } else if (data && Array.isArray(data.data)) {
        teachersArray = data.data;
      } else if (data && Array.isArray(data.teachers)) {
        teachersArray = data.teachers;
      } else {
        console.warn('Unexpected API response format:', data);
        teachersArray = [];
      }
      
      // Map backend _id to frontend id and ensure subjects are properly mapped
      const mappedTeachers = teachersArray.map((teacher: any) => {
        // Ensure teacher object exists
        if (!teacher) {
          console.warn('Null teacher object found, skipping...');
          return null;
        }
        
        // Load saved assignments from localStorage
        const savedAssignments = JSON.parse(localStorage.getItem('teacherClassAssignments') || '{}');
        const teacherId = teacher._id || teacher.id;
        
        const mappedTeacher = {
          ...teacher,
          id: teacherId,
          subjects: teacher.subjects && Array.isArray(teacher.subjects) 
            ? teacher.subjects
                .filter((subject: any) => subject !== null && subject !== undefined && typeof subject === 'object')
                .map((subject: any) => ({
                  ...subject,
                  id: subject._id || subject.id || Math.random().toString(36).substr(2, 9) // Fallback ID
                }))
            : [],
          assignedClassIds: teacher.assignedClassIds || savedAssignments[teacherId] || []
        };
        
        // Log teacher data for debugging
        console.log(`Teacher ${mappedTeacher.fullName} subjects:`, mappedTeacher.subjects);
        console.log(`Teacher ${mappedTeacher.fullName} assignedClassIds:`, mappedTeacher.assignedClassIds);
        
        return mappedTeacher;
      }).filter(teacher => teacher !== null); // Remove any null teachers
      setTeachers(mappedTeachers);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      // Set mock data for development
      setTeachers([
        {
          id: '1',
          fullName: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@school.edu',
          phone: '+1234567890',
          department: 'Mathematics',
          qualifications: 'PhD in Mathematics',
          subjects: [
            { id: '1', name: 'Calculus', code: 'MATH101' },
            { id: '2', name: 'Algebra', code: 'MATH102' }
          ],
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          fullName: 'Prof. Michael Brown',
          email: 'michael.brown@school.edu',
          phone: '+1234567891',
          department: 'Physics',
          qualifications: 'PhD in Physics',
          subjects: [
            { id: '3', name: 'Mechanics', code: 'PHYS101' }
          ],
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Subjects API Response:', data); // Debug log
      
      // Handle different response formats
      let subjectsArray = [];
      if (Array.isArray(data)) {
        subjectsArray = data;
      } else if (data && Array.isArray(data.data)) {
        subjectsArray = data.data;
      } else if (data && Array.isArray(data.subjects)) {
        subjectsArray = data.subjects;
      } else {
        console.warn('Unexpected subjects API response format:', data);
        subjectsArray = [];
      }
      
      // Map backend _id to frontend id
      const mappedSubjects = subjectsArray.map((subject: any) => ({
        ...subject,
        id: subject._id || subject.id
      }));
      
      setSubjects(mappedSubjects);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([
        { id: '1', name: 'Calculus', code: 'MATH101', description: 'Advanced Calculus' },
        { id: '2', name: 'Algebra', code: 'MATH102', description: 'Linear Algebra' },
        { id: '3', name: 'Mechanics', code: 'PHYS101', description: 'Classical Mechanics' }
      ]);
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
      
      const data = await response.json();
      console.log('Classes API Response:', data);
      
      // Handle different response formats
      let classesArray = [];
      if (Array.isArray(data)) {
        classesArray = data;
      } else if (data && Array.isArray(data.data)) {
        classesArray = data.data;
      } else if (data && Array.isArray(data.classes)) {
        classesArray = data.classes;
      } else {
        console.warn('Unexpected classes API response format:', data);
        classesArray = [];
      }
      
      // Map backend _id to frontend id
      const mappedClasses = classesArray.map((classItem: any) => ({
        ...classItem,
        id: classItem._id || classItem.id
      }));
      
      setClasses(mappedClasses);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      setClasses([
        { id: '1', name: 'Class 10A', subject: 'General', grade: '10', teacher: 'TBD', schedule: 'Mon-Fri 9:00 AM', room: 'Room 101', studentCount: 0, students: [], createdAt: new Date().toISOString() },
        { id: '2', name: 'Class 5B', subject: 'General', grade: '5', teacher: 'TBD', schedule: 'Mon-Fri 10:00 AM', room: 'Room 102', studentCount: 0, students: [], createdAt: new Date().toISOString() }
      ]);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newTeacher.fullName || !newTeacher.email || !newTeacher.department || newTeacher.subjects.length === 0) {
      alert('Please fill in all required fields: Name, Email, Department, and at least one subject.');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(newTeacher)
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('Failed to parse JSON response:', text);
        alert(`Failed to add teacher: Server returned invalid response. Status: ${response.status}`);
        return;
      }
      
      if (response.ok && (responseData.success === true || responseData.success === undefined)) {
        setNewTeacher({ fullName: '', email: '', phone: '', department: '', qualifications: '', subjects: [] });
        setIsAddDialogOpen(false);
        fetchTeachers();
        alert('Teacher added successfully!');
      } else {
        const errorMsg = responseData.message || responseData.error || 'Unknown error occurred';
        console.error('Error response:', responseData);
        alert(`Failed to add teacher: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Failed to add teacher:', error);
      const errorMsg = error.message || 'Network error. Please check your connection and try again.';
      alert(`Failed to add teacher: ${errorMsg}`);
    }
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${editingTeacher.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingTeacher)
      });

      if (response.ok) {
        setEditingTeacher(null);
        setIsEditDialogOpen(false);
        fetchTeachers();
        alert('Teacher updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update teacher: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update teacher:', error);
      alert('Failed to update teacher. Please try again.');
    }
  };

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (window.confirm(`Are you sure you want to delete ${teacherName}? This action cannot be undone.`)) {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          alert('Authentication token not found. Please log in again.');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${teacherId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchTeachers();
          alert(`${teacherName} has been deleted successfully.`);
        } else {
          const errorData = await response.json();
          alert(`Failed to delete teacher: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to delete teacher:', error);
        alert('Failed to delete teacher. Please try again.');
      }
    }
  };

  const handleCSVUpload = async (file: File) => {
    if (isUploading) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Uploading teacher CSV file:', file.name, file.size, 'bytes');
    console.log('API Base URL:', API_BASE_URL);
    console.log('Upload endpoint:', `${API_BASE_URL}/api/admin/teachers/upload`);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('You are not authenticated. Please log in again.');
        setIsUploading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/teachers/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      console.log('Upload response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        setIsUploadDialogOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchTeachers();
        
        let message = `CSV uploaded successfully!\nCreated ${result.createdTeachers?.length || 0} teachers.\nDefault password: Password123`;
        
        if (result.errors && result.errors.length > 0) {
          message += `\n\nErrors:\n${result.errors.slice(0, 10).join('\n')}`;
          if (result.errors.length > 10) {
            message += `\n... and ${result.errors.length - 10} more errors`;
          }
        }
        
        alert(message);
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
        const errorHint = errorData.hint ? `\n\nHint: ${errorData.hint}` : '';
        const fullError = errorData.error ? `${errorMessage}\n\nError details: ${errorData.error}${errorHint}` : `${errorMessage}${errorHint}`;
        alert(`Failed to upload CSV: ${fullError}`);
      }
    } catch (error) {
      console.error('Failed to upload CSV:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      let errorMessage = 'Network error';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = `Cannot connect to server at ${API_BASE_URL}\n\nPlease check:\n1. The backend server is running\n2. The API_BASE_URL is correct\n3. CORS is properly configured`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`Failed to upload CSV: ${errorMessage}\n\nPlease check:\n1. Your admin account has a board assigned\n2. The CSV file format is correct\n3. Your internet connection is stable\n4. The backend server is running at ${API_BASE_URL}`);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `name,email,phone,department,qualifications,subjects
John Doe,john.doe@school.edu,+1234567890,Mathematics,PhD in Mathematics,Mathematics,Physics
Jane Smith,jane.smith@school.edu,+1234567891,Science,MSc in Chemistry,Chemistry,Biology`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'teacher_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAssignClasses = async (teacherId: string, classIds: string[]) => {
    if (!teacherId) {
      alert('Invalid teacher ID');
      return;
    }

    console.log('Assigning classes:', { teacherId, classIds });

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${teacherId}/assign-classes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ classIds })
      });

      const responseData = await response.json();
      console.log('Class assignment response:', responseData);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        console.log('Classes assigned successfully, refreshing teacher data...');
        console.log('Response data:', responseData.data);
        console.log('Response data assignedClassIds:', responseData.data?.assignedClassIds);
        
        // Update UI immediately with optimistic update
        if (assigningClassTeacher) {
          const updatedTeacher = { ...assigningClassTeacher, assignedClassIds: classIds };
          
          // Save to localStorage for persistence across reloads
          const savedAssignments = JSON.parse(localStorage.getItem('teacherClassAssignments') || '{}');
          savedAssignments[assigningClassTeacher.id] = classIds;
          localStorage.setItem('teacherClassAssignments', JSON.stringify(savedAssignments));
          
          setTeachers(prev => prev.map(teacher => 
            teacher.id === assigningClassTeacher.id 
              ? updatedTeacher
              : teacher
          ));
        }
        
        // Don't refresh teachers data immediately - keep optimistic update
        // await fetchTeachers();
        
        setIsAssignClassDialogOpen(false);
        setAssigningClassTeacher(null);
        setSelectedClasses([]);
        alert('Classes assigned successfully!');
      } else {
        alert(`Failed to assign classes: ${responseData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to assign classes:', error);
      alert('Failed to assign classes. Please try again.');
    }
  };

  const handleAssignSubjects = async (teacherId: string, subjectIds: string[]) => {
    if (!teacherId) {
      alert('Invalid teacher ID');
      return;
    }

    console.log('Assigning subjects:', { teacherId, subjectIds });
    console.log('Subject IDs type:', typeof subjectIds, 'Length:', subjectIds.length);
    console.log('Subject IDs details:', subjectIds);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/teachers/${teacherId}/assign-subjects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subjectIds })
      });

      const responseData = await response.json();
      console.log('Assignment response:', responseData);

      if (response.ok) {
        console.log('Subjects assigned successfully, refreshing teacher data...');

        // 1) Optimistic update (keep until server confirms)
        if (assigningTeacher) {
          const updatedTeacher = {
            ...assigningTeacher,
            subjects: subjectIds.map(id => {
              const subject = subjects.find(s => (s._id || s.id) === id);
              return subject ? {
                id: subject._id || subject.id,
                name: subject.name,
                code: subject.code,
                description: subject.description
              } : null;
            }).filter(Boolean)
          };

          setTeachers(prevTeachers =>
            prevTeachers.map(teacher =>
              teacher.id === assigningTeacher.id ? updatedTeacher : teacher
            )
          );
        }

        // 2) Poll the server a few times to avoid flicker from eventual consistency
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        let serverConfirmed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          await delay(600); // give backend time to persist
          try {
            const token2 = localStorage.getItem('authToken');
            const resp2 = await fetch(`${API_BASE_URL}/api/admin/teachers`, {
              headers: {
                'Authorization': `Bearer ${token2}`,
                'Content-Type': 'application/json'
              }
            });
            if (!resp2.ok) throw new Error(`Refresh status ${resp2.status}`);
            const raw = await resp2.json();
            const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.teachers) ? raw.teachers : [];

            // Map minimal fields we need
            const mapped = arr.map((t: any) => ({
              ...t,
              id: t._id || t.id,
              subjects: Array.isArray(t.subjects) ? t.subjects.filter((s: any) => s && typeof s === 'object').map((s: any) => ({
                ...s,
                id: s._id || s.id
              })) : []
            }));

            const refreshed = mapped.find((t: any) => t.id === teacherId);
            const ok = refreshed && Array.isArray(refreshed.subjects) && refreshed.subjects.length >= subjectIds.length;
            console.log(`Refresh attempt ${attempt} → confirmed:`, ok, refreshed?.subjects);

            if (ok) {
              setTeachers(mapped);
              serverConfirmed = true;
              break;
            }
          } catch (e) {
            console.warn('Refresh attempt failed:', e);
          }
        }

        if (!serverConfirmed) {
          console.warn('Server did not confirm assignment yet; keeping optimistic UI state.');
        }

        alert('Subjects assigned successfully!');
      } else {
        console.error('Assignment failed:', responseData);
        alert(`Failed to assign subjects: ${responseData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to assign subjects:', error);
      alert('Failed to assign subjects. Please try again.');
    }
  };

  const openAssignDialog = (teacher: Teacher) => {
    console.log('Opening assign dialog for teacher:', teacher);
    console.log('Teacher subjects:', teacher.subjects);
    
    setAssigningTeacher(teacher);
    
    // Map existing subjects to their IDs properly
    const existingSubjectIds = teacher.subjects
      .filter(subject => subject && (subject._id || subject.id))
      .map(subject => subject._id || subject.id);
    
    console.log('Existing subject IDs:', existingSubjectIds);
    setSelectedSubjects(existingSubjectIds);
    setIsAssignDialogOpen(true);
  };

  const openAssignClassDialog = (teacher: Teacher) => {
    console.log('Opening assign class dialog for teacher:', teacher);
    setAssigningClassTeacher(teacher);
    setSelectedClasses(teacher.assignedClassIds || []);
    setIsAssignClassDialogOpen(true);
  };

  const handleAssignClassDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningClassTeacher) {
      alert('Invalid teacher selected');
      return;
    }

    console.log('Dialog submit - assigningClassTeacher:', assigningClassTeacher);
    console.log('Selected classes:', selectedClasses);

    try {
      const teacherId = assigningClassTeacher.id || (assigningClassTeacher as any)._id;
      console.log('Teacher ID for assignment:', teacherId);

      if (!teacherId) {
        alert('Invalid teacher ID');
        return;
      }

      await handleAssignClasses(teacherId, selectedClasses);
    } catch (error) {
      console.error('Failed to assign classes:', error);
      alert('Failed to assign classes. Please try again.');
    }
  };

  const handleAssignDialogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningTeacher) {
      alert('Invalid teacher selected');
      return;
    }

    console.log('Dialog submit - assigningTeacher:', assigningTeacher);
    console.log('Dialog submit - selectedSubjects:', selectedSubjects);

    // Use _id if id is not available (backend returns _id)
    const teacherId = assigningTeacher.id || (assigningTeacher as any)._id;
    if (!teacherId) {
      alert('Invalid teacher ID');
      return;
    }

    console.log('Final teacher ID:', teacherId);
    console.log('Final selected subjects:', selectedSubjects);

    try {
      await handleAssignSubjects(teacherId, selectedSubjects);
      setIsAssignDialogOpen(false);
      setAssigningTeacher(null);
      setSelectedSubjects([]);
    } catch (error) {
      console.error('Failed to assign subjects:', error);
      alert('Failed to assign subjects. Please try again.');
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.isActive).length;
  const totalSubjects = teachers.reduce((total, teacher) => total + teacher.subjects.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-teal-50">
      <div className="space-y-8 p-6">
        {/* Hero Section with Vibrant Stats */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 opacity-20 rounded-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 bg-clip-text text-transparent">
                  Teacher Management
                </h1>
                <p className="text-gray-700 mt-3 text-xl font-medium">Manage teachers and their subject assignments with style</p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center shadow-xl">
                  <Users className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Vibrant Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Total Teachers</p>
                      <p className="text-4xl font-bold text-white">{totalTeachers}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    <span>Faculty members</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Active Teachers</p>
                      <p className="text-4xl font-bold text-white">{activeTeachers}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                    <span>Currently teaching</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-2xl p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Total Subjects</p>
                      <p className="text-4xl font-bold text-white">{totalSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>Subject assignments</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/70 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600 w-5 h-5" />
              <Input
                placeholder="Search teachers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-64 border-orange-200 focus:border-orange-400 bg-white/80 rounded-xl"
              />
            </div>
            <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white/95 border-orange-200 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                    Upload Teachers CSV
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 text-sm">
                    Upload a CSV file to bulk import teachers. Download the template for the correct format.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="font-medium text-gray-900">CSV Template</p>
                        <p className="text-sm text-gray-600">Download the template file</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={downloadTemplate}
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="csv-file" className="text-gray-700 font-medium mb-2 block">
                      Select CSV File
                    </Label>
                    <Input
                      id="csv-file"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      className="border-orange-200 focus:border-orange-400 rounded-xl"
                    />
                    {selectedFile && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Required columns:</strong> name, email<br />
                      <strong>Optional columns:</strong> phone, department, qualifications, subjects (comma-separated)<br />
                      <strong>Note:</strong> Subjects must exist in the system before uploading. Default password: Password123
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
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
                    className="rounded-xl"
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
                    className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 text-white disabled:opacity-50 rounded-xl"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Teachers
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl px-8 py-3 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Teacher
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] bg-white/95 border-orange-200 backdrop-blur-xl flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">Add New Teacher</DialogTitle>
                <DialogDescription className="text-gray-600 text-sm">
                  Create a new teacher account and assign subjects.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <form onSubmit={handleAddTeacher} id="add-teacher-form" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fullName" className="text-gray-700 font-medium">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newTeacher.fullName}
                      onChange={(e) => setNewTeacher({ ...newTeacher, fullName: e.target.value })}
                      className="border-orange-200 focus:border-orange-400 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newTeacher.email}
                      onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      className="border-orange-200 focus:border-orange-400 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-gray-700 font-medium">Phone</Label>
                    <Input
                      id="phone"
                      value={newTeacher.phone}
                      onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                      className="border-orange-200 focus:border-orange-400 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department" className="text-gray-700 font-medium">
                      Department <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="department"
                      value={newTeacher.department}
                      onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                      className="border-orange-200 focus:border-orange-400 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="qualifications" className="text-gray-700 font-medium">Qualifications</Label>
                  <Textarea
                    id="qualifications"
                    value={newTeacher.qualifications}
                    onChange={(e) => setNewTeacher({ ...newTeacher, qualifications: e.target.value })}
                    className="border-orange-200 focus:border-orange-400 rounded-xl"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-3 block">
                    Assign Subjects <span className="text-red-500">*</span>
                  </Label>
                  {subjects.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      No subjects available. Please add subjects first.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-orange-200 rounded-xl bg-gray-50">
                      {subjects.map(subject => {
                        const subjectId = subject.id || subject._id;
                        const isSelected = newTeacher.subjects.includes(subjectId);
                        return (
                          <Card
                            key={subjectId}
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                              isSelected
                                ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white border-orange-500 shadow-lg'
                                : 'bg-white border-gray-200 hover:border-purple-300'
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                setNewTeacher({
                                  ...newTeacher,
                                  subjects: newTeacher.subjects.filter(id => id !== subjectId)
                                });
                              } else {
                                setNewTeacher({
                                  ...newTeacher,
                                  subjects: [...newTeacher.subjects, subjectId]
                                });
                              }
                            }}
                          >
                            <CardContent className="p-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-xs truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                    {subject.name}
                                  </p>
                                  {subject.code && (
                                    <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-purple-100' : 'text-gray-600'}`}>
                                      {subject.code}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckCircle className="w-4 h-4 text-white ml-1 flex-shrink-0" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  {newTeacher.subjects.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">
                        Selected ({newTeacher.subjects.length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {newTeacher.subjects.map(subjectId => {
                          const subject = subjects.find(s => (s.id || s._id) === subjectId);
                          return subject ? (
                            <Badge key={subjectId} className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-orange-200 rounded-lg px-3 py-1">
                              {subject.name}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewTeacher({ 
                                    ...newTeacher, 
                                    subjects: newTeacher.subjects.filter(id => id !== subjectId) 
                                  });
                                }}
                                className="ml-2 text-orange-600 hover:text-purple-800 font-bold"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  {newTeacher.subjects.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">Please select at least one subject</p>
                  )}
                </div>
                </form>
              </div>
              <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" form="add-teacher-form" className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 rounded-xl">
                  Add Teacher
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher, index) => {
            const gradientColors = [
              'from-orange-500 to-orange-400',
              'from-blue-500 to-cyan-500', 
              'from-emerald-500 to-teal-500',
              'from-orange-500 to-red-500',
              'from-violet-500 to-purple-500',
              'from-indigo-500 to-blue-500'
            ];
            const gradient = gradientColors[index % gradientColors.length];
            
            return (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/20"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                        {teacher.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-xl">{teacher.fullName}</h3>
                        <p className="text-gray-600 text-sm">{teacher.email}</p>
                      </div>
                    </div>
                    <Badge className={`${teacher.isActive ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200' : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200'} rounded-lg px-3 py-1`}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-4 mb-6">
                    {teacher.phone && (
                      <div className="flex items-center text-sm text-gray-700 bg-white/50 rounded-xl p-3">
                        <Phone className="w-4 h-4 mr-3 text-orange-600" />
                        <span className="font-medium">{teacher.phone}</span>
                      </div>
                    )}
                    {teacher.department && (
                      <div className="flex items-center text-sm text-gray-700 bg-white/50 rounded-xl p-3">
                        <GraduationCap className="w-4 h-4 mr-3 text-orange-600" />
                        <span className="font-medium">{teacher.department}</span>
                      </div>
                    )}
                    {teacher.qualifications && (
                      <div className="flex items-center text-sm text-gray-700 bg-white/50 rounded-xl p-3">
                        <BookOpen className="w-4 h-4 mr-3 text-emerald-600" />
                        <span className="truncate font-medium">{teacher.qualifications}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 text-sm mb-3">Subjects:</h4>
                    <div className="flex flex-wrap gap-2">
                      {teacher.subjects.map(subject => (
                        <Badge key={subject.id} className={`bg-gradient-to-r ${gradient} text-white border-0 rounded-lg px-3 py-1 text-xs font-medium`}>
                          {subject.name}
                        </Badge>
                      ))}
                      {teacher.subjects.length === 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1">No subjects assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 text-sm mb-3">Assigned Classes:</h4>
                    <div className="space-y-2">
                      {teacher.assignedClassIds && teacher.assignedClassIds.length > 0 ? (
                        teacher.assignedClassIds.map((classId) => {
                          const classItem = classes.find(c => c.id === classId);
                          return classItem ? (
                            <div key={classId} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-900">{classItem.name}</span>
                                  <span className="text-gray-600 ml-2">- {classItem.subject}</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                📅 {classItem.schedule}
                              </div>
                              <div className="text-xs text-gray-500">
                                🏫 {classItem.room} • 👥 {classItem.studentCount} students
                              </div>
                            </div>
                          ) : (
                            <div key={classId} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <span className="text-gray-500">Class ID: {classId}</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1">No classes assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-orange-200 text-orange-700 hover:bg-orange-50 rounded-xl"
                        onClick={() => openAssignClassDialog(teacher)}
                        title="Assign Class"
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                        onClick={() => openAssignDialog(teacher)}
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.fullName)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredTeachers.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No teachers found</h3>
            <p className="text-gray-600 text-lg">Try adjusting your search criteria or add a new teacher.</p>
          </div>
        )}

        {/* Subject Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-2xl bg-white/95 border-orange-200 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                Assign Subjects to {assigningTeacher?.fullName}
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-lg">
                Select the subjects this teacher will teach.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignDialogSubmit} className="space-y-6">
              <div>
                <Label className="text-gray-700 font-medium text-lg">Available Subjects</Label>
                <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
                  {subjects.map(subject => {
                    const subjectId = subject._id || subject.id;
                    return (
                      <div key={subjectId} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-purple-100 hover:border-orange-200 transition-colors">
                        <input
                          type="checkbox"
                          id={`subject-${subjectId}`}
                          checked={selectedSubjects.includes(subjectId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjects([...selectedSubjects, subjectId]);
                            } else {
                              setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
                            }
                          }}
                          className="w-5 h-5 text-orange-600 border-purple-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor={`subject-${subjectId}`} className="flex-1 cursor-pointer">
                          <div className="font-bold text-gray-900 text-lg">{subject.name}</div>
                          <div className="text-sm text-gray-600">{subject.code} - {subject.description}</div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 rounded-xl">
                  Assign Subjects
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign Class Dialog */}
        <Dialog open={isAssignClassDialogOpen} onOpenChange={setIsAssignClassDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-800">
                Assign Classes to {assigningClassTeacher?.fullName}
              </DialogTitle>
              <DialogDescription>
                Select classes to assign to this teacher from the existing classes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignClassDialogSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium">Assign Classes</Label>
                  <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {classes.map((classItem) => (
                      <label key={classItem.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(classItem.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClasses([...selectedClasses, classItem.id]);
                            } else {
                              setSelectedClasses(selectedClasses.filter(id => id !== classItem.id));
                            }
                          }}
                          className="rounded border-gray-300 text-orange-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{classItem.name}</div>
                          <div className="text-sm text-gray-500">
                            {classItem.subject} • {classItem.schedule} • {classItem.room}
                          </div>
                          <div className="text-xs text-gray-400">
                            {classItem.studentCount} students
                          </div>
                        </div>
                      </label>
                    ))}
                    {classes.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        No classes available. Create some classes first.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsAssignClassDialogOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-600 rounded-xl">
                  Assign Classes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TeacherManagement;
