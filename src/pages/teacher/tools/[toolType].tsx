import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Download, Copy, Check, FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { renderMarkdown } from '@/lib/render-teacher-markdown';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, ExternalHyperlink, InternalHyperlink } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FlashcardViewer } from '@/components/flashcard-viewer';
import { ShortNotesViewer } from '@/components/short-notes-viewer';
import { ConceptMasteryViewer } from '@/components/concept-mastery-viewer';
import { LessonPlannerViewer } from '@/components/lesson-planner-viewer';
import { ActivityProjectViewer } from '@/components/activity-project-viewer';
import { getTopicsForClassAndSubject } from '@/data/ncert-topics';
import { useCurriculumCascade, isGradeWithScienceCurriculumDropdowns } from '@/hooks/use-curriculum-cascade';

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

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 10'];

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'activity-project-generator': {
    name: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all projects if not selected)', isNCERT: true },
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
      { name: 'questionType', label: 'Question Type *', type: 'select', required: true, options: ['Single Option', 'Multiple Option', 'Integer Type', 'All Types'], placeholder: 'Select question type' },
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '10' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'] }
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
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all lessons if not selected)', isNCERT: true },
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
  'rubrics-evaluation-generator': {
    name: 'Rubrics, Evaluation & Report Card Generator',
    description: 'Create assessment criteria, rubrics, and comprehensive student progress reports with feedback',
    icon: Sparkles,
    fields: [
      { name: 'outputType', label: 'Output Type *', type: 'select', required: true, options: ['Rubrics & Evaluation', 'Report Card'], placeholder: 'Select what to generate' },
      { name: 'studentName', label: 'Student Name', type: 'select', required: false, placeholder: 'Select student (for Report Card)', isStudentSelect: true, dependsOn: 'outputType', showWhen: (values: any) => values.outputType === 'Report Card' },
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'assignmentType', label: 'Assignment Type', type: 'text', required: false, placeholder: 'e.g., Project, Essay, Lab Report (for Rubrics)', showWhen: (values: any) => values.outputType === 'Rubrics & Evaluation' },
      { name: 'term', label: 'Term', type: 'text', placeholder: 'e.g., First Term (for Report Card)', showWhen: (values: any) => values.outputType === 'Report Card' },
      { name: 'subTopic', label: 'Sub Topic *', type: 'text', required: true, placeholder: 'Enter sub topic' }
    ]
  },
  'story-passage-creator': {
    name: 'Story & Passage Creator',
    description: 'Generate engaging stories and reading passages (Available for English and Hindi only)',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all passages if not selected)', isNCERT: true },
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
      { name: 'subjects', label: 'Subjects *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'subTopic', label: 'Sub Topic *', type: 'text', required: true, placeholder: 'Enter sub topic' },
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
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'questionCount', label: 'Number of Questions *', type: 'number', required: true, placeholder: '20' },
      { name: 'duration', label: 'Exam Duration (minutes)', type: 'number', placeholder: '90' },
      { name: 'difficulty', label: 'Difficulty Mix', type: 'select', options: ['easy', 'medium', 'hard', 'mixed'] }
    ]
  },
};

type PassagesData = {
  subject?: string;
  book?: string;
  chapter?: string;
  title?: string;
  total_passages?: number;
  instructions?: string;
  passages: Array<{ passage_number: number; paragraph: string; questions: string[] }>;
};

// Extract JSON object from string (handles content with text before/after the JSON)
function extractPassagesJSON(content: string): PassagesData | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === '{') depth++;
    else if (trimmed[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    if (parsed && Array.isArray(parsed.passages) && parsed.passages.length > 0) return parsed as PassagesData;
    return null;
  } catch {
    return null;
  }
}

