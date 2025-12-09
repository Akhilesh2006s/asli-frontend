import { useState, useEffect, useMemo } from 'react';
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
  BookOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Users,
  GraduationCap,
  CheckCircle,
  XCircle,
  Filter,
  Hash
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacher?: {
    id: string;
    fullName: string;
    email: string;
  };
  grade?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByDepartment, setFilterByDepartment] = useState<string>('all');
  const [filterByGrade, setFilterByGrade] = useState<string>('all');
  const [filterByTeacher, setFilterByTeacher] = useState<string>('all');
  const [filterByStatus, setFilterByStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    description: '',
    teacher: '',
    grade: '',
    department: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

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
      // Handle different API response structures
      const subjectsData = data.data || data.subjects || data || [];
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      // Set mock data for development
      setSubjects([
        {
          id: '1',
          name: 'Calculus',
          code: 'MATH101',
          description: 'Advanced Calculus and Differential Equations',
          teacher: {
            id: '1',
            fullName: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@school.edu'
          },
          grade: '12',
          department: 'Mathematics',
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Physics',
          code: 'PHYS101',
          description: 'Classical Mechanics and Thermodynamics',
          teacher: {
            id: '2',
            fullName: 'Prof. Michael Brown',
            email: 'michael.brown@school.edu'
          },
          grade: '11',
          department: 'Physics',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

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
      // Handle different API response structures
      const teachersData = data.data || data.teachers || data || [];
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      setTeachers([
        { id: '1', fullName: 'Dr. Sarah Johnson', email: 'sarah.johnson@school.edu' },
        { id: '2', fullName: 'Prof. Michael Brown', email: 'michael.brown@school.edu' }
      ]);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/subjects`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(newSubject)
      });

      if (response.ok) {
        setNewSubject({ name: '', code: '', description: '', teacher: '', grade: '', department: '' });
        setIsAddDialogOpen(false);
        fetchSubjects();
        alert('Subject added successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to add subject: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add subject:', error);
      alert('Failed to add subject. Please try again.');
    }
  };

  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(editingSubject)
      });

      if (response.ok) {
        setEditingSubject(null);
        setIsEditDialogOpen(false);
        fetchSubjects();
        alert('Subject updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update subject: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update subject:', error);
      alert('Failed to update subject. Please try again.');
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (window.confirm(`Are you sure you want to delete ${subjectName}? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/subjects/${subjectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          fetchSubjects();
          alert(`${subjectName} has been deleted successfully.`);
        } else {
          const errorData = await response.json();
          alert(`Failed to delete subject: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to delete subject:', error);
        alert('Failed to delete subject. Please try again.');
      }
    }
  };

  // Get unique values for filters
  const getUniqueDepartments = (): string[] => {
    const departments = subjects
      .map(s => s.department)
      .filter((d): d is string => Boolean(d));
    return Array.from(new Set(departments)).sort();
  };

  const getUniqueGrades = (): string[] => {
    const grades = subjects
      .map(s => s.grade)
      .filter((g): g is string => Boolean(g));
    return Array.from(new Set(grades)).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  };

  // Filter subjects based on search term and selected filters
  const filteredSubjects = useMemo(() => {
    if (!Array.isArray(subjects)) return [];

    let filtered = subjects;

    // Search filter
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(subject =>
        subject.name?.toLowerCase().includes(query) ||
        subject.code?.toLowerCase().includes(query) ||
        subject.department?.toLowerCase().includes(query) ||
        subject.teacher?.fullName?.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (filterByDepartment !== 'all') {
      filtered = filtered.filter(s => s.department === filterByDepartment);
    }

    // Grade filter
    if (filterByGrade !== 'all') {
      filtered = filtered.filter(s => s.grade === filterByGrade);
    }

    // Teacher filter
    if (filterByTeacher !== 'all') {
      if (filterByTeacher === 'assigned') {
        filtered = filtered.filter(s => s.teacher);
      } else if (filterByTeacher === 'unassigned') {
        filtered = filtered.filter(s => !s.teacher);
      } else {
        filtered = filtered.filter(s => s.teacher?.id === filterByTeacher);
      }
    }

    // Status filter
    if (filterByStatus !== 'all') {
      const isActive = filterByStatus === 'active';
      filtered = filtered.filter(s => s.isActive === isActive);
    }

    return filtered;
  }, [subjects, searchTerm, filterByDepartment, filterByGrade, filterByTeacher, filterByStatus]);

  const totalSubjects = Array.isArray(subjects) ? subjects.length : 0;
  const activeSubjects = Array.isArray(subjects) ? subjects.filter(s => s.isActive).length : 0;
  const assignedSubjects = Array.isArray(subjects) ? subjects.filter(s => s.teacher).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-teal-50">
      <div className="space-y-8 p-6">
        {/* Hero Section with Vibrant Subject Stats */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 opacity-20 rounded-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 bg-clip-text text-transparent">
                  Subject Management
                </h1>
                <p className="text-gray-700 mt-3 text-xl font-medium">Manage subjects and their assignments with style</p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center shadow-xl">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Vibrant Subject Stats Grid */}
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
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Total Subjects</p>
                      <p className="text-4xl font-bold text-white">{totalSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>Available courses</span>
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
                      <p className="text-white/90 text-sm font-medium">Active Subjects</p>
                      <p className="text-4xl font-bold text-white">{activeSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                    <span>Currently offered</span>
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
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-sm font-medium">Assigned Subjects</p>
                      <p className="text-4xl font-bold text-white">{assignedSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    <span>With teachers</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Action Bar with Filters */}
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-sky-200">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sky-600 w-4 h-4" />
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border-sky-200 focus:border-sky-400"
              />
              </div>
              <Badge variant="outline" className="border-sky-200 text-sky-700 px-4 py-2">
                {filteredSubjects.length} of {subjects.length} subjects
              </Badge>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <Label className="font-semibold text-sky-900">Filters:</Label>
              
              {/* Department Filter */}
              <div className="relative">
                <div className="absolute -inset-[2px] bg-gradient-to-r from-orange-300 to-orange-400 rounded-md"></div>
                <Select value={filterByDepartment} onValueChange={setFilterByDepartment}>
                  <SelectTrigger className="w-48 relative z-10 border-0 bg-white focus:ring-2 focus:ring-orange-500 focus:ring-offset-0">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {getUniqueDepartments().map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grade Filter */}
              <div className="relative">
                <div className="absolute -inset-[2px] bg-gradient-to-r from-sky-300 to-sky-400 rounded-md"></div>
                <Select value={filterByGrade} onValueChange={setFilterByGrade}>
                  <SelectTrigger className="w-40 relative z-10 border-0 bg-white focus:ring-2 focus:ring-sky-500 focus:ring-offset-0">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {getUniqueGrades().map(grade => (
                      <SelectItem key={grade} value={grade}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teacher Filter */}
              <div className="relative">
                <div className="absolute -inset-[2px] bg-gradient-to-r from-teal-400 to-teal-500 rounded-md"></div>
                <Select value={filterByTeacher} onValueChange={setFilterByTeacher}>
                  <SelectTrigger className="w-48 relative z-10 border-0 bg-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-0">
                    <SelectValue placeholder="All Teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <div className="absolute -inset-[2px] bg-gradient-to-r from-green-400 to-green-500 rounded-md"></div>
                <Select value={filterByStatus} onValueChange={setFilterByStatus}>
                  <SelectTrigger className="w-40 relative z-10 border-0 bg-white focus:ring-2 focus:ring-green-500 focus:ring-offset-0">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(filterByDepartment !== 'all' || filterByGrade !== 'all' || filterByTeacher !== 'all' || filterByStatus !== 'all') && (
                <Button
                  variant="outline"
                  className="border-sky-200 text-sky-700 hover:bg-sky-50"
                  onClick={() => {
                    setFilterByDepartment('all');
                    setFilterByGrade('all');
                    setFilterByTeacher('all');
                    setFilterByStatus('all');
                  }}
                >
                  Clear Filters
            </Button>
              )}
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-sky-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-sky-50/50">
                <TableHead className="text-sky-900 font-semibold">Subject</TableHead>
                <TableHead className="text-sky-900 font-semibold">Code</TableHead>
                <TableHead className="text-sky-900 font-semibold">Teacher</TableHead>
                <TableHead className="text-sky-900 font-semibold">Department</TableHead>
                <TableHead className="text-sky-900 font-semibold">Grade</TableHead>
                <TableHead className="text-sky-900 font-semibold">Status</TableHead>
                <TableHead className="text-sky-900 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject, index) => (
                <TableRow key={subject.id || `subject-${index}`} className="hover:bg-sky-50/30">
                  <TableCell>
                    <div>
                      <div className="font-medium text-sky-900">{subject.name}</div>
                      {subject.description && (
                        <div className="text-sm text-sky-600 mt-1">{subject.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-sky-200 text-sky-700">
                      <Hash className="w-3 h-3 mr-1" />
                      {subject.code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {subject.teacher ? (
                      <div>
                        <div className="font-medium text-sky-900">{subject.teacher.fullName}</div>
                        <div className="text-sm text-sky-600">{subject.teacher.email}</div>
                      </div>
                    ) : (
                      <span className="text-sky-500 text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sky-700">{subject.department || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sky-700">{subject.grade || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {subject.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-sky-200 text-sky-700 hover:bg-sky-50"
                        onClick={() => {
                          setEditingSubject(subject);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredSubjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-sky-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-sky-700 mb-2">No subjects found</h3>
            <p className="text-sky-600">Try adjusting your search criteria or add a new subject.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectManagement;
