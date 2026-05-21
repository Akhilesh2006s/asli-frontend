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
/** Visible fields on white dialogs (default inputs are too faint). */
const SUBJECT_FORM_FIELD_CLASS =
  'border border-sky-300 bg-sky-50 text-sky-950 shadow-sm placeholder:text-sky-500 focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400/35';
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
  XCircle
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
  const [filterByTeacher, setFilterByTeacher] = useState<string>('all');
  const [filterByStatus, setFilterByStatus] = useState<string>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    teacher: '',
  });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
    const onSubjectsUpdated = () => fetchSubjects();
    window.addEventListener('subjectsUpdated', onSubjectsUpdated);
    return () => window.removeEventListener('subjectsUpdated', onSubjectsUpdated);
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
      // Normalize backend payloads: {_id, fullName, ...} -> UI shape.
      const subjectsData = data.data || data.subjects || data || [];
      const displaySubjectName = (raw: string) =>
        String(raw || '').split('__deleted__')[0].trim();

      const normalized = Array.isArray(subjectsData)
        ? subjectsData
            .filter((s: any) => s.isActive !== false)
            .map((s: any) => ({
            id: String(s.id || s._id || ''),
            name: displaySubjectName(s.name || ''),
            code: s.code || '',
            description: s.description || '',
            teacher: s.teacher
              ? {
                  id: String(s.teacher.id || s.teacher._id || ''),
                  fullName: s.teacher.fullName || s.teacher.name || '',
                  email: s.teacher.email || '',
                }
              : undefined,
            grade: s.grade || s.classNumber || '',
            department: s.department || '',
            isActive: s.isActive === true,
            createdAt: s.createdAt || new Date().toISOString(),
          }))
        : [];
      setSubjects(normalized);
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
      const teachersData = data.data || data.teachers || data || [];
      const normalizedTeachers = Array.isArray(teachersData)
        ? teachersData.map((t: any) => ({
            id: String(t.id || t._id || ''),
            fullName: t.fullName || t.name || '',
            email: t.email || '',
          }))
        : [];
      setTeachers(normalizedTeachers);
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
        setNewSubject({ name: '', description: '', teacher: '' });
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
          setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
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

  const handleViewSubject = (subject: Subject) => {
    setViewingSubject(subject);
    setIsViewDialogOpen(true);
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
        subject.description?.toLowerCase().includes(query) ||
        subject.teacher?.fullName?.toLowerCase().includes(query)
      );
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
  }, [subjects, searchTerm, filterByTeacher, filterByStatus]);

  const totalSubjects = Array.isArray(subjects) ? subjects.length : 0;
  const activeSubjects = Array.isArray(subjects) ? subjects.filter(s => s.isActive).length : 0;
  const assignedSubjects = Array.isArray(subjects) ? subjects.filter(s => s.teacher).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-teal-50 overflow-x-hidden">
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-3 sm:space-y-8 sm:p-4 lg:p-6">
        {/* Hero Section with Vibrant Subject Stats */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 opacity-20 rounded-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl p-4 sm:rounded-3xl sm:p-6 lg:p-8 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl sm:text-4xl lg:text-5xl leading-tight font-bold bg-gradient-to-r from-orange-600 via-orange-400 to-teal-500 bg-clip-text text-transparent break-words">
                  Subject Management
                </h1>
                <p className="text-gray-700 mt-2 sm:mt-3 text-sm sm:text-base lg:text-xl font-medium">Manage subjects and their assignments with style</p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center shadow-xl">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Vibrant Subject Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:p-4 lg:p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white border-0 shadow-lg rounded-2xl p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-xs sm:text-sm font-medium">Total Subjects</p>
                      <p className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white">{totalSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-xs sm:text-sm">
                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span>Available courses</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group relative overflow-hidden bg-gradient-to-br from-sky-300 to-sky-400 text-white border-0 shadow-lg rounded-2xl p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-xs sm:text-sm font-medium">Active Subjects</p>
                      <p className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white">{activeSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-xs sm:text-sm">
                    <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                    <span>Currently offered</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group relative overflow-hidden bg-gradient-to-br from-teal-400 to-teal-500 text-white border-0 shadow-lg rounded-2xl p-3 sm:p-4 lg:p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />
                    </div>
                    <div className="text-right">
                      <p className="text-white/90 text-xs sm:text-sm font-medium">Assigned Subjects</p>
                      <p className="text-2xl sm:text-3xl sm:text-4xl font-bold text-white">{assignedSubjects}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-white/80 text-xs sm:text-sm">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span>With teachers</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Action Bar with Filters */}
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg border border-sky-200">
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Subject</DialogTitle>
                    <DialogDescription>Add a new subject for your school.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSubject} className="space-y-3">
                    <div>
                      <Label>Subject Name</Label>
                      <Input
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        className={SUBJECT_FORM_FIELD_CLASS}
                        required
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newSubject.description}
                        onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                        rows={3}
                        className={SUBJECT_FORM_FIELD_CLASS}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                      <Button type="submit">Create Subject</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sky-600 w-3 h-3 sm:w-4 sm:h-4" />
              <Input
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-0 pl-10 sm:pl-11 w-full border-sky-200 focus:border-sky-400"
              />
              </div>
              <Badge variant="outline" className="border-sky-200 text-sky-700 px-4 py-2">
                {filteredSubjects.length} of {subjects.length} subjects
              </Badge>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <Label className="font-semibold text-sky-900">Filters:</Label>
              
              {/* Teacher Filter */}
              <div className="relative">
                <div className="absolute -inset-[2px] bg-gradient-to-r from-teal-400 to-teal-500 rounded-md"></div>
                <Select value={filterByTeacher} onValueChange={setFilterByTeacher}>
                  <SelectTrigger className="w-full sm:w-48 relative z-10 border-0 bg-white focus:ring-2 focus:ring-teal-500 focus:ring-offset-0">
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
                  <SelectTrigger className="w-full sm:w-40 relative z-10 border-0 bg-white focus:ring-2 focus:ring-green-500 focus:ring-offset-0">
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
              {(filterByTeacher !== 'all' || filterByStatus !== 'all') && (
                <Button
                  variant="outline"
                  className="border-sky-200 text-sky-700 hover:bg-sky-50"
                  onClick={() => {
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
          <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="bg-sky-50/50">
                <TableHead className="text-sky-900 font-semibold">Subject</TableHead>
                <TableHead className="text-sky-900 font-semibold">Teacher</TableHead>
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
                        <div className="text-xs sm:text-sm text-sky-600 mt-1">{subject.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {subject.teacher ? (
                      <div>
                        <div className="font-medium text-sky-900">{subject.teacher.fullName}</div>
                        <div className="text-xs sm:text-sm text-sky-600">{subject.teacher.email}</div>
                      </div>
                    ) : (
                      <span className="text-sky-500 text-xs sm:text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${subject.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {subject.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50" onClick={() => handleViewSubject(subject)}>
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
        </div>

        {filteredSubjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-sky-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-sky-700 mb-2">No subjects found</h3>
            <p className="text-sky-600">Try adjusting your search criteria or add a new subject.</p>
          </div>
        )}
      </div>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Update subject details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubject} className="space-y-3">
            <div>
              <Label>Subject Name</Label>
              <Input
                value={editingSubject?.name || ''}
                onChange={(e) =>
                  setEditingSubject((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className={SUBJECT_FORM_FIELD_CLASS}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editingSubject?.description || ''}
                onChange={(e) =>
                  setEditingSubject((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
                rows={3}
                className={SUBJECT_FORM_FIELD_CLASS}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Update Subject</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Subject Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subject Details</DialogTitle>
            <DialogDescription>Read-only subject information.</DialogDescription>
          </DialogHeader>
          {viewingSubject && (
            <div className="space-y-2 text-xs sm:text-sm">
              <p><span className="font-semibold">Name:</span> {viewingSubject.name || '-'}</p>
              <p><span className="font-semibold">Teacher:</span> {viewingSubject.teacher?.fullName || 'Unassigned'}</p>
              <p><span className="font-semibold">Description:</span> {viewingSubject.description || '-'}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectManagement;
