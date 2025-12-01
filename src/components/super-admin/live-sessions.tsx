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
import { 
  Video, 
  Play, 
  Square, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Users,
  Clock,
  Calendar,
  Radio,
  Eye,
  EyeOff
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  streamer: {
    _id: string;
    fullName: string;
    email: string;
  };
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamUrl?: string;
  hlsUrl?: string;
  rtmpUrl?: string;
  scheduledTime?: string;
  duration?: number;
  subject?: {
    _id: string;
    name: string;
  };
  board?: string;
  classNumber?: string;
  isRecorded: boolean;
  chatEnabled: boolean;
  viewerCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function LiveSessions() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledTime: '',
    subject: '',
    board: 'ASLI_EXCLUSIVE_SCHOOLS',
    classNumber: '',
    isRecorded: false,
    chatEnabled: true
  });

  useEffect(() => {
    fetchSessions();
    fetchSubjects();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      // Super admin can access all streams
      const response = await fetch(`${API_BASE_URL}/api/super-admin/streams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || data || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch live sessions',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while fetching sessions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.subject || !formData.board || !formData.scheduledTime) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (Title, Subject, Board, Scheduled Time)',
        variant: 'destructive'
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/streams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          board: formData.board,
          classNumber: formData.classNumber || null,
          scheduledStartTime: formData.scheduledTime,
          isChatEnabled: formData.chatEnabled,
          isRecording: formData.isRecorded
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Live session created successfully',
        });
        setIsCreateModalOpen(false);
        setFormData({
          title: '',
          description: '',
          scheduledTime: '',
          subject: '',
          board: '',
          classNumber: '',
          isRecorded: false,
          chatEnabled: true
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to create session',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while creating session',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedSession) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/streams/${selectedSession._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Live session updated successfully',
        });
        setIsEditModalOpen(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to update session',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating session',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/streams/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Live session deleted successfully',
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to delete session',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting session',
        variant: 'destructive'
      });
    }
  };

  const handleStartStream = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/streams/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Stream started successfully',
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to start stream',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while starting stream',
        variant: 'destructive'
      });
    }
  };

  const handleStopStream = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/streams/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Stream stopped successfully',
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.message || 'Failed to stop stream',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while stopping stream',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-red-100 text-red-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'ended':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Sessions</h1>
          <p className="text-gray-600 mt-1">Manage and monitor live streaming sessions</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sessions ({filteredSessions.length})</CardTitle>
          <CardDescription>View and manage all live streaming sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Sessions Found</h3>
              <p className="text-gray-500">Create a new live session to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Streamer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Viewers</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow key={session._id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>
                      {session.streamer?.fullName || session.streamer?.email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {session.subject?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {session.classNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-gray-500" />
                        {session.viewerCount || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.scheduledTime 
                        ? new Date(session.scheduledTime).toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {session.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartStream(session._id)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {session.status === 'live' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStopStream(session._id)}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSession(session);
                            setFormData({
                              title: session.title,
                              description: session.description || '',
                              scheduledTime: session.scheduledTime ? new Date(session.scheduledTime).toISOString().slice(0, 16) : '',
                              subject: session.subject?._id || '',
                              board: session.board || '',
                              classNumber: session.classNumber || '',
                              isRecorded: session.isRecorded,
                              chatEnabled: session.chatEnabled
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(session._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Live Session</DialogTitle>
            <DialogDescription>
              Create a new live streaming session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter session title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter session description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledTime">Scheduled Time</Label>
                <Input
                  id="scheduledTime"
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject._id} value={subject._id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="board">Board</Label>
                <Select value={formData.board} onValueChange={(value) => setFormData({ ...formData, board: value })}>
                  <SelectTrigger id="board">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASLI_EXCLUSIVE_SCHOOLS">Asli Exclusive Schools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="classNumber">Class Number</Label>
                <Input
                  id="classNumber"
                  value={formData.classNumber}
                  onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                  placeholder="e.g., 10, 11, 12"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecorded"
                  checked={formData.isRecorded}
                  onChange={(e) => setFormData({ ...formData, isRecorded: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isRecorded">Record Session</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="chatEnabled"
                  checked={formData.chatEnabled}
                  onChange={(e) => setFormData({ ...formData, chatEnabled: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="chatEnabled">Enable Chat</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.title || !formData.subject || !formData.board || !formData.scheduledTime} className="bg-gradient-to-r from-sky-300 to-teal-400 hover:from-sky-400 hover:to-teal-500 text-white">
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Live Session</DialogTitle>
            <DialogDescription>
              Update live session details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter session title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter session description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-scheduledTime">Scheduled Time</Label>
                <Input
                  id="edit-scheduledTime"
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-subject">Subject</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                  <SelectTrigger id="edit-subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject._id} value={subject._id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-board">Board</Label>
                <Select value={formData.board} onValueChange={(value) => setFormData({ ...formData, board: value })}>
                  <SelectTrigger id="edit-board">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASLI_EXCLUSIVE_SCHOOLS">Asli Exclusive Schools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-classNumber">Class Number</Label>
                <Input
                  id="edit-classNumber"
                  value={formData.classNumber}
                  onChange={(e) => setFormData({ ...formData, classNumber: e.target.value })}
                  placeholder="e.g., 10, 11, 12"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isRecorded"
                  checked={formData.isRecorded}
                  onChange={(e) => setFormData({ ...formData, isRecorded: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="edit-isRecorded">Record Session</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-chatEnabled"
                  checked={formData.chatEnabled}
                  onChange={(e) => setFormData({ ...formData, chatEnabled: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="edit-chatEnabled">Enable Chat</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

