import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Clock,
  Users,
  BookOpen,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Upload
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // in minutes
  questions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const QuizManagement = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    subject: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 30,
    questions: 10
  });

  useEffect(() => {
    fetchQuizzes();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      if (response.ok) {
      const data = await response.json();
      setQuizzes(data);
      } else {
        // Mock data for development
      setQuizzes([
        {
          id: '1',
            title: 'Mathematics Fundamentals',
            description: 'Basic math concepts and problem solving',
            subject: 'Mathematics',
            difficulty: 'easy',
          duration: 30,
            questions: 15,
            isActive: true,
            createdAt: '2024-01-15',
            updatedAt: '2024-01-15'
        },
        {
          id: '2',
            title: 'Advanced Physics',
            description: 'Complex physics problems and theories',
            subject: 'Physics',
            difficulty: 'hard',
            duration: 60,
            questions: 25,
            isActive: true,
            createdAt: '2024-01-14',
            updatedAt: '2024-01-14'
          },
          {
            id: '3',
            title: 'English Literature',
            description: 'Classic literature analysis and comprehension',
            subject: 'English',
            difficulty: 'medium',
          duration: 45,
            questions: 20,
            isActive: false,
            createdAt: '2024-01-13',
            updatedAt: '2024-01-13'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newQuiz),
      });

      if (response.ok) {
        const createdQuiz = await response.json();
        setQuizzes([...quizzes, createdQuiz]);
        setIsCreateDialogOpen(false);
        setNewQuiz({
          title: '',
          description: '',
          subject: '',
          difficulty: 'medium',
          duration: 30,
          questions: 10
        });
      }
    } catch (error) {
      console.error('Failed to create quiz:', error);
    }
  };

  const handleEditQuiz = async (quiz: Quiz) => {
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quiz),
      });
      
      if (response.ok) {
        const updatedQuiz = await response.json();
        setQuizzes(quizzes.map(q => q.id === quiz.id ? updatedQuiz : q));
        setIsEditDialogOpen(false);
        setEditingQuiz(null);
      }
    } catch (error) {
      console.error('Failed to update quiz:', error);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      try {
        const response = await fetch(`/api/quizzes/${quizId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setQuizzes(quizzes.filter(q => q.id !== quizId));
        }
      } catch (error) {
        console.error('Failed to delete quiz:', error);
      }
    }
  };

  const toggleQuizStatus = async (quiz: Quiz) => {
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !quiz.isActive }),
      });

      if (response.ok) {
        const updatedQuiz = await response.json();
        setQuizzes(quizzes.map(q => q.id === quiz.id ? updatedQuiz : q));
      }
    } catch (error) {
      console.error('Failed to toggle quiz status:', error);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || quiz.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
          <div className="flex items-center justify-between">
            <div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Management</h2>
          <p className="text-gray-600">Create and manage quizzes for students</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Quiz</DialogTitle>
              <DialogDescription>
                Create a new quiz with questions, difficulty level, and time limit.
              </DialogDescription>
                </DialogHeader>
            <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Quiz Title</Label>
                    <Input
                      id="title"
                      value={newQuiz.title}
                      onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                  placeholder="Enter quiz title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                <Textarea
                      id="description"
                      value={newQuiz.description}
                      onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                  placeholder="Enter quiz description"
                  rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={newQuiz.subject} onValueChange={(value) => setNewQuiz({ ...newQuiz, subject: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject._id} value={subject.name}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={newQuiz.difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setNewQuiz({ ...newQuiz, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newQuiz.duration}
                        onChange={(e) => setNewQuiz({ ...newQuiz, duration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="questions">Number of Questions</Label>
                  <Input
                    id="questions"
                    type="number"
                    value={newQuiz.questions}
                    onChange={(e) => setNewQuiz({ ...newQuiz, questions: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                <Button onClick={handleCreateQuiz} className="bg-sky-600 hover:bg-sky-700">
                  Create Quiz
                </Button>
              </div>
                  </div>
              </DialogContent>
            </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(subject => (
              <SelectItem key={subject._id} value={subject.name}>{subject.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((quiz) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {quiz.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{quiz.subject}</p>
                  </div>
                  <Badge 
                    variant={quiz.isActive ? "default" : "secondary"}
                    className={quiz.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                  >
                    {quiz.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {quiz.duration}min
                </div>
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      {quiz.questions} Q
              </div>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      quiz.difficulty === 'easy' ? 'border-green-200 text-green-800' :
                      quiz.difficulty === 'medium' ? 'border-yellow-200 text-yellow-800' :
                      'border-red-200 text-red-800'
                    }
                  >
                    {quiz.difficulty}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleQuizStatus(quiz)}
                    >
                      {quiz.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>
              Update quiz details, difficulty, and time limit.
            </DialogDescription>
          </DialogHeader>
          {editingQuiz && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Quiz Title</Label>
                <Input
                  id="edit-title"
                  value={editingQuiz.title}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingQuiz.description}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-subject">Subject</Label>
                  <Select value={editingQuiz.subject} onValueChange={(value) => setEditingQuiz({ ...editingQuiz, subject: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject._id} value={subject.name}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                <div>
                  <Label htmlFor="edit-difficulty">Difficulty</Label>
                  <Select value={editingQuiz.difficulty} onValueChange={(value: 'easy' | 'medium' | 'hard') => setEditingQuiz({ ...editingQuiz, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-duration">Duration (minutes)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={editingQuiz.duration}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, duration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-questions">Number of Questions</Label>
                  <Input
                    id="edit-questions"
                    type="number"
                    value={editingQuiz.questions}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, questions: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleEditQuiz(editingQuiz)} className="bg-sky-600 hover:bg-sky-700">
                  Update Quiz
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizManagement;