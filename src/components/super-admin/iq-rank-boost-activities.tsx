import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAuthToken } from '@/lib/auth-utils';
import {
  Brain, 
  Trophy, 
  Target, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  TrendingUp,
  Users,
  Award,
  Star,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import { Skeleton } from '@/components/ui/skeleton';
import QuestionGenerator from './question-generator';

interface IQActivity {
  _id: string;
  title: string;
  description: string;
  type: 'iq-test' | 'rank-boost' | 'challenge' | 'quiz' | 'daily' | 'weekly';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  points: number;
  duration: number; // in minutes
  subject?: {
    _id: string;
    name: string;
  };
  board?: string;
  classNumber?: string;
  questions: number;
  isActive: boolean;
  trialOnly?: boolean;
  promptOnLogin?: boolean;
  scheduleType?: 'once' | 'daily' | 'weekly';
  scheduleDays?: number[];
  audienceType?: 'all_schools' | 'schools' | 'trial' | 'all_members' | 'specific_members';
  audienceRoles?: Array<'student' | 'teacher'>;
  targetSchools?: string[];
  targetUserIds?: string[];
  createdAt: string;
  updatedAt: string;
  participants?: number;
  averageScore?: number;
  completionRate?: number;
}

export default function IQRankBoostActivities() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [activities, setActivities] = useState<IQActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<IQActivity | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  const [schools, setSchools] = useState<Array<{ _id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'quiz' as 'iq-test' | 'rank-boost' | 'challenge' | 'quiz' | 'daily' | 'weekly',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard' | 'expert',
    points: 100,
    duration: 30,
    subject: '',
    board: '',
    classNumber: '',
    questions: 10,
    isActive: true,
    trialOnly: false,
    promptOnLogin: false,
    scheduleType: 'once' as 'once' | 'daily' | 'weekly',
    audienceType: 'all_schools' as 'all_schools' | 'schools' | 'trial' | 'all_members' | 'specific_members',
    audienceRoles: ['student'] as Array<'student' | 'teacher'>,
    targetSchools: [] as string[],
    targetUserIdsText: '',
  });

  useEffect(() => {
    fetchActivities();
    fetchSubjects();
    fetchBoards();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) return;
      const data = await response.json();
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setSchools(
        list
          .map((admin: any) => ({
            _id: String(admin._id || admin.id || ''),
            name: String(admin.schoolName || admin.name || admin.email || 'School').trim(),
          }))
          .filter((s: { _id: string }) => s._id),
      );
    } catch {
      setSchools([]);
    }
  };

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/super-admin/iq-rank-activities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.data || []);
      } else {
        // If endpoint doesn't exist yet, use empty array
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = getAuthToken();
      const url = `${API_BASE_URL}/api/super-admin/subjects`;
      console.log('🌐 Fetching subjects from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch subjects:', errorData);
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      
      // Handle network errors specifically
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_NETWORK')) {
          console.error('Network error: Cannot connect to server');
        }
      }
    }
  };

  const fetchBoards = async () => {
    try {
      const token = getAuthToken();
      const url = `${API_BASE_URL}/api/super-admin/boards`;
      console.log('🌐 Fetching boards from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBoards(data.data || []);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to fetch boards:', errorData);
      }
    } catch (error: any) {
      console.error('Error fetching boards:', error);
      
      // Handle network errors specifically
      if (error instanceof TypeError) {
        if (error.message === 'Failed to fetch' || error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('ERR_NETWORK')) {
          console.error('Network error: Cannot connect to server');
        }
      }
    }
  };

  const buildPayload = () => {
    const targetUserIds = String(formData.targetUserIdsText || '')
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      title: formData.title,
      description: formData.description,
      type: formData.scheduleType === 'daily' ? 'daily' : formData.scheduleType === 'weekly' ? 'weekly' : 'quiz',
      difficulty: formData.difficulty,
      points: formData.points,
      duration: formData.duration,
      subject: formData.subject,
      board: formData.board,
      classNumber: formData.classNumber || 'all',
      questions: formData.questions,
      isActive: formData.isActive,
      scheduleType: formData.scheduleType,
      audienceType: formData.audienceType,
      audienceRoles: formData.audienceRoles,
      targetSchools: formData.audienceType === 'schools' ? formData.targetSchools : [],
      targetUserIds: formData.audienceType === 'specific_members' ? targetUserIds : [],
      trialOnly: formData.audienceType === 'trial',
      promptOnLogin: formData.audienceType === 'trial' ? formData.promptOnLogin : false,
    };
  };

  const handleCreate = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/super-admin/iq-rank-activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(buildPayload())
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Quiz created successfully'
        });
        setIsCreateModalOpen(false);
        resetForm();
        fetchActivities();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.message || 'Failed to create quiz',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create quiz',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedActivity) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/super-admin/iq-rank-activities/${selectedActivity._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload())
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Quiz updated successfully'
        });
        setIsEditModalOpen(false);
        setSelectedActivity(null);
        resetForm();
        fetchActivities();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.message || 'Failed to update quiz',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update quiz',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this activity?',
      description: 'Are you sure you want to delete this activity?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/super-admin/iq-rank-activities/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Activity deleted successfully'
        });
        fetchActivities();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete activity',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete activity',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'quiz',
      difficulty: 'medium',
      points: 100,
      duration: 30,
      subject: '',
      board: '',
      classNumber: '',
      questions: 10,
      isActive: true,
      trialOnly: false,
      promptOnLogin: false,
      scheduleType: 'once',
      audienceType: 'all_schools',
      audienceRoles: ['student'],
      targetSchools: [],
      targetUserIdsText: '',
    });
  };

  const openEditModal = (activity: IQActivity) => {
    setSelectedActivity(activity);
    setFormData({
      title: activity.title,
      description: activity.description,
      type: activity.type,
      difficulty: activity.difficulty,
      points: activity.points,
      duration: activity.duration,
      subject: activity.subject?._id || '',
      board: activity.board || '',
      classNumber: activity.classNumber || '',
      questions: activity.questions,
      isActive: activity.isActive,
      trialOnly: Boolean(activity.trialOnly),
      promptOnLogin: Boolean(activity.promptOnLogin),
      scheduleType: activity.scheduleType || (activity.type === 'daily' ? 'daily' : activity.type === 'weekly' ? 'weekly' : 'once'),
      audienceType:
        activity.audienceType ||
        (activity.trialOnly ? 'trial' : 'all_schools'),
      audienceRoles: activity.audienceRoles?.length ? activity.audienceRoles : ['student'],
      targetSchools: (activity.targetSchools || []).map(String),
      targetUserIdsText: (activity.targetUserIds || []).map(String).join(', '),
    });
    setIsEditModalOpen(true);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesDifficulty = filterDifficulty === 'all' || activity.difficulty === filterDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'iq-test':
        return <Brain className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'rank-boost':
        return <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'challenge':
        return <Target className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'quiz':
        return <Award className="w-3 h-3 sm:w-4 sm:h-4" />;
      default:
        return <Star className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'iq-test':
        return 'bg-purple-100 text-purple-700';
      case 'rank-boost':
        return 'bg-yellow-100 text-yellow-700';
      case 'challenge':
        return 'bg-red-100 text-red-700';
      case 'quiz':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // If a class is selected, show the question generator
  if (selectedClass !== null) {
    return (
      <QuestionGenerator
        classNumber={selectedClass}
        onBack={() => setSelectedClass(null)}
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {ConfirmDialog}
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Quiz</h2>
          <p className="text-gray-600 mt-1">Create daily or weekly quizzes for schools, trial users, or specific members</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create quiz
        </Button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((classNum) => {
          const classActivities = activities.filter(a => a.classNumber === classNum.toString() && !a.trialOnly);
          const activeCount = classActivities.filter(a => a.isActive).length;
          const totalQuestions = classActivities.reduce((sum, a) => sum + (a.questions || 0), 0);
          const totalParticipants = classActivities.reduce((sum, a) => sum + (a.participants || 0), 0);

           return (
             <Card key={classNum} className="hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-blue-500 via-blue-400 to-pink-500">
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                       <span className="bg-gradient-to-br from-blue-500 to-pink-500 bg-clip-text text-transparent font-bold text-base sm:text-lg">
                         {classNum}
                       </span>
                     </div>
                     <div>
                       <CardTitle className="text-base sm:text-lg text-white">Class {classNum}</CardTitle>
                       <CardDescription className="text-white">Quizzes</CardDescription>
                     </div>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="space-y-4">
                 {/* Stats */}
                 <div className="space-y-2">
                   <div className="flex items-center justify-between text-xs sm:text-sm">
                     <span className="text-white">Activities:</span>
                     <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">{classActivities.length}</Badge>
                   </div>
                   <div className="flex items-center justify-between text-xs sm:text-sm">
                     <span className="text-white">Active:</span>
                     <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">{activeCount}</Badge>
                   </div>
                   <div className="flex items-center justify-between text-xs sm:text-sm">
                     <span className="text-white">Questions:</span>
                     <span className="font-semibold text-white">{totalQuestions}</span>
                   </div>
                   <div className="flex items-center justify-between text-xs sm:text-sm">
                     <span className="text-white">Participants:</span>
                     <span className="font-semibold text-white">{totalParticipants}</span>
                   </div>
                 </div>

                 {/* Add Questions Button */}
                 <Button 
                   className="w-full bg-white text-blue-600 hover:bg-white/90 font-semibold shadow-lg" 
                   onClick={() => {
                     // Navigate to question generator for this class
                     setSelectedClass(classNum);
                   }}
                 >
                   <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                   Add Questions
                 </Button>
               </CardContent>
             </Card>
           );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All quizzes</CardTitle>
          <CardDescription>
            Edit trial-only flags, prompt-on-login, or delete activities. Trial quizzes appear only to
            individual trial logins (not school students).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : filteredActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No activities yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity._id}>
                      <TableCell className="font-medium">{activity.title}</TableCell>
                      <TableCell>{activity.classNumber || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {activity.trialOnly ? (
                            <Badge className="bg-amber-100 text-amber-950 hover:bg-amber-100">
                              Trial only
                            </Badge>
                          ) : (
                            <Badge variant="outline">School</Badge>
                          )}
                          {activity.promptOnLogin && (
                            <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
                              Prompt on login
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(activity)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDelete(activity._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create quiz</DialogTitle>
            <DialogDescription>
              Daily or weekly quizzes for schools, all members, trial users, or specific people — students and/or teachers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter activity title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter activity description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iq-test">IQ Test</SelectItem>
                    <SelectItem value="rank-boost">Rank Boost</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Questions</Label>
                <Input
                  type="number"
                  value={formData.questions}
                  onChange={(e) => setFormData({ ...formData, questions: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Subject (Optional)</Label>
                <Select
                  value={formData.subject || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, subject: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject._id} value={subject._id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Board (Optional)</Label>
                <Select
                  value={formData.board || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, board: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board._id || board.code} value={board.code || board._id}>
                        {board.name || board.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Class Number (use &quot;all&quot; for every class)</Label>
              <Input
                value={formData.classNumber}
                onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                placeholder="e.g., 10, 11, 12, or all"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Schedule</Label>
                <Select
                  value={formData.scheduleType}
                  onValueChange={(value: 'once' | 'daily' | 'weekly') =>
                    setFormData({ ...formData, scheduleType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily quiz</SelectItem>
                    <SelectItem value="weekly">Weekly quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select
                  value={formData.audienceType}
                  onValueChange={(value: any) =>
                    setFormData({
                      ...formData,
                      audienceType: value,
                      trialOnly: value === 'trial',
                      promptOnLogin: value === 'trial' ? formData.promptOnLogin : false,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_schools">All schools</SelectItem>
                    <SelectItem value="schools">Specific school(s)</SelectItem>
                    <SelectItem value="trial">Trial members</SelectItem>
                    <SelectItem value="all_members">All members</SelectItem>
                    <SelectItem value="specific_members">Specific members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
              <p className="text-sm font-medium text-slate-800">Available to</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.audienceRoles.includes('student')}
                    onCheckedChange={(v) => {
                      const next = new Set(formData.audienceRoles);
                      if (v === true) next.add('student');
                      else next.delete('student');
                      if (next.size === 0) next.add('student');
                      setFormData({ ...formData, audienceRoles: Array.from(next) as Array<'student' | 'teacher'> });
                    }}
                  />
                  Students
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.audienceRoles.includes('teacher')}
                    onCheckedChange={(v) => {
                      const next = new Set(formData.audienceRoles);
                      if (v === true) next.add('teacher');
                      else next.delete('teacher');
                      if (next.size === 0) next.add('student');
                      setFormData({ ...formData, audienceRoles: Array.from(next) as Array<'student' | 'teacher'> });
                    }}
                  />
                  Teachers
                </label>
              </div>
            </div>
            {formData.audienceType === 'schools' ? (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium">Select schools</p>
                {schools.length === 0 ? (
                  <p className="text-xs text-slate-500">No schools loaded.</p>
                ) : (
                  schools.map((school) => (
                    <label key={school._id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.targetSchools.includes(school._id)}
                        onCheckedChange={(v) => {
                          const set = new Set(formData.targetSchools);
                          if (v === true) set.add(school._id);
                          else set.delete(school._id);
                          setFormData({ ...formData, targetSchools: Array.from(set) });
                        }}
                      />
                      <span className="truncate">{school.name}</span>
                    </label>
                  ))
                )}
              </div>
            ) : null}
            {formData.audienceType === 'specific_members' ? (
              <div>
                <Label>Member user IDs (comma-separated)</Label>
                <Textarea
                  value={formData.targetUserIdsText}
                  onChange={(e) => setFormData({ ...formData, targetUserIdsText: e.target.value })}
                  placeholder="Paste student or teacher user IDs"
                  rows={2}
                />
              </div>
            ) : null}
            {formData.audienceType === 'trial' ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs text-slate-600">
                  Only individual trial accounts see this quiz — not school students. Paid individuals stop receiving it.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.promptOnLogin}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, promptOnLogin: v === true })
                    }
                  />
                  Prompt on login
                </label>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">Create quiz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit quiz</DialogTitle>
            <DialogDescription>
              Update quiz details, schedule, and audience
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Same form fields as create modal */}
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iq-test">IQ Test</SelectItem>
                    <SelectItem value="rank-boost">Rank Boost</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Points</Label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Questions</Label>
                <Input
                  type="number"
                  value={formData.questions}
                  onChange={(e) => setFormData({ ...formData, questions: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Subject (Optional)</Label>
                <Select
                  value={formData.subject || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, subject: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject._id} value={subject._id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Board (Optional)</Label>
                <Select
                  value={formData.board || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, board: value === '__none__' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board._id || board.code} value={board.code || board._id}>
                        {board.name || board.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Class Number (Optional)</Label>
              <Input
                value={formData.classNumber}
                onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                placeholder="e.g., 10, 11, 12"
              />
            </div>
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={formData.trialOnly}
                  onCheckedChange={(v) =>
                    setFormData({
                      ...formData,
                      trialOnly: v === true,
                      promptOnLogin: v === true ? formData.promptOnLogin : false,
                    })
                  }
                />
                Trial users only
              </label>
              <p className="text-xs text-slate-600">
                When enabled, only individual trial accounts see this quiz — not school students.
                Paid individuals stop receiving it.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.promptOnLogin}
                  disabled={!formData.trialOnly}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, promptOnLogin: v === true })
                  }
                />
                Prompt on login
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

