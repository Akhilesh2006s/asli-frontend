import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Trash2, Edit, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';

interface Subject {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  board: string;
  classNumber?: string;
  isActive: boolean;
  createdAt: string;
}

const BOARDS = [
  { value: 'CBSE_AP', label: 'CBSE AP' },
  { value: 'CBSE_TS', label: 'CBSE TS' },
  { value: 'STATE_AP', label: 'State AP' },
  { value: 'STATE_TS', label: 'State TS' }
];

export default function SubjectManagement() {
  const { toast } = useToast();
  const [selectedBoard, setSelectedBoard] = useState<string>('CBSE_AP');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    board: 'CBSE_AP'
  });

  useEffect(() => {
    fetchSubjects();
  }, [selectedBoard]);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/boards/${selectedBoard}/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubjects(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subjects',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !selectedBoard) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // Build request body, only including fields with values
      // Use formData.board to ensure we use the board selected in the form
      const requestBody: any = {
        name: formData.name.trim(),
        board: formData.board || selectedBoard
      };
      
      if (formData.code && formData.code.trim()) {
        requestBody.code = formData.code.trim();
      }
      
      if (formData.description && formData.description.trim()) {
        requestBody.description = formData.description.trim();
      }
      
      console.log('📤 Creating subject with data:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/api/super-admin/subjects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Success',
            description: 'Subject created successfully',
          });
          setIsAddModalOpen(false);
          setFormData({
            name: '',
            code: '',
            description: '',
            board: selectedBoard
          });
          fetchSubjects();
        } else {
          toast({
            title: 'Error',
            description: data.message || 'Failed to create subject',
            variant: 'destructive'
          });
        }
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { message: errorText || `Server error: ${response.status}` };
        }
        console.error('Error response:', errorData);
        toast({
          title: 'Error',
          description: errorData.message || errorData.error || 'Failed to create subject',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Create error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create subject',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject? This will also delete all associated content.')) return;

    setIsDeleting(subjectId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Subject deleted successfully',
        });
        fetchSubjects();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete subject',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subject',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Subject Management</h2>
          <p className="text-gray-600 mt-1">Create and manage subjects for each board</p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </Button>
      </div>

      {/* Board Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Label className="font-semibold">Select Board:</Label>
            <Select value={selectedBoard} onValueChange={setSelectedBoard}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOARDS.map(board => (
                  <SelectItem key={board.value} value={board.value}>
                    {board.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {subjects.length} subjects
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subjects Yet</h3>
            <p className="text-gray-600 mb-4">Start creating subjects for {BOARDS.find(b => b.value === selectedBoard)?.label} board</p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Subject
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Card key={subject._id} className="hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{subject.name}</CardTitle>
                    {subject.code && (
                      <Badge variant="outline" className="mb-2">
                        {subject.code}
                      </Badge>
                    )}
                    {subject.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{subject.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(subject._id)}
                    disabled={isDeleting === subject._id}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {subject.classNumber && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Class:</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      Class {subject.classNumber}
                    </Badge>
                  </div>
                )}
                <div className={`flex items-center justify-between text-sm ${subject.classNumber ? 'mt-2' : ''}`}>
                  <span className="text-gray-600">Board:</span>
                  <Badge className="bg-purple-100 text-purple-700">
                    {BOARDS.find(b => b.value === subject.board)?.label || subject.board}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={subject.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {subject.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Subject Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (open) {
          // Initialize form with current board when modal opens
          setFormData({
            name: '',
            code: '',
            description: '',
            board: selectedBoard
          });
        } else {
          // Reset form when modal closes
          setFormData({
            name: '',
            code: '',
            description: '',
            board: selectedBoard
          });
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create New Subject</DialogTitle>
            <DialogDescription>
              Add a new subject for {BOARDS.find(b => b.value === selectedBoard)?.label} board
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="board">Board *</Label>
              <Select
                value={formData.board}
                onValueChange={(value) => {
                  setFormData({ ...formData, board: value });
                  setSelectedBoard(value);
                }}
              >
                <SelectTrigger id="board">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARDS.map(board => (
                    <SelectItem key={board.value} value={board.value}>
                      {board.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mathematics, Physics, Chemistry"
                required
              />
            </div>

            <div>
              <Label htmlFor="code">Subject Code (Optional)</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., MATH, PHY, CHEM"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter subject description"
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Note:</p>
                  <p>This subject will be created for <strong>{BOARDS.find(b => b.value === formData.board)?.label}</strong> board. Make sure this is correct before proceeding.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Subject
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

