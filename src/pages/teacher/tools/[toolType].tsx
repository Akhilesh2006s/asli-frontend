import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Download, Copy, Check, FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import {
  isAiToolApiFailureInline,
  isAiToolClientValidationError,
  isAiToolInlineOnlyError,
  resolveAiToolApiInlineMessage,
  validateAiToolForm,
} from '@/lib/ai-tool-generate';
import {
  buildAiToolViewerContent,
  pickAiToolRawData,
  resolveAiToolDisplayState,
} from '@/lib/ai-tool-response-payload';
import {
  getAiToolBoardOptions,
  getDefaultAiToolBoard,
  mapGradeLevelForIitBoard,
  parseAiToolClassNumber,
  resolveCurriculumBoardForAiTools,
  resolveIsAsliPrepExclusive,
} from '@/lib/school-program';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, ExternalHyperlink, InternalHyperlink } from 'docx';
import { saveAs } from 'file-saver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AiToolResultShell } from '@/components/ai-tool-result-shell';
import { AiToolV2InputSummary } from '@/components/ai-v2';
import { GeneratorRecordViewer } from '@/components/super-admin/generator-record-viewer';
import { buildAiToolViewerRecord } from '@/lib/build-ai-tool-viewer-record';
import type { AiToolGenerationMeta } from '@/lib/ai-tool-generation-summary';
import { useCurriculumCascade } from '@/hooks/use-curriculum-cascade';
import {
  filterSubjectsForAiTool,
  isLanguageExcludedTool,
  isStoryPassageLanguageSubject,
  isStoryLanguageTool,
  STORY_PASSAGE_TOOL_ID,
} from '@/lib/ai-tool-subject-rules';
import {
  downloadAiToolPdf,
  downloadTeacherToolCsv,
  isTeacherDownloadTool,
} from '@/lib/ai-tool-teacher-export';

interface ToolConfig {
  name: string;
  description: string;
  icon: any;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'select' | 'number' | 'textarea';
    required?: boolean;
    options?: string[];
    placeholder?: string;
    dependsOn?: string; // Field name this field depends on
    showWhen?: (values: Record<string, any>) => boolean; // Condition to show this field
    getOptions?: (value?: string) => string[]; // Function to get options based on dependency
    isStudentSelect?: boolean; // If true, populate from assigned students
    isNCERT?: boolean; // If true, use NCERT topics for options
    isCascadeSubtopic?: boolean; // Subtopic dropdown from /api/curriculum/subtopics
  }>;
}

