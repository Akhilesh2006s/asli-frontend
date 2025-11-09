import { useState, useEffect } from 'react';
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
      const response = await fetch('${API_BASE_URL}/api/admin/subjects', {
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
      const response = await fetch('${API_BASE_URL}/api/admin/teachers', {
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
      const response = await fetch('${API_BASE_URL}/api/admin/subjects', {
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

  const filteredSubjects = Array.isArray(subjects) ? subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.teacher?.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const totalSubjects = Array.isArray(subjects) ? subjects.length : 0;
  const activeSubjects = Array.isArray(subjects) ? subjects.filter(s => s.isActive).length : 0;
  const assignedSubjects = Array.isArray(subjects) ? subjects.filter(s => s.teacher).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="space-y-8 p-6">
        {/* Hero Section with Vibrant Subject Stats */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 opacity-20 rounded-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Subject Management
                </h1>
                <p className="text-gray-700 mt-3 text-xl font-medium">Manage subjects and their assignments with style</p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl">
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
                className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
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
                className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
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
                className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
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

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/40 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-sky-200">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sky-600 w-4 h-4" />
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 border-sky-200 focus:border-sky-400"
              />
            </div>
            <Button variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
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
