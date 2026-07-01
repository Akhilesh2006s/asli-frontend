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
import { Edit, Plus, Search, Trash2, X } from 'lucide-react';
import { notifyCurriculumTaxonomyChanged } from '@/lib/curriculum-taxonomy-refresh';

const NATURAL_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

type Board = { code: string; name: string };
type TopicHierarchyTree = Record<string, Record<string, Record<string, string[]>>>;
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

const defaultForm = {
  board: '',
  classLabel: '',
  subject: '',
  label: '',
  topicName: '',
  subTopic: '',
};

type DialogMode = 'create' | 'edit' | 'addSubTopic';

function authHeaders() {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('superAdminToken') ||
    localStorage.getItem('token');
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

function sortNatural(values: string[]) {
  return [...values].sort((a, b) => NATURAL_COLLATOR.compare(a, b));
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
  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedSubTopic, setSelectedSubTopic] = useState('');
  const [hierarchyTree, setHierarchyTree] = useState<TopicHierarchyTree | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [lockTopicFields, setLockTopicFields] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [pendingSubTopics, setPendingSubTopics] = useState<string[]>([]);
  const [subTopicInput, setSubTopicInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isCustomBoard, setIsCustomBoard] = useState(false);
  const [customBoard, setCustomBoard] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClass, setCustomClass] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState<'class' | 'subject' | null>(null);
  const [availableBoards, setAvailableBoards] = useState<string[]>([]);
  const [dialogClassOptions, setDialogClassOptions] = useState<string[]>([]);
  const [dialogSubjectOptions, setDialogSubjectOptions] = useState<string[]>([]);

  const reloadData = async () => {
    await Promise.all([fetchRows(), loadBoards(), loadBoardHierarchy(selectedBoard)]);
  };

  const prefillFromSelection = () => ({
    board: selectedBoard || '',
    classLabel: selectedClass || '',
    subject: selectedSubject || '',
    label: '',
    topicName: selectedTopic || '',
    subTopic: '',
  });

  const resetSubTopicEntry = () => {
    setPendingSubTopics([]);
    setSubTopicInput('');
  };

  const addSubTopicToList = () => {
    const trimmed = subTopicInput.trim();
    if (!trimmed) {
      toast({ title: 'Validation', description: 'Enter a sub-topic name first.', variant: 'destructive' });
      return;
    }
    const exists = pendingSubTopics.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast({ title: 'Duplicate', description: 'This sub-topic is already in the list.', variant: 'destructive' });
      return;
    }
    setPendingSubTopics((prev) => [...prev, trimmed]);
    setSubTopicInput('');
  };

  const removePendingSubTopic = (index: number) => {
    setPendingSubTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const collectSubTopicsForSave = () => {
    const list = [...pendingSubTopics];
    const draft = subTopicInput.trim();
    if (draft && !list.some((item) => item.toLowerCase() === draft.toLowerCase())) {
      list.push(draft);
    }
    return list;
  };

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
    if (!selectedTopic && !search.trim()) {
      setRows([]);
      setTotal(0);
      return;
    }

    try {
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (search.trim()) params.set('search', search.trim());
      if (selectedBoard) params.set('board', selectedBoard);
      if (selectedClass) params.set('classLabel', selectedClass);
      if (selectedSubject) params.set('subject', selectedSubject);
      if (selectedTopic) params.set('topicName', selectedTopic);
      if (selectedSubTopic) params.set('subTopic', selectedSubTopic);

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

  const loadBoards = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics/hierarchy`, {
        headers: authHeaders(),
      });
      if (!response.ok) {
        setAvailableBoards([]);
        return;
      }
      const json = await response.json();
      setAvailableBoards(sortNatural(json?.data?.boards || []));
    } catch {
      setAvailableBoards([]);
    }
  };

  const loadBoardHierarchy = async (board: string) => {
    if (!board) {
      setHierarchyTree(null);
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/super-admin/ai-tool-topics/hierarchy?${new URLSearchParams({ board }).toString()}`,
        { headers: authHeaders() },
      );
      if (!response.ok) {
        setHierarchyTree(null);
        return;
      }
      const json = await response.json();
      setHierarchyTree(json?.data?.tree || {});
    } catch {
      setHierarchyTree(null);
    }
  };

  const hierarchyClasses = useMemo(
    () => (hierarchyTree ? sortNatural(Object.keys(hierarchyTree)) : []),
    [hierarchyTree],
  );

  const hierarchySubjects = useMemo(() => {
    if (!hierarchyTree || !selectedClass) return [];
    return sortNatural(Object.keys(hierarchyTree[selectedClass] || {}));
  }, [hierarchyTree, selectedClass]);

  const hierarchyTopics = useMemo(() => {
    if (!hierarchyTree || !selectedClass || !selectedSubject) return [];
    return Object.keys(hierarchyTree[selectedClass]?.[selectedSubject] || {});
  }, [hierarchyTree, selectedClass, selectedSubject]);

  const hierarchySubTopics = useMemo(() => {
    if (!hierarchyTree || !selectedClass || !selectedSubject || !selectedTopic) return [];
    return hierarchyTree[selectedClass]?.[selectedSubject]?.[selectedTopic] || [];
  }, [hierarchyTree, selectedClass, selectedSubject, selectedTopic]);

  const fetchDialogOptions = async (boardValue: string, classLabelValue: string) => {
    try {
      const baseUrl = `${API_BASE_URL}/api/super-admin/ai-tool-topics/options`;
      const classesQuery = boardValue
        ? `?${new URLSearchParams({ board: boardValue }).toString()}`
        : '';
      const subjectsQuery =
        boardValue && classLabelValue
          ? `?${new URLSearchParams({ board: boardValue, classLabel: classLabelValue }).toString()}`
          : '';

      const [classesRes, subjectsRes] = await Promise.all([
        fetch(`${baseUrl}${classesQuery}`, { headers: authHeaders() }),
        subjectsQuery ? fetch(`${baseUrl}${subjectsQuery}`, { headers: authHeaders() }) : Promise.resolve(null),
      ]);

      if (classesRes.ok) {
        const classesJson = await classesRes.json();
        setDialogClassOptions(sortNatural(classesJson?.data?.classes || []));
      } else {
        setDialogClassOptions([]);
      }

      if (subjectsRes?.ok) {
        const subjectsJson = await subjectsRes.json();
        setDialogSubjectOptions(sortNatural(subjectsJson?.data?.subjects || []));
      } else {
        setDialogSubjectOptions([]);
      }
    } catch {
      setDialogClassOptions([]);
      setDialogSubjectOptions([]);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (!isDialogOpen) return;
    void fetchDialogOptions(form.board, form.classLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDialogOpen, form.board, form.classLabel]);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedBoard, selectedClass, selectedSubject, selectedTopic, selectedSubTopic]);

  useEffect(() => {
    void loadBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadBoardHierarchy(selectedBoard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard]);

  useEffect(() => {
    if (selectedBoard || availableBoards.length === 0) return;
    setSelectedBoard(availableBoards[0]);
  }, [availableBoards, selectedBoard]);

  const boardTabs = useMemo(() => availableBoards, [availableBoards]);

  const visibleRows = useMemo(() => {
    if (!selectedTopic) return rows;
    return rows.filter(
      (row) => buildDisplayTopicName(row.label, row.topicName) === selectedTopic,
    );
  }, [rows, selectedTopic]);

  const openCreate = () => {
    setEditingId(null);
    setDialogMode('create');
    setLockTopicFields(false);
    setForm({ ...defaultForm, ...prefillFromSelection() });
    resetSubTopicEntry();
    setIsCustomBoard(false);
    setCustomBoard('');
    setIsCustomClass(false);
    setCustomClass('');
    setIsCustomSubject(false);
    setCustomSubject('');
    setIsDialogOpen(true);
  };

  const openAddSubTopic = () => {
    if (!selectedBoard || !selectedClass || !selectedSubject || !selectedTopic) {
      toast({
        title: 'Select hierarchy first',
        description: 'Pick board, class, subject, and topic before adding sub-topics.',
        variant: 'destructive',
      });
      return;
    }
    setEditingId(null);
    setDialogMode('addSubTopic');
    setLockTopicFields(true);
    setForm({ ...defaultForm, ...prefillFromSelection() });
    resetSubTopicEntry();
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
    setDialogMode('edit');
    setLockTopicFields(false);
    setForm({
      board: row.board,
      classLabel: normalizedClass || row.classLabel,
      subject: row.subject,
      label: splitTopic.label,
      topicName: splitTopic.topicName,
      subTopic: row.subTopic,
    });
    resetSubTopicEntry();
    setIsCustomBoard(false);
    setCustomBoard('');
    setIsCustomClass(false);
    setCustomClass('');
    setIsCustomSubject(false);
    setCustomSubject('');
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!form.board || !form.classLabel || !form.subject || !form.topicName) {
      toast({ title: 'Validation', description: 'Board, class, subject, and topic name are required.', variant: 'destructive' });
      return;
    }

    const subTopicsList = editingId
      ? [form.subTopic.trim()].filter(Boolean)
      : collectSubTopicsForSave();

    if (subTopicsList.length === 0) {
      toast({
        title: 'Validation',
        description: 'Add at least one sub-topic using the Add button.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = editingId
        ? `${API_BASE_URL}/api/super-admin/ai-tool-topics/${editingId}`
        : `${API_BASE_URL}/api/super-admin/ai-tool-topics`;
      const method = editingId ? 'PUT' : 'POST';
      const basePayload = {
        board: form.board,
        classLabel: normalizeClassLabel(form.classLabel),
        subject: form.subject,
        label: form.label,
        topicName: form.topicName.trim(),
      };

      const response = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(
          editingId
            ? { ...basePayload, subTopic: subTopicsList[0] }
            : { ...basePayload, subTopics: subTopicsList },
        ),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || 'Failed to save topic');

      const createdCount = Number(json?.createdCount || (editingId ? 1 : subTopicsList.length));
      const skipped = Array.isArray(json?.skipped) ? json.skipped.length : 0;
      toast({
        title: 'Success',
        description: editingId
          ? 'Topic updated.'
          : `Created ${createdCount} sub-topic${createdCount === 1 ? '' : 's'}${skipped ? ` (${skipped} already existed)` : ''}.`,
      });
      setIsDialogOpen(false);
      setForm(defaultForm);
      resetSubTopicEntry();
      setDialogMode('create');
      setLockTopicFields(false);
      setIsCustomBoard(false);
      setCustomBoard('');
      setIsCustomClass(false);
      setCustomClass('');
      setIsCustomSubject(false);
      setCustomSubject('');
      setEditingId(null);
      notifyCurriculumTaxonomyChanged();
      await reloadData();
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
      notifyCurriculumTaxonomyChanged();
      await reloadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete topic',
        variant: 'destructive',
      });
    }
  };

  const bulkDelete = async (scope: 'class' | 'subject') => {
    if (!selectedBoard) {
      toast({ title: 'Validation', description: 'Please select a board first.', variant: 'destructive' });
      return;
    }
    if (scope === 'class' && !selectedClass) {
      toast({ title: 'Validation', description: 'Please select a class to delete.', variant: 'destructive' });
      return;
    }
    if (scope === 'subject' && (!selectedClass || !selectedSubject)) {
      toast({
        title: 'Validation',
        description: 'Please select board, class, and subject to delete subject mappings.',
        variant: 'destructive',
      });
      return;
    }

    const confirmMessage =
      scope === 'class'
        ? `Delete all AI Tool Topic mappings for ${selectedBoard} / ${selectedClass}?`
        : `Delete all AI Tool Topic mappings for ${selectedBoard} / ${selectedClass} / ${selectedSubject}?`;
    if (!window.confirm(confirmMessage)) return;

    setBulkDeleting(scope);
    try {
      const payload: Record<string, string> = { board: selectedBoard };
      if (selectedClass) payload.classLabel = selectedClass;
      if (scope === 'subject' && selectedSubject) payload.subject = selectedSubject;
      const response = await fetch(`${API_BASE_URL}/api/super-admin/ai-tool-topics/bulk-delete`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) throw new Error(json?.message || 'Failed to bulk delete');
      const count = Number(json?.data?.modifiedCount || 0);
      toast({ title: 'Deleted', description: `Deleted ${count} topic mappings.` });
      setSelectedTopic('');
      setSelectedSubTopic('');
      notifyCurriculumTaxonomyChanged();
      await reloadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to bulk delete',
        variant: 'destructive',
      });
    } finally {
      setBulkDeleting(null);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Tool Topics Management</CardTitle>
          <CardDescription>
            Manage Board → Class → Subject → Topic → Sub Topic hierarchy for AI tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-3 w-3 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="px-0 pl-9 sm:pl-10"
                placeholder="Search label / topic / sub topic"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Add Topic
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedTopic}
                onClick={openAddSubTopic}
              >
                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Add Sub Topic
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              {boardTabs.map((board) => {
                const isActive = selectedBoard === board;
                return (
                  <Button
                    key={board}
                    type="button"
                    variant="outline"
                    className={`rounded-full border px-5 py-2 text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                    onClick={() => {
                      if (selectedBoard === board) return;
                      setSelectedBoard(board);
                      setSelectedClass('');
                      setSelectedSubject('');
                      setSelectedTopic('');
                      setSelectedSubTopic('');
                    }}
                  >
                    {board}
                  </Button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              {[
                { title: 'Classes', items: hierarchyClasses, selected: selectedClass, disabled: !selectedBoard },
                { title: 'Subjects', items: hierarchySubjects, selected: selectedSubject, disabled: !selectedClass },
                { title: 'Topics', items: hierarchyTopics, selected: selectedTopic, disabled: !selectedSubject },
                { title: 'Sub Topics', items: hierarchySubTopics, selected: selectedSubTopic, disabled: !selectedTopic },
              ].map((column) => (
                <div
                  key={column.title}
                  className="flex h-[340px] flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <h3 className="mb-3 text-xs sm:text-sm font-semibold text-slate-800">{column.title}</h3>
                  <div className="space-y-2 overflow-y-auto pr-1">
                    {column.items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                        {column.disabled ? 'Select previous level' : `No ${column.title.toLowerCase()} found`}
                      </p>
                    ) : (
                      column.items.map((item) => {
                        const isActive = column.selected === item;
                        return (
                          <button
                            key={item}
                            type="button"
                            className={`w-full rounded-lg border px-3 py-2 text-left text-xs sm:text-sm transition ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
                            }`}
                            onClick={() => {
                              if (column.title === 'Classes') {
                                setSelectedClass(item);
                                setSelectedSubject('');
                                setSelectedTopic('');
                                setSelectedSubTopic('');
                              } else if (column.title === 'Subjects') {
                                setSelectedSubject(item);
                                setSelectedTopic('');
                                setSelectedSubTopic('');
                              } else if (column.title === 'Topics') {
                                setSelectedTopic(item);
                                setSelectedSubTopic('');
                              } else {
                                setSelectedSubTopic(item);
                              }
                            }}
                          >
                            {item}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <p className="text-xs text-slate-500">
                {selectedTopic
                  ? `Selected topic: ${selectedTopic} — use “Add Sub Topic” to add more sub-topics.`
                  : 'Select a topic to add sub-topics or view records below.'}
              </p>
              <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-violet-300 text-violet-700 hover:bg-violet-50"
                disabled={!selectedTopic}
                onClick={openAddSubTopic}
              >
                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Add Sub Topic to Selected
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                disabled={!selectedBoard || !selectedClass || bulkDeleting !== null}
                onClick={() => bulkDelete('class')}
              >
                <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {bulkDeleting === 'class' ? 'Deleting Class...' : 'Delete Selected Class'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={!selectedBoard || !selectedClass || !selectedSubject || bulkDeleting !== null}
                onClick={() => bulkDelete('subject')}
              >
                <Trash2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {bulkDeleting === 'subject' ? 'Deleting Subject...' : 'Delete Selected Subject'}
              </Button>
              </div>
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
                {!selectedTopic && !search.trim() ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Select a topic above to view its sub topics below.
                    </TableCell>
                  </TableRow>
                ) : visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No AI tool topics found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{row.board}</TableCell>
                      <TableCell>{row.classLabel}</TableCell>
                      <TableCell>{row.subject}</TableCell>
                      <TableCell>{buildDisplayTopicName(row.label, row.topicName)}</TableCell>
                      <TableCell>{row.subTopic}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => openEdit(row)}>
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button size="icon" variant="outline" onClick={() => remove(row._id)}>
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Total records: {selectedTopic || search.trim() ? visibleRows.length : 0}
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetSubTopicEntry();
        }}
      >
        <DialogContent
          className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          aria-labelledby="ai-tool-topic-dialog-title"
          aria-describedby="ai-tool-topic-dialog-description"
        >
          <div className="shrink-0 border-b px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
            <DialogHeader>
              <DialogTitle id="ai-tool-topic-dialog-title">
                {dialogMode === 'edit'
                  ? 'Edit AI Tool Topic'
                  : dialogMode === 'addSubTopic'
                    ? 'Add Sub Topics to Existing Topic'
                    : 'Add AI Tool Topic'}
              </DialogTitle>
              <DialogDescription id="ai-tool-topic-dialog-description">
                {dialogMode === 'addSubTopic'
                  ? 'Add sub-topics one at a time under the selected topic.'
                  : dialogMode === 'edit'
                    ? 'Update this topic mapping.'
                    : 'Create a topic and add sub-topics one at a time.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Board</Label>
              <Select
                value={isCustomBoard ? '__custom__' : form.board}
                disabled={lockTopicFields}
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
                  {availableBoards.map((board) => (
                    <SelectItem key={board} value={board}>{board}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Board</SelectItem>
                </SelectContent>
              </Select>
              {isCustomBoard && !lockTopicFields && (
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
                disabled={lockTopicFields}
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
                  {dialogClassOptions.map((classValue) => (
                    <SelectItem key={classValue} value={classNumberFromLabel(classValue)}>{classValue}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Class</SelectItem>
                </SelectContent>
              </Select>
              {isCustomClass && !lockTopicFields && (
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
                disabled={lockTopicFields}
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
                  {dialogSubjectOptions.map((subjectValue) => (
                    <SelectItem key={subjectValue} value={subjectValue}>{subjectValue}</SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New Subject</SelectItem>
                </SelectContent>
              </Select>
              {isCustomSubject && !lockTopicFields && (
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
              <p className="text-xs sm:text-sm font-semibold">Topic</p>
            </div>
            <div className="space-y-2">
              <Label>Label (Optional)</Label>
              <Input
                placeholder="e.g. Chapter 1"
                value={form.label}
                disabled={lockTopicFields}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Enter topic name"
                value={form.topicName}
                disabled={lockTopicFields}
                onChange={(e) => setForm((p) => ({ ...p, topicName: e.target.value }))}
              />
            </div>
            {editingId ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Sub Topic</Label>
                <Input
                  placeholder="Enter sub topic"
                  value={form.subTopic}
                  onChange={(e) => setForm((p) => ({ ...p, subTopic: e.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-3 md:col-span-2">
                <Label>Sub Topics</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Enter sub topic"
                    value={subTopicInput}
                    onChange={(e) => setSubTopicInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubTopicToList();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    onClick={addSubTopicToList}
                  >
                    <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add each sub-topic separately — press Add or Enter after each one.
                  {pendingSubTopics.length > 0 ? ` (${pendingSubTopics.length} added)` : ''}
                </p>
                {pendingSubTopics.length > 0 && (
                  <ul className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 sm:max-h-56">
                    {pendingSubTopics.map((item, index) => (
                      <li
                        key={`${item}-${index}`}
                        className="flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 break-words">{item}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-600"
                          onClick={() => removePendingSubTopic(index)}
                          aria-label={`Remove ${item}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t bg-background px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={submitting}>
              {editingId ? 'Update' : dialogMode === 'addSubTopic' ? 'Add Sub Topics' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