type CitationItem = {
  index: number;
  subject: string;
  classLabel: string;
  chapter: string;
  score: string;
  preview: string;
};

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'activity-project-generator': {
    name: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'className', label: 'Section (Optional)', type: 'text', placeholder: 'e.g., A, B, C' }
    ]
  },
  'worksheet-mcq-generator': {
    name: 'Worksheet & MCQ Generator',
    description: 'Design custom worksheets and MCQs with various question types',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'questionType', label: 'Question Type', type: 'select', options: ['Single Option', 'Multiple Option', 'Integer Type', 'All Types'], placeholder: 'All Types (optional)' }
    ]
  },
  'concept-mastery-helper': {
    name: 'Concept Mastery Helper',
    description: 'Break down complex concepts into digestible lessons',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'lesson-planner': {
    name: 'Lesson Planner',
    description: 'Plan structured lessons with objectives and activities',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'homework-creator': {
    name: 'Homework Creator',
    description: 'Generate meaningful homework assignments',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'duration', label: 'Expected Duration (minutes)', type: 'number', placeholder: '30' }
    ]
  },
  'story-passage-creator': {
    name: 'Story & Passage Creator',
    description: 'Generate engaging stories and reading passages (English, Hindi & Telugu only)',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'length', label: 'Length', type: 'select', options: ['short', 'medium', 'long'] }
    ]
  },
  'short-notes-summaries-maker': {
    name: 'Short Notes & Summaries Maker',
    description: 'Condense complex topics into concise notes',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'flashcard-generator': {
    name: 'Flashcard Generator',
    description: 'Build study flashcards for quick revision',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'daily-class-plan-maker': {
    name: 'Daily Class Plan Maker',
    description: 'Organize your daily teaching schedule efficiently',
    icon: Sparkles,
    fields: [
      { name: 'date', label: 'Date', type: 'text', placeholder: 'e.g., 2025-01-15' },
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'timeSlots', label: 'Time Slots', type: 'text', placeholder: 'e.g., 9:00-10:00, 10:15-11:15' }
    ]
  },
  'exam-question-paper-generator': {
    name: 'Exam Question Paper Generator',
    description: 'Create comprehensive exam papers with varying difficulty',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
};

export default function TeacherToolPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/teacher/tools/:toolType');
  const toolType = params?.toolType || '';
  const config = TOOL_CONFIGS[toolType];
  const { toast } = useToast();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<any>(null);
  const [responseMeta, setResponseMeta] = useState<any>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState<string>('');
  const [isFallbackContent, setIsFallbackContent] = useState(false);
  const { displayText: displayGeneratedContent, rawContent: effectiveRawContent } = useMemo(
    () => resolveAiToolDisplayState(generatedContent, rawGeneratedContent),
    [generatedContent, rawGeneratedContent],
  );
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<Array<{id: string, name: string, classNumber?: string}>>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [assignedSubjectNames, setAssignedSubjectNames] = useState<string[]>([]);
  const [schoolBoardName, setSchoolBoardName] = useState('CBSE');
  const [isAsliPrepExclusive, setIsAsliPrepExclusive] = useState(false);
  const boardOptions = getAiToolBoardOptions(isAsliPrepExclusive, schoolBoardName);
  const selectedBoard = formParams.board || getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);

  const viewerContextRaw = useMemo(() => {
    const base =
      effectiveRawContent && typeof effectiveRawContent === 'object' && !Array.isArray(effectiveRawContent)
        ? (effectiveRawContent as Record<string, unknown>)
        : {};
    return {
      ...base,
      classLabel: String(formParams.gradeLevel || base.classLabel || ''),
      subject: String(formParams.subject || formParams.subjects || base.subject || ''),
      topic: String(formParams.topic || base.topic || ''),
      subtopic: String(formParams.subTopic || base.subtopic || ''),
      board: String(selectedBoard || base.board || ''),
    };
  }, [effectiveRawContent, formParams, selectedBoard]);

  const viewerRecord = useMemo(
    () =>
      buildAiToolViewerRecord({
        toolSlug: toolType,
        generatedContent: displayGeneratedContent,
        rawContent: viewerContextRaw,
        meta: {
          board: selectedBoard || '',
          classLabel: String(formParams.gradeLevel || ''),
          subject: String(formParams.subject || formParams.subjects || ''),
          topic: String(formParams.topic || ''),
          subtopic: String(formParams.subTopic || ''),
        },
      }),
    [toolType, displayGeneratedContent, viewerContextRaw, selectedBoard, formParams],
  );

  const normalizeSubjectName = (value: string) => {
    let compact = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (compact === 'maths') return 'mathematics';
    if (compact === 'socialscience' || compact === 'socialstudies' || compact === 'sst') return 'socialscience';
    if (compact === 'computerscience') return 'computerscience';
    // IIT / codes like BIOLOGY_7, PHYSICS_6 → align with curriculum canonical names
    if (compact.startsWith('biology')) return 'biology';
    if (compact.startsWith('physics')) return 'physics';
    if (compact.startsWith('chemistry')) return 'chemistry';
    if (compact.startsWith('math')) return 'mathematics';
    return compact;
  };

  const uniquePreserveOrder = (items: string[]) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      const key = normalizeSubjectName(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(item.trim());
    }
    return result;
  };

  const restrictToAssignedSubjects = (subjects: string[]) => {
    if (assignedSubjectNames.length === 0) return subjects;
    const allowed = new Set(assignedSubjectNames.map(normalizeSubjectName));
    return uniquePreserveOrder(
      subjects.filter((subject) => allowed.has(normalizeSubjectName(subject))),
    );
  };

  const cascade = useCurriculumCascade(
    formParams.gradeLevel,
    formParams.subject || formParams.subjects,
    formParams.topic,
    selectedBoard,
  );

  const availableSubjects = (() => {
    if (!formParams.gradeLevel) {
      return [];
    }
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) {
      return [];
    }
    if (raw.length === 0) return [];
    const restricted = restrictToAssignedSubjects(raw);
    if (restricted.length > 0) return restricted;
    if (raw.length > 0) return raw;
    return [];
  })();

  const classSelectOptions =
    cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;

  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(toolType, availableSubjects),
    [toolType, availableSubjects],
  );

  // No PDF auto-fill needed - users can enter any topic with Gemini API

  // Fetch teacher-assigned subjects once and keep them as default constraints for all tools
  useEffect(() => {
    const fetchTeacherBoard = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const exclusive = resolveIsAsliPrepExclusive(data?.user);
        setIsAsliPrepExclusive(exclusive);
        const curriculumBoard = resolveCurriculumBoardForAiTools(data?.user);
        const defaultBoard = getDefaultAiToolBoard(exclusive, curriculumBoard);
        setSchoolBoardName(curriculumBoard);
        setFormParams((prev) => ({
          ...prev,
          board: prev.board || defaultBoard,
        }));
      } catch (error) {
        console.error('Failed to fetch teacher board:', error);
      }
    };

    const fetchAssignedSubjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const rows = Array.isArray(data?.data) ? data.data : [];
        const names = rows
          .map((subj: any) => String(subj?.name || subj?.displayName || '').trim())
          .filter(Boolean);
        const uniqueAssigned = uniquePreserveOrder(names);
        setAssignedSubjectNames(uniqueAssigned);
      } catch (error) {
        console.error('Failed to fetch teacher assigned subjects:', error);
      }
    };
    fetchTeacherBoard();
    fetchAssignedSubjects();
  }, []);

  useEffect(() => {
    if (!formParams.board) return;
    if (!boardOptions.includes(formParams.board)) {
      const fallback = getDefaultAiToolBoard(isAsliPrepExclusive, schoolBoardName);
      setFormParams((prev) => ({ ...prev, board: fallback }));
    }
  }, [boardOptions, formParams.board, isAsliPrepExclusive, schoolBoardName]);

  // Keep subject aligned with tool-specific language rules
  useEffect(() => {
    const sub = formParams.subject || formParams.subjects;
    if (!sub) return;
    const subStr = String(sub);
    const shouldClear =
      (isStoryLanguageTool(toolType) && !isStoryPassageLanguageSubject(subStr)) ||
      (isLanguageExcludedTool(toolType) && isStoryPassageLanguageSubject(subStr));
    if (!shouldClear) return;
    setFormParams((prev) => {
      const next = { ...prev };
      delete next.subject;
      delete next.subjects;
      delete next.topic;
      delete next.subTopic;
      return next;
    });
  }, [toolType, formParams.subject, formParams.subjects]);

  useEffect(() => {
    if (!formParams.gradeLevel || subjectsForTool.length === 0) return;
    setFormParams((prev) => {
      const currentSubject = prev.subject || prev.subjects;
      const hasCurrent =
        currentSubject &&
        subjectsForTool.some(
          (s) => normalizeSubjectName(s) === normalizeSubjectName(String(currentSubject)),
        );
      if (hasCurrent) return prev;
      const defaultSubject = subjectsForTool[0];
      return {
        ...prev,
        ...(prev.subject !== undefined ? { subject: defaultSubject } : {}),
        ...(prev.subjects !== undefined ? { subjects: defaultSubject } : {}),
        ...(prev.subject === undefined && prev.subjects === undefined ? { subject: defaultSubject } : {}),
      };
    });
  }, [subjectsForTool, formParams.gradeLevel]);

  // Fetch assigned students on component mount
  useEffect(() => {
    const fetchStudents = async () => {
      // Only fetch if this tool needs student selection
      if (toolType === 'report-card-generator') {
        setIsLoadingStudents(true);
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/teacher/students`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const students = data.data.map((student: any) => ({
                id: student._id || student.id,
                name: student.fullName || student.name,
                classNumber: student.classNumber || student.assignedClass?.classNumber
              }));
              setAssignedStudents(students);
            }
          }
        } catch (error) {
          console.error('Failed to fetch students:', error);
        } finally {
          setIsLoadingStudents(false);
        }
      }
    };

    fetchStudents();
  }, [toolType]);

  // Topics from curriculum API + AI Tool Topics (skip NCERT-only filters for IIT/NEET boards)
  useEffect(() => {
    const classValue = formParams.gradeLevel;
    const subjectValue = formParams.subject || formParams.subjects;

    if (!classValue || !subjectValue) {
      setAvailableNCERTTopics([]);
      return;
    }

    if (cascade.loadingTopics && cascade.topics.length === 0) {
      setAvailableNCERTTopics([]);
      return;
    }

    const topics = [...cascade.topics];
    const boardKey = String(selectedBoard || formParams.board || '')
      .toUpperCase()
      .replace(/[\s/\\-]+/g, '');
    const isIitBoard =
      boardKey.includes('IIT') || boardKey.includes('NEET') || boardKey.includes('JEE');

    if (isIitBoard || topics.length > 0) {
      setAvailableNCERTTopics(topics);
      return;
    }

    const classNumber =
      classValue === 'IIT-6' ? NaN : parseInt(classValue.replace('Class ', '').trim());

    const isNcertScienceSyllabus =
      !isNaN(classNumber) &&
      (classNumber === 6 || classNumber === 7 || classNumber === 8 || classNumber === 10) &&
      subjectValue &&
      /science/i.test(String(subjectValue)) &&
      !/social|computer/i.test(String(subjectValue));
    const isClass7EnglishPoorvi =
      !isNaN(classNumber) &&
      classNumber === 7 &&
      subjectValue &&
      /english/i.test(String(subjectValue));
    const isClass6EnglishPoorvi =
      !isNaN(classNumber) &&
      classNumber === 6 &&
      subjectValue &&
      /english/i.test(String(subjectValue));
    const isClass6HindiMalhar =
      !isNaN(classNumber) &&
      classNumber === 6 &&
      subjectValue &&
      /(hindi|हिंदी|हिन्दी)/i.test(String(subjectValue));
    const isClass6MathematicsSyllabus =
      !isNaN(classNumber) &&
      classNumber === 6 &&
      subjectValue &&
      /(mathematics|maths|math|ganita|गणित)/i.test(String(subjectValue));
    const isClass6SocialScienceSyllabus =
      !isNaN(classNumber) &&
      classNumber === 6 &&
      subjectValue &&
      /(social\s*science|social\s*studies|sst|exploring\s*society)/i.test(String(subjectValue));
    const isClass7HindiSyllabus =
      !isNaN(classNumber) &&
      classNumber === 7 &&
      subjectValue &&
      /(hindi|हिंदी|हिन्दी)/i.test(String(subjectValue));
    const isClass7MathematicsSyllabus =
      !isNaN(classNumber) &&
      classNumber === 7 &&
      subjectValue &&
      /(mathematics|maths|math|ganita|गणित)/i.test(String(subjectValue));
    const isClass7SocialScienceSyllabus =
      !isNaN(classNumber) &&
      classNumber === 7 &&
      subjectValue &&
      /(social\s*science|social\s*studies|sst|exploring\s*society)/i.test(String(subjectValue));
    const isClass8EnglishPoorvi =
      !isNaN(classNumber) &&
      classNumber === 8 &&
      subjectValue &&
      /english/i.test(String(subjectValue));
    const isClass8HindiMalhar =
      !isNaN(classNumber) &&
      classNumber === 8 &&
      subjectValue &&
      /(hindi|हिंदी|हिन्दी)/i.test(String(subjectValue));
    const isClass8MathematicsSyllabus =
      !isNaN(classNumber) &&
      classNumber === 8 &&
      subjectValue &&
      /(mathematics|maths|math|ganita|गणित)/i.test(String(subjectValue));
    const isClass8SocialScienceSyllabus =
      !isNaN(classNumber) &&
      classNumber === 8 &&
      subjectValue &&
      /(social\s*science|social\s*studies|sst|exploring\s*society)/i.test(String(subjectValue));
    const isClass10EnglishSyllabus =
      !isNaN(classNumber) &&
      classNumber === 10 &&
      subjectValue &&
      /english/i.test(String(subjectValue));
    const isClass10MathematicsSyllabus =
      !isNaN(classNumber) &&
      classNumber === 10 &&
      subjectValue &&
      /(mathematics|maths|math|गणित)/i.test(String(subjectValue));
    const isClass10SocialScienceSyllabus =
      !isNaN(classNumber) &&
      classNumber === 10 &&
      subjectValue &&
      /(social\s*science|social\s*studies|sst|history|geography|economics|political\s*science|civics)/i.test(
        String(subjectValue),
      );
    const isClass10HindiSyllabus =
      !isNaN(classNumber) &&
      classNumber === 10 &&
      subjectValue &&
      /(hindi|हिंदी|हिन्दी)/i.test(String(subjectValue));

    // Keep full NCERT chapter list — do not hide topics missing hardcoded assets
    if (
      (isNcertScienceSyllabus ||
        isClass6EnglishPoorvi ||
        isClass6HindiMalhar ||
        isClass6MathematicsSyllabus ||
        isClass6SocialScienceSyllabus ||
        isClass7EnglishPoorvi ||
        isClass7HindiSyllabus ||
        isClass7MathematicsSyllabus ||
        isClass7SocialScienceSyllabus ||
        isClass8EnglishPoorvi ||
        isClass8HindiMalhar ||
        isClass8MathematicsSyllabus ||
        isClass8SocialScienceSyllabus ||
        isClass10EnglishSyllabus ||
        isClass10MathematicsSyllabus ||
        isClass10SocialScienceSyllabus ||
        isClass10HindiSyllabus) &&
      topics.length > 0
    ) {
      setAvailableNCERTTopics(topics);
      return;
    }

    if (
      classValue !== 'IIT-6' &&
      !isNaN(classNumber) &&
      (classNumber === 6 || classNumber === 7) &&
      topics.length > 0
    ) {
      const toolsNeedingFiltering = new Set([
        'homework-creator',
        'exam-question-paper-generator',
        'short-notes-summaries-maker',
        'worksheet-mcq-generator',
        'concept-mastery-helper',
        'lesson-planner',
        'story-passage-creator',
      ]);

      if (toolsNeedingFiltering.has(toolType)) {
        const token = localStorage.getItem('authToken');
        const run = async () => {
          const filtered: string[] = [];
          for (const topic of topics) {
            try {
              const acResp = await fetch(
                `${API_BASE_URL}/api/teacher/ai/available-content?classNumber=${classNumber}&subject=${encodeURIComponent(subjectValue)}&topic=${encodeURIComponent(topic)}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                },
              );
              if (acResp.ok) {
                const acData = await acResp.json();
                if (acData.success && Array.isArray(acData.data)) {
                  const hasTool = acData.data.some((entry: any) => entry.toolType === toolType);
                  if (hasTool) filtered.push(topic);
                } else {
                  filtered.push(topic);
                }
              } else {
                filtered.push(topic);
              }
            } catch {
              filtered.push(topic);
            }
          }
          setAvailableNCERTTopics(filtered);
        };
        run();
        return;
      }
    }

    setAvailableNCERTTopics(topics);
  }, [
    formParams.gradeLevel,
    formParams.subject,
    formParams.subjects,
    formParams.board,
    selectedBoard,
    toolType,
    cascade.topics,
    cascade.loadingTopics,
  ]);

  const handleInputChange = (fieldName: string, value: any) => {
    setFormParams(prev => {
      const updated = { ...prev, [fieldName]: value };
      
      // If student is selected, try to auto-populate class
      if (fieldName === 'studentName' && value) {
        const selectedStudent = assignedStudents.find(s => s.name === value);
        if (selectedStudent && selectedStudent.classNumber) {
          // Map classNumber to Class format (e.g., "8" -> "Class 8")
          const classValue = selectedStudent.classNumber.toString().startsWith('Class') 
            ? selectedStudent.classNumber.toString()
            : `Class ${selectedStudent.classNumber}`;
          
          if (CLASS_OPTIONS.includes(classValue)) {
            updated.gradeLevel = classValue;
          }
        }
      }
      
      if (fieldName === 'gradeLevel') {
        delete updated.subject;
        delete updated.subjects;
        delete updated.topic;
        delete updated.subTopic;
      }

      if (fieldName === 'subject' || fieldName === 'subjects') {
        delete updated.topic;
        delete updated.subTopic;
      }

      if (fieldName === 'topic') {
        delete updated.subTopic;
      }
      if (fieldName === 'board') {
        delete updated.subject;
        delete updated.subjects;
        delete updated.topic;
        delete updated.subTopic;
        if (String(value).toUpperCase() === 'IIT') {
          const iitClass =
            cascade.classOptions.find((c) => /iit/i.test(c)) ||
            'Class 6';
          updated.gradeLevel = iitClass;
        }
      }

      return updated;
    });
  };
  
  const getFieldOptions = (field: ToolConfig['fields'][0]): string[] => {
    if (field.options) {
      return field.options;
    }
    
    // Handle getOptions function (for dynamic options like subjects)
    if (field.getOptions) {
      if (field.dependsOn) {
        const dependencyValue = formParams[field.dependsOn];
        if (dependencyValue) {
          return field.getOptions(dependencyValue);
        }
        return [];
      } else {
        // getOptions without dependsOn - check if it's a function that needs state
        // If getOptions is a function that references availableSubjects, it will be called
        // and we'll catch the error, or we can use a special marker
        try {
          return field.getOptions(undefined);
        } catch (error) {
          // If getOptions references unavailable state, use availableSubjects for subject fields
          if (field.name === 'subject') {
            return subjectsForTool;
          }
          return [];
        }
      }
    }
    
    // Special case: subject field without getOptions should use availableSubjects
    if (field.name === 'subject' && !field.options && !field.getOptions) {
      return subjectsForTool;
    }
    
    return [];
  };

  const showInlineOutputMessage = useCallback((message: string) => {
    setGeneratedContent('');
    setRawGeneratedContent(null);
    setResponseMeta(null);
    setIsFallbackContent(false);
    setFallbackEmptyMessage(message);
  }, []);

  const handleGenerate = async () => {
    if (!config || !toolType) return;

    const validationError = validateAiToolForm({
      config,
      formParams: { ...formParams, board: selectedBoard },
      toolType,
      isReadingPractice: isStoryLanguageTool(toolType),
      requireBoard: true,
    });
    if (validationError) {
      showInlineOutputMessage(validationError);
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setRawGeneratedContent(null);
    setResponseMeta(null);
    setFallbackEmptyMessage('');
    setIsFallbackContent(false);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        showInlineOutputMessage('Please sign in again.');
        return;
      }

      const selectedClass = mapGradeLevelForIitBoard(selectedBoard, formParams.gradeLevel);
      const selectedSubject = formParams.subject || formParams.subjects;
      const selectedTopic = formParams.topic || '';
      const selectedSubTopic = formParams.subTopic || '';
      const selectedSection = formParams.section || formParams.className || '';

      const requestBody = {
        toolType,
        classNumber: parseAiToolClassNumber(selectedClass),
        subject: selectedSubject,
        topic: selectedTopic,
        subTopic: selectedSubTopic,
        section: selectedSection,
        questionCount: formParams.questionCount ? parseInt(formParams.questionCount) : undefined,
        duration: formParams.duration ? parseInt(formParams.duration) : undefined,
        ...formParams,
        board: selectedBoard,
        gradeLevel: selectedClass,
      };

      const response = await fetch(`${API_BASE_URL}/api/teacher/ai/generate-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      let data: { success?: boolean; data?: { content?: string; rawData?: unknown; metadata?: AiToolGenerationMeta & { aiUnavailable?: boolean; chunksUsed?: number; citations?: CitationItem[] } }; message?: string; code?: string } = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (isAiToolApiFailureInline(response, data?.code)) {
          showInlineOutputMessage(resolveAiToolApiInlineMessage(data, config?.name));
          return;
        }
        if (response.status === 503 && data?.code === 'AI_UNAVAILABLE_NO_FALLBACK') {
          showInlineOutputMessage(resolveAiToolApiInlineMessage(data, config?.name));
          return;
        }
        const errorMessage =
          data.message || responseText || `Server error: ${response.status}`;
        throw new Error(errorMessage || 'AI generation failed');
      }

      if (data.success && data?.data?.content && String(data.data.content).trim().length > 0) {
        setResponseMeta(data.data.metadata || null);
        setIsFallbackContent(!!data.data.metadata?.aiUnavailable);

        const { displayContent, rawContent } = buildAiToolViewerContent(
          data.data.content,
          pickAiToolRawData(data.data),
        );
        setRawGeneratedContent(rawContent);
        // Always keep structured sections (cards, questions, steps) when present.
        setGeneratedContent(displayContent || String(data.data.content));
      } else {
        throw new Error(data.message || 'AI returned empty response');
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      const errMsg = String(error?.message || 'Network error. Please try again.');
      if (isAiToolClientValidationError(errMsg) || /AI_TOOL_DATA_NOT_FOUND/i.test(errMsg)) {
        showInlineOutputMessage(errMsg);
        return;
      }

      try {
        const selectedClass = formParams.gradeLevel;
        const selectedSubject = formParams.subject || formParams.subjects;
        if (!selectedClass || !selectedSubject) {
          throw new Error('Missing class or subject for fallback');
        }
        const params = new URLSearchParams({
          class: String(selectedClass),
          subject: String(selectedSubject),
          topic: String(formParams.topic || ''),
          subTopic: String(formParams.subTopic || ''),
          toolType: String(toolType || ''),
          board: String(selectedBoard || formParams.board || ''),
        });
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Please sign in again.');

        const fallbackRes = await fetch(`${API_BASE_URL}/api/teacher/ai/generated-content?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!fallbackRes.ok) throw new Error('Fallback lookup failed');
        const fallbackJson = await fallbackRes.json();
        const fallbackContent =
          fallbackJson?.data?.generatedContent ??
          fallbackJson?.data?.content ??
          '';
        if (
          isAiToolInlineOnlyError(fallbackJson?.code) ||
          (fallbackJson?.success && !fallbackJson?.data)
        ) {
          showInlineOutputMessage(
            fallbackJson?.message ||
              'Saved content is incomplete or not in the correct tool format for this tool.',
          );
          return;
        }

        if (fallbackJson?.success && String(fallbackContent).trim().length > 0) {
          const { displayContent, rawContent } = buildAiToolViewerContent(
            fallbackContent,
            pickAiToolRawData(fallbackJson?.data),
          );
          setGeneratedContent(displayContent || String(fallbackContent));
          setRawGeneratedContent(rawContent);
          setResponseMeta({
            matchType: fallbackJson?.data?.matchType,
            totalCandidates: fallbackJson?.data?.totalCandidates,
            selectedIndex: fallbackJson?.data?.selectedIndex,
          });
          setIsFallbackContent(true);
          setFallbackEmptyMessage('');
        } else {
          const savedPart =
            fallbackJson?.message ||
            'No saved copy matched this class, subject, topic, sub-topic, and tool.';
          showInlineOutputMessage(`${errMsg} ${savedPart}`.trim());
        }
      } catch (fallbackError: any) {
        console.error('Fallback error:', fallbackError);
        const fe = String(fallbackError?.message || 'Fallback lookup failed');
        showInlineOutputMessage(`${errMsg} ${fe}`.trim());
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayGeneratedContent);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper function to clean LaTeX math for Word display
  const cleanLaTeXForWord = (latex: string): string => {
    if (!latex) return '';
    
    let cleaned = latex.trim();
    
    // Handle fractions first (before removing braces)
    cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, num, den) => {
      return `(${num})/(${den})`;
    });
    
    // Handle square roots
    cleaned = cleaned.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, (match, root, content) => {
      return `(${content})^(1/${root})`;
    });
    cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
    cleaned = cleaned.replace(/\\sqrt/g, '√');
    
    // Handle inverse trigonometric functions
    cleaned = cleaned.replace(/\\tan\^\{\-1\}/g, 'tan⁻¹');
    cleaned = cleaned.replace(/\\sin\^\{\-1\}/g, 'sin⁻¹');
    cleaned = cleaned.replace(/\\cos\^\{\-1\}/g, 'cos⁻¹');
    cleaned = cleaned.replace(/\\cot\^\{\-1\}/g, 'cot⁻¹');
    cleaned = cleaned.replace(/\\sec\^\{\-1\}/g, 'sec⁻¹');
    cleaned = cleaned.replace(/\\csc\^\{\-1\}/g, 'csc⁻¹');
    
    // Handle common functions
    cleaned = cleaned.replace(/\\int/g, '∫');
    cleaned = cleaned.replace(/\\sum/g, 'Σ');
    cleaned = cleaned.replace(/\\prod/g, 'Π');
    cleaned = cleaned.replace(/\\pi/g, 'π');
    cleaned = cleaned.replace(/\\alpha/g, 'α');
    cleaned = cleaned.replace(/\\beta/g, 'β');
    cleaned = cleaned.replace(/\\gamma/g, 'γ');
    cleaned = cleaned.replace(/\\theta/g, 'θ');
    cleaned = cleaned.replace(/\\lambda/g, 'λ');
    cleaned = cleaned.replace(/\\mu/g, 'μ');
    cleaned = cleaned.replace(/\\sigma/g, 'σ');
    cleaned = cleaned.replace(/\\infty/g, '∞');
    cleaned = cleaned.replace(/\\pm/g, '±');
    cleaned = cleaned.replace(/\\mp/g, '∓');
    cleaned = cleaned.replace(/\\times/g, '×');
    cleaned = cleaned.replace(/\\div/g, '÷');
    cleaned = cleaned.replace(/\\leq/g, '≤');
    cleaned = cleaned.replace(/\\geq/g, '≥');
    cleaned = cleaned.replace(/\\neq/g, '≠');
    cleaned = cleaned.replace(/\\approx/g, '≈');
    cleaned = cleaned.replace(/\\equiv/g, '≡');
    
    cleaned = cleaned.replace(/\\ln/g, 'ln');
    cleaned = cleaned.replace(/\\log/g, 'log');
    cleaned = cleaned.replace(/\\sin/g, 'sin');
    cleaned = cleaned.replace(/\\cos/g, 'cos');
    cleaned = cleaned.replace(/\\tan/g, 'tan');
    cleaned = cleaned.replace(/\\sec/g, 'sec');
    cleaned = cleaned.replace(/\\csc/g, 'csc');
    cleaned = cleaned.replace(/\\cot/g, 'cot');
    cleaned = cleaned.replace(/\\exp/g, 'exp');
    
    // Handle left/right delimiters
    cleaned = cleaned.replace(/\\left\(/g, '(');
    cleaned = cleaned.replace(/\\right\)/g, ')');
    cleaned = cleaned.replace(/\\left\[/g, '[');
    cleaned = cleaned.replace(/\\right\]/g, ']');
    cleaned = cleaned.replace(/\\left\|/g, '|');
    cleaned = cleaned.replace(/\\right\|/g, '|');
    cleaned = cleaned.replace(/\\left\{/g, '{');
    cleaned = cleaned.replace(/\\right\}/g, '}');
    
    // Handle superscripts and subscripts (with braces) - do this before removing braces
    cleaned = cleaned.replace(/\^\{([^}]+)\}/g, '^$1');
    cleaned = cleaned.replace(/\_\{([^}]+)\}/g, '_$1');
    
    // Handle simple superscripts/subscripts (without braces)
    cleaned = cleaned.replace(/\^([a-zA-Z0-9\+\-\=])/g, '^$1');
    cleaned = cleaned.replace(/\_([a-zA-Z0-9\+\-\=])/g, '_$1');
    
    // Remove remaining braces (but keep content) - do this carefully
    // First handle nested braces
    let prevCleaned = '';
    while (cleaned !== prevCleaned) {
      prevCleaned = cleaned;
      cleaned = cleaned.replace(/\{([^{}]+)\}/g, '$1');
    }
    
    // Remove backslashes (but keep special characters we've already converted)
    cleaned = cleaned.replace(/\\([a-zA-Z]+)/g, '$1');
    cleaned = cleaned.replace(/\\/g, '');
    
    // Clean up any double spaces or extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // Helper function to process text with inline math and formatting
  const processTextWithMath = (text: string): TextRun[] => {
    // First, remove all LaTeX math delimiters and clean the expressions
    let processed = text;
    
    // Process block math first ($$...$$) - should already be handled, but just in case
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
      return cleanLaTeXForWord(mathContent.trim());
    });
    
    // Process inline math ($...$) - handle all cases including at start/end of string
    // Match $...$ but not $$...$$
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
      // Skip if this looks like it might be part of block math (shouldn't happen after block math processing)
      return cleanLaTeXForWord(mathContent.trim());
    });
    
    // Now process bold formatting on the cleaned text
    const runs: TextRun[] = [];
    let lastIndex = 0;
    
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(processed)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun(processed.substring(lastIndex, match.index)));
      }
      runs.push(new TextRun({
        text: match[1],
        bold: true
      }));
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < processed.length) {
      runs.push(new TextRun(processed.substring(lastIndex)));
    }
    
    return runs.length > 0 ? runs : [new TextRun(processed)];
  };

  // Helper function to process text formatting (bold, etc.) - also handles math
  const processTextFormatting = (text: string): TextRun[] => {
    // First clean any remaining LaTeX math
    let processed = text;
    
    // Process inline math ($...$)
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
      return cleanLaTeXForWord(mathContent.trim());
    });
    
    // Now process bold formatting
    const runs: TextRun[] = [];
    let lastIndex = 0;
    
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(processed)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun(processed.substring(lastIndex, match.index)));
      }
      runs.push(new TextRun({
        text: match[1],
        bold: true
      }));
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < processed.length) {
      runs.push(new TextRun(processed.substring(lastIndex)));
    }
    
    return runs.length > 0 ? runs : [new TextRun(processed)];
  };

  const convertToWordDocument = async (content: string): Promise<Document> => {
    if (!content) {
      return new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun('No content available')]
            })
          ]
        }]
      });
    }

    const children: Paragraph[] = [];
    
    // Split content into lines
    const lines = content.split('\n');
    let currentParagraph: TextRun[] = [];
    let inCodeBlock = false;
    let inList = false;
    let listItems: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        children.push(new Paragraph({
          children: currentParagraph,
          spacing: { after: 200 }
        }));
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (listItems.length > 0) {
        listItems.forEach(item => {
          children.push(new Paragraph({
            children: [new TextRun({
              text: `• ${item.trim()}`,
              size: 22
            })],
            spacing: { after: 100 },
            indent: { left: 400 }
          }));
        });
        listItems = [];
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines (but flush current paragraph)
      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      // Check for code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) {
        currentParagraph.push(new TextRun({
          text: line + '\n',
          font: 'Courier New',
          size: 20
        }));
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        flushParagraph();
        flushList();
        children.push(new Paragraph({
          text: trimmed.substring(2),
          heading: HeadingLevel.TITLE,
          spacing: { after: 300, before: 200 }
        }));
        continue;
      }

      if (trimmed.startsWith('## ')) {
        flushParagraph();
        flushList();
        children.push(new Paragraph({
          text: trimmed.substring(3),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 250, before: 200 }
        }));
        continue;
      }

      if (trimmed.startsWith('### ')) {
        flushParagraph();
        flushList();
        children.push(new Paragraph({
          text: trimmed.substring(4),
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 200, before: 150 }
        }));
        continue;
      }

      if (trimmed.startsWith('#### ')) {
        flushParagraph();
        flushList();
        children.push(new Paragraph({
          text: trimmed.substring(5),
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 150, before: 100 }
        }));
        continue;
      }

      // Lists
      if (trimmed.match(/^[-*]\s+/)) {
        flushParagraph();
        const listItem = trimmed.replace(/^[-*]\s+/, '');
        listItems.push(listItem);
        inList = true;
        continue;
      }

      if (trimmed.match(/^\d+\.\s+/)) {
        flushParagraph();
        const listItem = trimmed.replace(/^\d+\.\s+/, '');
        listItems.push(listItem);
        inList = true;
        continue;
      }

      // Regular paragraph
      flushList();
      
      // Process inline formatting and math
      let processedLine = trimmed;
      
      // First, handle block math ($$...$$) - put on separate line
      if (processedLine.includes('$$')) {
        flushParagraph();
        const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
        let mathMatch;
        let lastMathIndex = 0;
        const parts: (string | { type: 'math', content: string })[] = [];
        
        while ((mathMatch = blockMathRegex.exec(processedLine)) !== null) {
          if (mathMatch.index > lastMathIndex) {
            const beforeMath = processedLine.substring(lastMathIndex, mathMatch.index);
            if (beforeMath.trim()) {
              parts.push(beforeMath);
            }
          }
          // Clean LaTeX for display using helper function
          const mathContent = cleanLaTeXForWord(mathMatch[1].trim());
          parts.push({ type: 'math', content: mathContent });
          lastMathIndex = mathMatch.index + mathMatch[0].length;
        }
        
        if (lastMathIndex < processedLine.length) {
          const afterMath = processedLine.substring(lastMathIndex);
          if (afterMath.trim()) {
            parts.push(afterMath);
          }
        }
        
        // Create paragraphs for each part
        parts.forEach(part => {
          if (typeof part === 'string') {
            if (part.trim()) {
              const textRuns = processTextFormatting(part);
              if (textRuns.length > 0) {
                children.push(new Paragraph({
                  children: textRuns,
                  spacing: { after: 200 }
                }));
              }
            }
          } else {
            // Math block - center it
            children.push(new Paragraph({
              children: [new TextRun({
                text: part.content,
                font: 'Cambria Math',
                size: 24
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200, before: 100 }
            }));
          }
        });
        continue;
      }
      
      // Process inline math ($...$) and formatting
      const runs = processTextWithMath(processedLine);
      currentParagraph.push(...runs);
      currentParagraph.push(new TextRun({ text: ' ', break: 1 }));
    }

    flushParagraph();
    flushList();

    return new Document({
      sections: [{
        children: children.length > 0 ? children : [
          new Paragraph({
            children: [new TextRun('No content available')]
          })
        ],
        properties: {}
      }]
    });
  };

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      const doc = await convertToWordDocument(displayGeneratedContent);
      const blob = await Packer.toBlob(doc);
      const fileName = `${config.name.replace(/\s+/g, '-')}-${Date.now()}.docx`;
      saveAs(blob, fileName);
      toast({
        title: 'Downloaded!',
        description: 'Content downloaded as Word document successfully'
      });
    } catch (error) {
      console.error('Error generating Word document:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate Word document',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const fileName = `${config.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
      await downloadAiToolPdf(
        fileName,
        `<div class="prose">${renderMarkdown(displayGeneratedContent)}</div>`,
        {
          toolName: config.name,
          board: String(selectedBoard || ''),
          classLabel: String(formParams.gradeLevel || ''),
          subject: String(formParams.subject || formParams.subjects || ''),
          topic: String(formParams.topic || ''),
          subtopic: String(formParams.subTopic || ''),
        },
      );
      toast({
        title: 'Downloaded!',
        description: 'Content downloaded as PDF successfully',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = () => {
    try {
      setIsDownloading(true);
      const fileName = `${config.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
      const saved = downloadTeacherToolCsv(toolType, displayGeneratedContent, effectiveRawContent, fileName);
      if (!saved) {
        const csvRows = ['Content', `"${displayGeneratedContent.replace(/"/g, '""').replace(/\n/g, ' ')}"`];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, fileName);
      }
      toast({
        title: 'Downloaded!',
        description: 'Content downloaded as CSV successfully',
      });
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate CSV',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const showDownloadActions = isTeacherDownloadTool(toolType);

  // Early return check must be AFTER all hooks
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Tool Not Found</h1>
          <Button onClick={() => {
            localStorage.setItem('teacherDashboardTab', 'vidya-ai');
            setLocation('/teacher/dashboard');
          }}>Go Back</Button>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => {
              // Navigate to dashboard and set Vidya AI tab as active
              localStorage.setItem('teacherDashboardTab', 'vidya-ai');
              setLocation('/teacher/dashboard');
            }}
            className="shrink-0 border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" aria-hidden />
            Back
          </Button>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl sm:text-3xl font-bold text-gray-900 break-words">{config.name}</h1>
              <p className="text-gray-600">{config.description}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 sm:p-4 lg:p-6">
          {/* Tool parameters — 3-column grid, then generate */}
          <Card>
            <CardHeader>
              <CardTitle>Tool Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="board">Board *</Label>
                <Select
                  value={selectedBoard}
                  onValueChange={(value) => handleInputChange('board', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {toolType === STORY_PASSAGE_TOOL_ID ? (
                <p className="sm:col-span-2 lg:col-span-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Story &amp; Passage Creator is available for <strong>English</strong> and{' '}
                  <strong>Hindi</strong> subjects only.
                </p>
              ) : null}
              {isLanguageExcludedTool(toolType) ? (
                <p className="sm:col-span-2 lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  This tool is not available for <strong>English</strong>, <strong>Hindi</strong>, or{' '}
                  <strong>Telugu</strong> subjects.
                </p>
              ) : null}
              {config.fields.map((field: any) => {
                // Check if field should be shown based on showWhen condition
                if (field.showWhen && !field.showWhen(formParams)) {
                  return null;
                }
                let fieldOptions: string[] = [];
                let isDisabled = false;
                let loadingDropdown = false;
                const subjectField = formParams.subject || formParams.subjects;

                if (field.isStudentSelect) {
                  fieldOptions = assignedStudents.map((s) => s.name);
                  isDisabled = isLoadingStudents || assignedStudents.length === 0;
                  loadingDropdown = isLoadingStudents;
                } else if (field.name === 'gradeLevel') {
                  fieldOptions = classSelectOptions;
                  isDisabled = cascade.loadingClasses && classSelectOptions.length === 0;
                  loadingDropdown = cascade.loadingClasses;
                } else if (field.isNCERT && field.name === 'topic') {
                  fieldOptions = availableNCERTTopics;
                  loadingDropdown = cascade.loadingTopics;
                  isDisabled =
                    !formParams.gradeLevel ||
                    !subjectField ||
                    cascade.loadingTopics;
                } else if (field.isCascadeSubtopic && field.name === 'subTopic') {
                  fieldOptions = cascade.subtopics;
                  loadingDropdown = cascade.loadingSubtopics;
                  isDisabled =
                    !formParams.gradeLevel || !subjectField || !formParams.topic || cascade.loadingSubtopics;
                } else if (field.name === 'subjects' && field.dependsOn === 'gradeLevel') {
                  fieldOptions = subjectsForTool;
                  loadingDropdown = cascade.loadingSubjects;
                  isDisabled =
                    !formParams.gradeLevel ||
                    cascade.loadingSubjects;
                } else if (field.name === 'subject' && field.type === 'select' && !field.options) {
                  fieldOptions = subjectsForTool;
                  loadingDropdown = cascade.loadingSubjects;
                  isDisabled =
                    !formParams.gradeLevel ||
                    cascade.loadingSubjects;
                } else {
                  fieldOptions = getFieldOptions(field);
                  isDisabled = !!(field.dependsOn && !formParams[field.dependsOn]);
                }

                return (
                  <div
                    key={field.name}
                    className={field.type === 'textarea' ? 'sm:col-span-2 lg:col-span-3' : ''}
                  >
                    <Label htmlFor={field.name} className="flex items-center gap-2">
                      {field.label}
                      {loadingDropdown && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-600" aria-hidden />}
                    </Label>
                    {(field.type === 'select' || field.isNCERT || field.isCascadeSubtopic) ? (
                      <Select
                        value={formParams[field.name] || ''}
                        onValueChange={(value) => handleInputChange(field.name, value)}
                        disabled={isDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isDisabled
                                ? field.isStudentSelect
                                  ? isLoadingStudents
                                    ? 'Loading students...'
                                    : 'No students assigned'
                                  : field.name === 'gradeLevel' && cascade.loadingClasses
                                    ? 'Loading classes...'
                                    : field.name === 'subject' ||
                                        (field.name === 'subjects' && field.dependsOn === 'gradeLevel')
                                      ? !formParams.gradeLevel || cascade.loadingSubjects
                                        ? 'Select Class first'
                                        : subjectsForTool.length === 0
                                          ? toolType === STORY_PASSAGE_TOOL_ID
                                            ? 'English, Hindi, or Telugu only for this tool'
                                            : isLanguageExcludedTool(toolType)
                                              ? 'Not available for English, Hindi, or Telugu'
                                              : 'No data available'
                                          : field.placeholder || `Select ${field.label}`
                                      : field.isNCERT && field.name === 'topic'
                                        ? !formParams.gradeLevel
                                          ? 'Select Class first'
                                          : !subjectField || cascade.loadingTopics
                                            ? 'Select Subject first'
                                            : cascade.loadingTopics
                                              ? 'Loading topics...'
                                              : availableNCERTTopics.length === 0
                                                ? 'No data available'
                                                : field.placeholder || 'Select topic'
                                        : field.isCascadeSubtopic
                                          ? !formParams.topic
                                            ? 'Select Topic first'
                                            : cascade.loadingSubtopics
                                              ? 'Loading subtopics...'
                                              : cascade.subtopics.length === 0
                                                ? 'No data available'
                                                : field.placeholder || 'Select subtopic'
                                          : `Select ${config.fields.find((f) => f.name === field.dependsOn)?.label || 'Class'} first`
                                : field.placeholder || `Select ${field.label}`
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.length > 0 ? (
                            fieldOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-xs sm:text-sm text-gray-500">
                              {field.isNCERT && field.name === 'topic'
                                ? 'No data available'
                                : field.isCascadeSubtopic
                                  ? 'No data available'
                                  : 'No options available'}
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      ) : field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      value={formParams[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      value={formParams[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                  </div>
                );
              })}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated content — shared mobile-friendly result shell */}
          <AiToolResultShell
            className="w-full"
            toolType={toolType}
            toolName={config.name}
            toolDescription={config.description}
            meta={{
              board: selectedBoard || formParams.board || '',
              classLabel: String(formParams.gradeLevel || ''),
              subject: String(formParams.subject || formParams.subjects || ''),
              chapter: String(formParams.topic || ''),
              subtopic: String(formParams.subTopic || ''),
            }}
            inputSummary={
              generatedContent ? <AiToolV2InputSummary rawContent={viewerContextRaw} /> : null
            }
            footer={
              generatedContent ? (
                <p className="text-center text-xs text-slate-500">
                  ASLILEARN AI V2 · Use download to export or regenerate to refresh incomplete sections.
                </p>
              ) : null
            }
            isLoading={isGenerating}
            citations={
              generatedContent && Array.isArray(responseMeta?.citations) && responseMeta.citations.length > 0 ? (
                <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-2 max-h-28 overflow-y-auto">
                  <p className="text-[11px] font-semibold text-blue-700 mb-1">Top Citations</p>
                  <div className="space-y-1">
                    {responseMeta.citations.slice(0, 3).map((c: CitationItem) => (
                      <p key={String(c.index) + '-' + String(c.chapter)} className="text-[11px] text-gray-600">
                        [{c.index}] {c.subject} / {c.chapter} ({c.score})
                      </p>
                    ))}
                  </div>
                </div>
              ) : null
            }
            actions={
              generatedContent ? (
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={handleCopy} className="bg-white">
                    {copied ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </Button>
                  {showDownloadActions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" disabled={isDownloading} className="bg-white">
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
                          <FileDown className="w-4 h-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadWord} disabled={isDownloading}>
                          <FileText className="w-4 h-4 mr-2" />
                          Download Word
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadCSV} disabled={isDownloading}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Download CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              ) : null
            }
            empty={
              <div className={cn('text-center py-10', fallbackEmptyMessage ? 'text-red-700' : 'text-slate-500')}>
                <Icon
                  className={cn(
                    'w-14 h-14 mx-auto mb-3',
                    fallbackEmptyMessage ? 'text-red-300' : 'text-slate-300',
                  )}
                />
                <p className="text-sm font-medium">
                  {fallbackEmptyMessage || 'Fill in the form and click Generate to create content'}
                </p>
              </div>
            }
          >
            {generatedContent ? (
              <GeneratorRecordViewer record={viewerRecord} audience="teacher" />
            ) : null}
          </AiToolResultShell>
        </div>
      </div>
    </div>
  );
}