// Story & Passage Creator: simple cards UI when content is passages JSON
function StoryPassageViewer({ content }: { content: string }) {
  const data = extractPassagesJSON(content);

  if (!data) {
    return (
      <div
        className="prose prose-sm max-w-none max-h-[80vh] overflow-y-auto p-6"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    );
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto space-y-6 p-1">
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
        <h2 className="text-lg font-bold text-gray-900">{data.title || 'Reading Passages'}</h2>
        {(data.subject || data.book || data.chapter) && (
          <p className="text-sm text-gray-600 mt-1">
            {[data.subject, data.book, data.chapter].filter(Boolean).join(' · ')}
          </p>
        )}
        {data.instructions && (
          <p className="mt-3 text-sm text-gray-700 bg-white rounded-lg p-3 border border-amber-100">
            {data.instructions}
          </p>
        )}
      </div>

      {data.passages.map((p) => (
        <Card key={p.passage_number} className="border border-gray-200 shadow-sm">
          <CardHeader className="py-3 px-4 bg-gray-50/50">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                {p.passage_number}
              </span>
              Passage {p.passage_number}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-3 pb-4 space-y-3">
            <p className="text-gray-800 text-sm leading-relaxed">{p.paragraph}</p>
            {p.questions && p.questions.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1.5">Questions</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                  {p.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TeacherToolPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/teacher/tools/:toolType');
  const { toast } = useToast();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<any>(null);
  const [contentSource, setContentSource] = useState<string>('');
  const [responseMeta, setResponseMeta] = useState<any>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState<string>('');
  const [isFallbackContent, setIsFallbackContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<Array<{id: string, name: string, classNumber?: string}>>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [assignedSubjectNames, setAssignedSubjectNames] = useState<string[]>([]);

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
  );

  const availableSubjects = (() => {
    if (!formParams.gradeLevel || !isGradeWithScienceCurriculumDropdowns(formParams.gradeLevel)) {
      return [];
    }
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) {
      return [];
    }
    if (raw.length === 0) {
      return assignedSubjectNames.length > 0 ? assignedSubjectNames : [];
    }
    const restricted = restrictToAssignedSubjects(raw);
    if (restricted.length > 0) return restricted;
    if (raw.length > 0) return raw;
    if (assignedSubjectNames.length > 0) return assignedSubjectNames;
    return [];
  })();

  const classSelectOptions =
    cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;

  // Get tool type from route params
  const toolType = params?.toolType || '';
  const config = TOOL_CONFIGS[toolType];

  // No PDF auto-fill needed - users can enter any topic with Gemini API

  // Fetch teacher-assigned subjects once and keep them as default constraints for all tools
  useEffect(() => {
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
    fetchAssignedSubjects();
  }, []);

  // Keep subject aligned when class is chosen and list loads (only after a class is selected)
  useEffect(() => {
    if (!formParams.gradeLevel || availableSubjects.length === 0) return;
    setFormParams((prev) => {
      const currentSubject = prev.subject || prev.subjects;
      const hasCurrent =
        currentSubject &&
        availableSubjects.some(
          (s) => normalizeSubjectName(s) === normalizeSubjectName(String(currentSubject)),
        );
      if (hasCurrent) return prev;
      const defaultSubject = availableSubjects[0];
      return {
        ...prev,
        ...(prev.subject !== undefined ? { subject: defaultSubject } : {}),
        ...(prev.subjects !== undefined ? { subjects: defaultSubject } : {}),
        ...(prev.subject === undefined && prev.subjects === undefined ? { subject: defaultSubject } : {}),
      };
    });
  }, [availableSubjects, formParams.gradeLevel]);

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

  // Topics from curriculum API + optional hardcoded filtering; local NCERT fallback if empty
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

    let topics = [...cascade.topics];

    const classNumber =
      classValue === 'IIT-6' ? NaN : parseInt(classValue.replace('Class ', '').trim());

    if (
      topics.length === 0 &&
      !isNaN(classNumber) &&
      (classNumber === 6 || classNumber === 7) &&
      subjectValue &&
      /science/i.test(String(subjectValue)) &&
      !/social|computer/i.test(String(subjectValue))
    ) {
      topics = getTopicsForClassAndSubject(classNumber, subjectValue);
    }

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
            return availableSubjects;
          }
          return [];
        }
      }
    }
    
    // Special case: subject field without getOptions should use availableSubjects
    if (field.name === 'subject' && !field.options && !field.getOptions) {
      return availableSubjects;
    }
    
    return [];
  };

  const handleGenerate = async () => {
    // Validate required fields
    const requiredFields = config.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formParams[f.name]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    // Prevent stale previous output from looking like a successful new topic render
    setGeneratedContent('');
    setRawGeneratedContent(null);
    setContentSource('');
    setResponseMeta(null);
    setFallbackEmptyMessage('');
    setIsFallbackContent(false);
    try {
      const token = localStorage.getItem('authToken');
      const selectedClass = formParams.gradeLevel;
      const selectedSubject = formParams.subject || formParams.subjects;
      const selectedTopic = formParams.topic || '';
      const selectedSubTopic = formParams.subTopic || '';
      const selectedSection = formParams.section || formParams.className || '';

      const requestBody = {
        toolType,
        classNumber: selectedClass
          ? (selectedClass === 'IIT-6'
              ? 'IIT-6'
              : parseInt(String(selectedClass).replace('Class ', ''), 10))
          : undefined,
        subject: selectedSubject,
        topic: selectedTopic,
        subTopic: selectedSubTopic,
        section: selectedSection,
        questionCount: formParams.questionCount ? parseInt(formParams.questionCount) : undefined,
        duration: formParams.duration ? parseInt(formParams.duration) : undefined,
        ...formParams,
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
      let data: { success?: boolean; data?: { content?: string; rawData?: unknown; metadata?: { source?: string; sourceLabel?: string; aiUnavailable?: boolean; chunksUsed?: number; citations?: CitationItem[] } }; message?: string; code?: string } = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        if (response.status === 503 && data?.code === 'AI_UNAVAILABLE_NO_FALLBACK') {
          setGeneratedContent('');
          setRawGeneratedContent(null);
          setContentSource('');
          setResponseMeta(null);
          setIsFallbackContent(false);
          setFallbackEmptyMessage(
            data.message ||
              'AI service is unavailable and no previously generated content was found for this selection.',
          );
          toast({
            title: 'AI unavailable',
            description:
              data.message ||
              'No stored content matched. Ask your Super Admin to add content or fix the API quota.',
            variant: 'destructive',
          });
          return;
        }
        const errorMessage =
          data.message || responseText || `Server error: ${response.status}`;
        throw new Error(errorMessage || 'AI generation failed');
      }

      if (data.success && data?.data?.content && String(data.data.content).trim().length > 0) {
        const sourceLabel =
          data.data.metadata?.sourceLabel ||
          (data.data.metadata?.source === 'pdf-extracted' ? 'Textbook (PDF)' : 'Question Bank (CSV)');
        const fromAiFailure = !!data.data.metadata?.aiUnavailable;
        setContentSource(sourceLabel);
        setResponseMeta(data.data.metadata || null);
        setIsFallbackContent(fromAiFailure);
        const okTitle = fromAiFailure ? 'Stored content (AI unavailable)' : 'Success';
        const okDescription = fromAiFailure
          ? `Showing ${sourceLabel}.`
          : `Content generated successfully from ${sourceLabel}!`;

        // Store raw data if available (for Short Notes, Concept Mastery, Lesson Planner, Flashcards, etc.)
        if (data.data.rawData) {
          // Store raw data separately for viewer components
          setRawGeneratedContent(data.data.rawData);
          // For exam papers and other tools, use the formatted content directly
          // Only use JSON format for tools that need special viewers
          if (toolType === 'short-notes-summaries-maker' || 
              toolType === 'concept-mastery-helper' || 
              toolType === 'lesson-planner' ||
              toolType === 'flashcard-generator') {
            // Store in a way the viewer can access
            const contentWithData = JSON.stringify({
              formatted: data.data.content,
              raw: data.data.rawData
            });
            setGeneratedContent(contentWithData);
            toast({
              title: okTitle,
              description: okDescription
            });
          } else {
            // For exam papers and other tools, use content directly
            setGeneratedContent(data.data.content);
            toast({
              title: okTitle,
              description: okDescription
            });
          }
        } else {
          // Clear raw content if not available
          setRawGeneratedContent(null);
          setGeneratedContent(data.data.content);
          toast({
            title: okTitle,
            description: okDescription
          });
        }
      } else {
        throw new Error(data.message || 'AI returned empty response');
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      const errMsg = String(error?.message || '');
      console.log('Fallback trigger reason:', errMsg || 'Unknown API failure');
      // Do not treat DB fallback as a fix for request validation (wrong subject, missing topic, etc.)
      const isClientValidationError =
        /invalid subject|topic is required|sub topic is required|class number and subject are required|only available for english and hindi/i.test(
          errMsg,
        );
      if (isClientValidationError) {
        setFallbackEmptyMessage(errMsg);
        toast({
          title: 'Cannot generate',
          description: errMsg,
          variant: 'destructive',
        });
      } else {
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
        });
        const token = localStorage.getItem('authToken');
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
        if (fallbackJson?.success && String(fallbackContent).trim().length > 0) {
          console.log('Fallback query used:', {
            class: selectedClass,
            subject: selectedSubject,
            topic: formParams.topic || '',
            subTopic: formParams.subTopic || '',
            toolType,
          });
          console.log('Fallback record id returned:', fallbackJson?.data?._id || 'N/A');
          setGeneratedContent(String(fallbackContent));
          setRawGeneratedContent(null);
          setContentSource('Previously generated content');
          setResponseMeta({ source: 'cache', sourceLabel: 'Previously generated content', chunksUsed: 0 });
          setIsFallbackContent(true);
          toast({
            title: 'Fallback Loaded',
            description: 'Source: Previously generated content',
          });
        } else {
          setGeneratedContent('');
          setRawGeneratedContent(null);
          setContentSource('');
          setResponseMeta(null);
          setIsFallbackContent(false);
          const savedPart =
            fallbackJson?.message ||
            'No saved copy matched this class, subject, topic, sub-topic, and tool.';
          const combined = `${errMsg} ${savedPart}`;
          setFallbackEmptyMessage(combined);
          toast({
            title: 'Generation failed',
            description: combined,
            variant: 'destructive',
          });
        }
      } catch (fallbackError: any) {
        console.error('Fallback error:', fallbackError);
        setGeneratedContent('');
        setRawGeneratedContent(null);
        setContentSource('');
        setResponseMeta(null);
        setIsFallbackContent(false);
        const fe = String(fallbackError?.message || 'Fallback lookup failed');
        const combined = `${errMsg} ${fe}`;
        setFallbackEmptyMessage(combined);
        toast({
          title: 'Error',
          description: combined,
          variant: 'destructive',
        });
      }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
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
      const doc = await convertToWordDocument(generatedContent);
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
      
      // Find the content container - try multiple selectors
      let contentElement = document.querySelector('.prose') || 
                          document.querySelector('[class*="prose"]') ||
                          document.querySelector('.bg-white.border') ||
                          document.querySelector('[dangerouslySetInnerHTML]')?.parentElement;
      
      if (!contentElement) {
        // Fallback: create content from generatedContent
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '210mm';
        tempDiv.style.padding = '20mm';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.innerHTML = renderMarkdown(generatedContent);
        document.body.appendChild(tempDiv);
        contentElement = tempDiv;
      } else {
        // Create a temporary container for PDF generation
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '210mm'; // A4 width
        tempDiv.style.padding = '20mm';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.innerHTML = contentElement.innerHTML;
        document.body.appendChild(tempDiv);
        contentElement = tempDiv;
      }

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${config.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          windowWidth: contentElement.scrollWidth,
          windowHeight: contentElement.scrollHeight
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(contentElement as HTMLElement).save();
      
      // Clean up temporary element if we created it
      if (contentElement.parentElement === document.body) {
        document.body.removeChild(contentElement);
      }

      toast({
        title: 'Downloaded!',
        description: 'Content downloaded as PDF successfully'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = () => {
    try {
      setIsDownloading(true);
      
      // For exam papers, extract questions from rawGeneratedContent
      if (toolType === 'exam-question-paper-generator' && rawGeneratedContent) {
        const csvRows: string[] = [];
        
        // CSV Headers
        csvRows.push('Question Number,Type,Question,Option A,Option B,Option C,Option D,Correct Answer,Answer,Explanation,Marks');
        
        // Extract questions from sections
        if (rawGeneratedContent.questions) {
          const questionTypes = ['mcqs', 'fillInBlanks', 'vsaqs', 'saqs', 'laqs'];
          const typeLabels = {
            'mcqs': 'MCQ',
            'fillInBlanks': 'Fill in the Blanks',
            'vsaqs': 'Very Short Answer',
            'saqs': 'Short Answer',
            'laqs': 'Long Answer'
          };

          questionTypes.forEach(type => {
            if (rawGeneratedContent.questions[type] && Array.isArray(rawGeneratedContent.questions[type])) {
              rawGeneratedContent.questions[type].forEach((q: any) => {
                const row = [
                  q.question_number || '',
                  typeLabels[type as keyof typeof typeLabels] || type,
                  `"${(q.question || '').replace(/"/g, '""')}"`,
                  q.options?.A ? `"${q.options.A.replace(/"/g, '""')}"` : '',
                  q.options?.B ? `"${q.options.B.replace(/"/g, '""')}"` : '',
                  q.options?.C ? `"${q.options.C.replace(/"/g, '""')}"` : '',
                  q.options?.D ? `"${q.options.D.replace(/"/g, '""')}"` : '',
                  q.correct_answer ? `"${q.correct_answer.replace(/"/g, '""')}"` : '',
                  q.answer ? `"${q.answer.replace(/"/g, '""')}"` : '',
                  q.explanation ? `"${q.explanation.replace(/"/g, '""')}"` : '',
                  q.marks || ''
                ];
                csvRows.push(row.join(','));
              });
            }
          });
        } else if (rawGeneratedContent.sections && Array.isArray(rawGeneratedContent.sections)) {
          // Alternative format with sections
          rawGeneratedContent.sections.forEach((section: any) => {
            if (section.questions && Array.isArray(section.questions)) {
              section.questions.forEach((q: any) => {
                const row = [
                  q.question_number || '',
                  section.type || '',
                  `"${(q.question || '').replace(/"/g, '""')}"`,
                  q.options?.A ? `"${q.options.A.replace(/"/g, '""')}"` : '',
                  q.options?.B ? `"${q.options.B.replace(/"/g, '""')}"` : '',
                  q.options?.C ? `"${q.options.C.replace(/"/g, '""')}"` : '',
                  q.options?.D ? `"${q.options.D.replace(/"/g, '""')}"` : '',
                  q.correct_answer ? `"${q.correct_answer.replace(/"/g, '""')}"` : '',
                  q.answer ? `"${q.answer.replace(/"/g, '""')}"` : '',
                  q.explanation ? `"${q.explanation.replace(/"/g, '""')}"` : '',
                  q.marks || ''
                ];
                csvRows.push(row.join(','));
              });
            }
          });
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `${config.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
        saveAs(blob, fileName);

        toast({
          title: 'Downloaded!',
          description: 'Content downloaded as CSV successfully'
        });
      } else {
        // For other tools, create a simple CSV from the content
        const csvRows: string[] = [];
        csvRows.push('Content');
        csvRows.push(`"${generatedContent.replace(/"/g, '""').replace(/\n/g, ' ')}"`);
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `${config.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
        saveAs(blob, fileName);

        toast({
          title: 'Downloaded!',
          description: 'Content downloaded as CSV successfully'
        });
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate CSV',
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Early return check must be AFTER all hooks
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tool Not Found</h1>
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            onClick={() => {
              // Navigate to dashboard and set Vidya AI tab as active
              localStorage.setItem('teacherDashboardTab', 'vidya-ai');
              setLocation('/teacher/dashboard');
            }}
            className="hover:bg-white/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{config.name}</h1>
              <p className="text-gray-600">{config.description}</p>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${toolType === 'flashcard-generator' ? 'lg:grid-cols-3' : (toolType === 'short-notes-summaries-maker' || toolType === 'concept-mastery-helper' || toolType === 'lesson-planner') ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
          {/* Input Form */}
          <Card className={toolType === 'flashcard-generator' ? 'lg:col-span-1' : toolType === 'short-notes-summaries-maker' ? '' : ''}>
            <CardHeader>
              <CardTitle>Tool Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  fieldOptions = availableSubjects;
                  loadingDropdown = cascade.loadingSubjects;
                  isDisabled =
                    !formParams.gradeLevel ||
                    cascade.loadingSubjects;
                } else if (field.name === 'subject' && field.type === 'select' && !field.options) {
                  fieldOptions = availableSubjects;
                  loadingDropdown = cascade.loadingSubjects;
                  isDisabled =
                    !formParams.gradeLevel ||
                    cascade.loadingSubjects;
                } else {
                  fieldOptions = getFieldOptions(field);
                  isDisabled = !!(field.dependsOn && !formParams[field.dependsOn]);
                }

                return (
                  <div key={field.name}>
                    <Label htmlFor={field.name} className="flex items-center gap-2">
                      {field.label}
                      {loadingDropdown && <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden />}
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
                                        : availableSubjects.length === 0
                                          ? 'No data available'
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
                            <div className="px-2 py-1.5 text-sm text-gray-500">
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
                      rows={4}
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
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card className={toolType === 'flashcard-generator' ? 'lg:col-span-2' : toolType === 'short-notes-summaries-maker' ? '' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Content</CardTitle>
                  {generatedContent && contentSource && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <span>Source:</span>
                      <span
                        className={`font-medium ${
                          isFallbackContent
                            ? 'text-amber-600'
                            : contentSource.includes('PDF')
                              ? 'text-blue-600'
                              : 'text-purple-600'
                        }`}
                      >
                        {contentSource}
                      </span>
                    </p>
                  )}
                  {generatedContent && responseMeta && (
                    <p className="text-xs text-gray-500 mt-1">
                      Mode: <span className="font-medium">{responseMeta.source || 'unknown'}</span>
                      {typeof responseMeta.chunksUsed === 'number' ? ` | Chunks: ${responseMeta.chunksUsed}` : ''}
                    </p>
                  )}
                  {generatedContent && Array.isArray(responseMeta?.citations) && responseMeta.citations.length > 0 && (
                    <div className="mt-2 rounded-md border bg-blue-50/40 p-2 max-h-32 overflow-y-auto">
                      <p className="text-[11px] font-semibold text-blue-700 mb-1">Top Citations</p>
                      <div className="space-y-1">
                        {responseMeta.citations.slice(0, 3).map((c: CitationItem) => (
                          <p key={`${c.index}-${c.chapter}`} className="text-[11px] text-gray-600">
                            [{c.index}] {c.subject} / {c.chapter} ({c.score})
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {generatedContent && (
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    {/* Download removed from Tools pages */}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Generating Content...</h3>
                    <p className="text-sm text-gray-600">Please wait while we prepare your content</p>
                    <div className="flex items-center justify-center space-x-1 mt-4">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              ) : generatedContent ? (
                toolType === 'flashcard-generator' ? (
                  <FlashcardViewer content={generatedContent} />
                ) : toolType === 'short-notes-summaries-maker' ? (
                  <ShortNotesViewer content={generatedContent} />
                ) : toolType === 'concept-mastery-helper' ? (
                  <ConceptMasteryViewer content={generatedContent} />
                ) : toolType === 'lesson-planner' ? (
                  <LessonPlannerViewer content={generatedContent} rawContent={rawGeneratedContent} />
                ) : toolType === 'activity-project-generator' ? (
                  rawGeneratedContent?.activities?.length ? (
                    <ActivityProjectViewer activities={rawGeneratedContent.activities} />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-200 rounded-lg p-6 max-h-[80vh] overflow-y-auto shadow-sm"
                    >
                      <div
                        className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedContent) }}
                      />
                    </motion.div>
                  )
                ) : toolType === 'story-passage-creator' ? (
                  <StoryPassageViewer content={generatedContent} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-200 rounded-lg p-6 max-h-[80vh] overflow-y-auto shadow-sm"
                  >
                    <div 
                      className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-800 prose-img:rounded-lg prose-img:shadow-md prose-table:w-full prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-300 prose-td:p-2"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedContent) }}
                    />
                  </motion.div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>{fallbackEmptyMessage || 'Fill in the form and click Generate to create content'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

