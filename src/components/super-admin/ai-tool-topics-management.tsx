import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';

type Board = { code: string; name: string };
type TopicRow = {
  _id: string;
  board: string;
  classLabel: string;
  subject: string;
  label: string;
  topicName: string;
  subTopic: string;
  updatedAt: string;
};

const CORE_BOARD_OPTIONS = ['CBSC', 'SSC', 'IIT'];
const CORE_CLASS_OPTIONS = ['6', '7', '8', '9', '10'];
const CORE_SUBJECT_OPTIONS = ['Science', 'English', 'Hindi', 'Mathematics', 'Social Science'];
const defaultForm = {
  board: '',
  classLabel: '',
  subject: '',
  label: '',
  topicName: '',
  subTopic: '',
};

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeClassLabel(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `Class ${digits}` : '';
}

function classNumberFromLabel(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function buildDisplayTopicName(label: string, topicName: string) {
  const safeLabel = String(label || '').trim();
  const safeTopic = String(topicName || '').trim();
  if (!safeLabel) return safeTopic;
  const prefix = `${safeLabel} - `;
  return safeTopic.startsWith(prefix) ? safeTopic : `${prefix}${safeTopic}`;
}

function splitTopicByLabel(label: string, topicName: string) {
  const safeLabel = String(label || '').trim();
  const safeTopicName = String(topicName || '').trim();
  if (!safeLabel) return { label: '', topicName: safeTopicName };
  const prefix = `${safeLabel} - `;
  if (safeTopicName.startsWith(prefix)) {
    return { label: safeLabel, topicName: safeTopicName.slice(prefix.length).trim() };
  }
  return { label: safeLabel, topicName: safeTopicName };
}

export default function AiToolTopicsManagement() {
  const { toast } = useToast();
  const [boards, setBoards] = useState<Board[]>([]);
  const [rows, setRows] = useState<TopicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ board: 'all', classLabel: 'all', subject: 'all' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [isCustomBoard, setIsCustomBoard] = useState(false);
  const [customBoard, setCustomBoard] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClass, setCustomClass] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  const allBoardOptions = CORE_BOARD_OPTIONS;

  const uniqueClasses = useMemo(
    () => [...new Set(rows.map((r) => r.classLabel))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const uniqueSubjects = useMemo(
    () => [...new Set(rows.map((r) => r.subject))].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const fetchBoards = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/boards`, { headers: authHeaders() });
      if (!response.ok) return;
      const json = await response.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      setBoards(data.map((b: any) => ({ code: String(b.code || b.id || b.name), name: String(b.name || b.code || b.id) })));
    } catch {
      // ignore and fallback to manual board entry from table values
    }
  };

  const fetchRows = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (search.trim()) params.set('search', search.trim());
      if (filters.board !== 'all') params.set('board', filters.board);
      if (filters.classLabel !== 'all') params.set('classLabel', filters.classLabel);
      if (filters.subject !== 'all') params.set('subject', filters.subject);

      const response = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error('Failed to load AI tool topics');
      const json = await response.json();
      setRows(json?.data?.items || []);
      setTotal(json?.data?.total || 0);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load AI tool topics',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters.board, filters.classLabel, filters.subject]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsCustomBoard(false);
    setCustomBoard('');
    setIsCustomClass(false);
    setCustomClass('');
    setIsCustomSubject(false);
    setCustomSubject('');
    setIsDialogOpen(true);
  };

  const openEdit = (row: TopicRow) => {
    const classNumber = classNumberFromLabel(row.classLabel);
    const normalizedClass = normalizeClassLabel(classNumber);
    const splitTopic = splitTopicByLabel(row.label, row.topicName);
    setEditingId(row._id);
    setForm({
      board: row.board,
      classLabel: normalizedClass || row.classLabel,
      subject: row.subject,
      label: splitTopic.label,
      topicName: splitTopic.topicName,
      subTopic: row.subTopic,
    });
    const isCoreBoard = allBoardOptions.includes(row.board);
    setIsCustomBoard(!isCoreBoard);
    setCustomBoard(!isCoreBoard ? row.board : '');
    const isCoreClass = CORE_CLASS_OPTIONS.includes(classNumber);
    setIsCustomClass(!isCoreClass);
    setCustomClass(!isCoreClass ? classNumber : '');
    const isCoreSubject = CORE_SUBJECT_OPTIONS.includes(row.subject);
    setIsCustomSubject(!isCoreSubject);
    setCustomSubject(!isCoreSubject ? row.subject : '');
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!form.board || !form.classLabel || !form.subject || !form.topicName || !form.subTopic) {
      toast({ title: 'Validation', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = editingId
        ? `${API_BASE_URL}/api/super-admin/ai-tool-topics/${editingId}`
        : `${API_BASE_URL}/api/super-admin/ai-tool-topics`;
      const method = editingId ? 'PUT' : 'POST';
      const payload = {
        ...form,
        classLabel: normalizeClassLabel(form.classLabel),
        topicName: buildDisplayTopicName(form.label, form.topicName),
      };
      const response = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || 'Failed to save topic');

      toast({ title: 'Success', description: editingId ? 'Topic updated.' : 'Topic created.' });
      setIsDialogOpen(false);
      setForm(defaultForm);
      setIsCustomBoard(false);
      setCustomBoard('');
      setIsCustomClass(false);
      setCustomClass('');
      setIsCustomSubject(false);
      setCustomSubject('');
      setEditingId(null);
      fetchRows();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save topic',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this topic/sub topic mapping?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || 'Failed to delete');
      toast({ title: 'Deleted', description: 'Topic mapping removed.' });
      fetchRows();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete topic',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Tool Topics Management</CardTitle>
          <CardDescription>
            Manage Board → Class → Subject → Topic → Sub Topic hierarchy for AI tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search label / topic / sub topic"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filters.board} onValueChange={(v) => setFilters((p) => ({ ...p, board: v }))}>
              <SelectTrigger><SelectValue placeholder="Filter board" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boards</SelectItem>
                {[...new Set([...allBoardOptions, ...rows.map((r) => r.board)])].map((board) => (
                  <SelectItem key={board} value={board}>{board}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.classLabel} onValueChange={(v) => setFilters((p) => ({ ...p, classLabel: v }))}>
              <SelectTrigger><SelectValue placeholder="Filter class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {uniqueClasses.map((className) => (
                  <SelectItem key={className} value={className}>{className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.subject} onValueChange={(v) => setFilters((p) => ({ ...p, subject: v }))}>
              <SelectTrigger><SelectValue placeholder="Filter subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {uniqueSubjects.map((subjectName) => (
                  <SelectItem key={subjectName} value={subjectName}>{subjectName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end">
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Topic
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Board</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic Name</TableHead>
                  <TableHead>Sub Topic</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No AI tool topics found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{row.board}</TableCell>
                      <TableCell>{row.classLabel}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell>{buildDisplayTopicName(row.label, row.topicName)}</TableCell>
                      <TableCell>{row.subTopic}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => remove(row._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground">Total records: {total}</p>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-xl"
          aria-labelledby="ai-tool-topic-dialog-title"
          aria-describedby="ai-tool-topic-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="ai-tool-topic-dialog-title">
              {editingId ? 'Edit AI Tool Topic' : 'Add AI Tool Topic'}
            </DialogTitle>
            <DialogDescription id="ai-tool-topic-dialog-description">
              Create hierarchy mapping for Board, Class, Subject, Topic and Sub Topic.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Board</Label>
              <Select
                value={isCustomBoard ? '__custom__' : form.board}
                onValueChange={(v) => {
                  if (v === '__custom__') {
                    setIsCustomBoard(true);
                    setForm((p) => ({ ...p, board: customBoard || '' }));
                  } else {
                    setIsCustomBoard(false);
                    setCustomBoard('');
                    setForm((p) => ({ ...p, board: v }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
                <SelectContent>
                  {allBoardOptions.map((board) => (
                    <SelectItem key={board} value={board}>{board}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Board</SelectItem>
                </SelectContent>
              </Select>
              {isCustomBoard && (
                <Input
                  placeholder="Enter board name"
                  value={customBoard}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomBoard(value);
                    setForm((p) => ({ ...p, board: value }));
                  }}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select
                value={isCustomClass ? '__custom__' : classNumberFromLabel(form.classLabel)}
                onValueChange={(v) => {
                  if (v === '__custom__') {
                    setIsCustomClass(true);
                    setForm((p) => ({ ...p, classLabel: customClass || '' }));
                  } else {
                    setIsCustomClass(false);
                    setCustomClass('');
                    setForm((p) => ({ ...p, classLabel: normalizeClassLabel(v) }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CORE_CLASS_OPTIONS.map((classValue) => (
                    <SelectItem key={classValue} value={classValue}>{normalizeClassLabel(classValue)}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Class</SelectItem>
                </SelectContent>
              </Select>
              {isCustomClass && (
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter class number"
                  value={customClass}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '');
                    setCustomClass(digitsOnly);
                    setForm((p) => ({ ...p, classLabel: normalizeClassLabel(digitsOnly) }));
                  }}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={isCustomSubject ? '__custom__' : form.subject}
                onValueChange={(v) => {
                  if (v === '__custom__') {
                    setIsCustomSubject(true);
                    setForm((p) => ({ ...p, subject: customSubject || '' }));
                  } else {
                    setIsCustomSubject(false);
                    setCustomSubject('');
                    setForm((p) => ({ ...p, subject: v }));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {CORE_SUBJECT_OPTIONS.map((subjectValue) => (
                    <SelectItem key={subjectValue} value={subjectValue}>{subjectValue}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Subject</SelectItem>
                </SelectContent>
              </Select>
              {isCustomSubject && (
                <Input
                  type="text"
                  placeholder="Enter subject name"
                  value={customSubject}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomSubject(value);
                    setForm((p) => ({ ...p, subject: value }));
                  }}
                />
              )}
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-sm font-semibold">Topic</p>
            </div>
            <div className="space-y-2">
              <Label>Label (Optional)</Label>
              <Input
                placeholder="e.g. Chapter 1"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Enter topic name"
                value={form.topicName}
                onChange={(e) => setForm((p) => ({ ...p, topicName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sub Topic</Label>
              <Input
                placeholder="Enter sub topic"
                value={form.subTopic}
                onChange={(e) => setForm((p) => ({ ...p, subTopic: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={save} disabled={submitting}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
