import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Download, Copy, Check, BookMarked, Brain, Calendar, HelpCircle, FileText, Key, ClipboardList, CheckCircle2, Layout, Target, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { API_BASE_URL } from '@/lib/api-config';
import {
  useCurriculumCascade,
  normalizeGradeForCurriculum,
  isGradeWithScienceCurriculumDropdowns,
} from '@/hooks/use-curriculum-cascade';
import { getTopicsForClassAndSubject } from '@/data/ncert-topics';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';
import { FlashcardViewer } from '@/components/flashcard-viewer';
import { ShortNotesViewer } from '@/components/short-notes-viewer';
import { ConceptMasteryViewer } from '@/components/concept-mastery-viewer';
import { LessonPlannerViewer } from '@/components/lesson-planner-viewer';
import { ActivityProjectViewer } from '@/components/activity-project-viewer';

// Import the renderMarkdown function from teacher tool page
const renderMarkdown = (text: string) => {
  if (!text) return '';
  
  // Handle JSON-wrapped content (for special viewers, but extract formatted content for display)
  let processedText = text;
  try {
    // Check if content is a JSON string with formatted property
    if (text.trim().startsWith('{') && text.includes('"formatted"')) {
      const parsed = JSON.parse(text);
      if (parsed.formatted) {
        processedText = parsed.formatted;
      }
    }
  } catch (e) {
    // Not JSON, use as-is
    processedText = text;
  }
  
  // If content starts with HTML tags (from formatters), return it directly without markdown processing
  const trimmed = processedText.trim();
  if (trimmed.startsWith('<div') || trimmed.startsWith('<h1') || trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<p') || trimmed.startsWith('<span')) {
    return processedText;
  }
  
  // Clean up escaped LaTeX (convert \\ to \ for proper rendering)
  // But be careful - only unescape within math expressions
  
  // First, process block math ($$...$$) across multiple lines
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
    try {
      // Unescape LaTeX (convert \\ to \)
      const cleanedMath = mathContent.trim().replace(/\\\\/g, '\\');
      const rendered = katex.renderToString(cleanedMath, {
        displayMode: true,
        throwOnError: false
      });
      return `__MATH_BLOCK__${rendered}__MATH_BLOCK__`;
    } catch (e) {
      return `__MATH_ERROR__${mathContent}__MATH_ERROR__`;
    }
  });
  
  // Process HTML card markers for Short Notes (before line processing)
  // Replace the markers and keep the HTML content as-is for direct rendering
  processedText = processedText.replace(/__NOTE_CARD_START__\n([\s\S]*?)\n__NOTE_CARD_END__/g, (match, cardContent) => {
    // Return HTML directly without escaping - it will be rendered as HTML
    return `__HTML_CARD__${cardContent.trim()}__HTML_CARD__`;
  });
  
  const lines = processedText.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Check if this line contains a math block
    const hasMathBlock = line.includes('__MATH_BLOCK__') || line.includes('__MATH_ERROR__');
    
    // Check if this line contains HTML card marker
    const hasHTMLCard = line.includes('__HTML_CARD__');
    
    // Restore math blocks first
    if (hasMathBlock) {
      closeList();
      line = line.replace(/__MATH_BLOCK__(.*?)__MATH_BLOCK__/g, '<div class="my-4 overflow-x-auto">$1</div>');
      line = line.replace(/__MATH_ERROR__(.*?)__MATH_ERROR__/g, '<div class="my-4 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">Math Error: $1</div>');
      html += line;
      continue;
    }
    
    // Process HTML cards - extract and render directly
    if (hasHTMLCard) {
      closeList();
      line = line.replace(/__HTML_CARD__(.*?)__HTML_CARD__/g, '$1');
      html += line + '\n';
      continue;
    }
    
    // Check if this line contains raw HTML (from note cards that span multiple lines or formatters)
    const hasHTML = line.includes('<div') || line.includes('</div>') || line.includes('<h1') || line.includes('</h1>') || line.includes('<h2') || line.includes('</h2>') || line.includes('<h3') || line.includes('</h3>') || line.includes('<ul') || line.includes('</ul>') || line.includes('<li') || line.includes('</li>') || line.includes('<p') || line.includes('</p>') || line.includes('<span') || line.includes('</span>') || line.includes('<strong') || line.includes('</strong>') || line.includes('style=');
    
    // If line contains HTML, add it directly without escaping (for note cards and formatters)
    if (hasHTML) {
      closeList();
      html += line + '\n';
      continue;
    }
    
    if (trimmed.startsWith('#### ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      html += `<h4 class="text-base font-bold text-gray-900 mt-4 mb-2">${formatInline(trimmed.substring(5))}</h4>`;
    } else if (trimmed.startsWith('### ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      html += `<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">${formatInline(trimmed.substring(4))}</h3>`;
    } else if (trimmed.startsWith('## ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      html += `<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 border-b border-gray-200 pb-2">${formatInline(trimmed.substring(3))}</h2>`;
    } else if (trimmed.startsWith('# ')) {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      html += `<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">${formatInline(trimmed.substring(2))}</h1>`;
    } else if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        if (inList) {
          html += listType === 'ul' ? '</ul>' : '</ol>';
        }
        html += '<ol class="list-decimal ml-6 mb-4 space-y-1">';
        inList = true;
        listType = 'ol';
      }
      const content = trimmed.replace(/^\d+\.\s+/, '');
      html += `<li class="mb-1">${formatInline(content)}</li>`;
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        if (inList) {
          html += listType === 'ul' ? '</ul>' : '</ol>';
        }
        html += '<ul class="list-disc ml-6 mb-4 space-y-1">';
        inList = true;
        listType = 'ul';
      }
      const content = trimmed.replace(/^[-*]\s+/, '');
      html += `<li class="mb-1">${formatInline(content)}</li>`;
    } else if (!trimmed) {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      if (html && !html.endsWith('</p>') && !html.endsWith('</h1>') && !html.endsWith('</h2>') && !html.endsWith('</h3>') && !html.endsWith('</h4>') && !html.endsWith('</div>')) {
        html += '<br>';
      }
    } else {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      html += `<p class="mb-4 text-gray-700 leading-relaxed">${formatInline(line)}</p>`;
    }
  }
  
  closeList();
  
  function closeList() {
  if (inList) {
    html += listType === 'ul' ? '</ul>' : '</ol>';
      inList = false;
      listType = null;
    }
  }
  
  function formatInline(text: string): string {
    // Don't process if it's already HTML (math blocks or note cards)
    if (text.includes('__MATH_BLOCK__') || text.includes('__MATH_ERROR__') || text.includes('__NOTE_CARD')) {
      return text;
    }
    
    // Escape HTML first
    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Inline math ($...$) - but not if it's part of block math ($$)
    formatted = formatted.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (match, mathContent) => {
      try {
        // Unescape LaTeX (convert \\ to \)
        const cleanedMath = mathContent.trim().replace(/\\\\/g, '\\');
        const rendered = katex.renderToString(cleanedMath, {
          displayMode: false,
          throwOnError: false
        });
        return rendered;
      } catch (e) {
        return `<span class="text-red-600 text-sm">Math Error: ${mathContent}</span>`;
      }
    });
    
    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-2 text-sm font-mono"><code>$1</code></pre>');
    
    // Inline code (but not if it's part of math)
    formatted = formatted.replace(/`([^`]+)`/g, (match, codeContent) => {
      // Check if this is inside a math expression
      if (match.includes('$')) return match;
      return `<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">${codeContent}</code>`;
    });
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    
    // Italic (but not if part of bold)
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
    
    return formatted;
  }
  
  return html;
};

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 10'];

interface ToolConfig {
  name: string;
  description: string;
  icon: any;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    dependsOn?: string;
    getOptions?: (value: string) => string[];
    isNCERT?: boolean; // If true, topic field should be populated from API
    isCascadeSubtopic?: boolean;
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

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'smart-study-guide-generator': {
    name: 'Smart Study Guide Generator',
    description: 'Create personalized study guides tailored to your needs',
    icon: BookMarked,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true }
    ]
  },
  'concept-breakdown-explainer': {
    name: 'Concept Breakdown Explainer',
    description: 'Break down complex concepts into simple explanations',
    icon: Brain,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'concept', label: 'Concept *', type: 'select', required: true, placeholder: 'Select concept', isNCERT: true }
    ]
  },
  'smart-qa-practice-generator': {
    name: 'Smart Q&A Practice Generator',
    description: 'Generate practice questions with detailed answers',
    icon: HelpCircle,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '10' },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'] }
    ]
  },
  'chapter-summary-creator': {
    name: 'Chapter Summary Creator',
    description: 'Create concise summaries of chapters and topics',
    icon: FileText,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'chapter', label: 'Chapter/Topic *', type: 'select', required: true, placeholder: 'Select chapter/topic', isNCERT: true }
    ]
  },
  'key-points-formula-extractor': {
    name: 'Key Points Extractor',
    description: 'Extract key points from any topic',
    icon: Key,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true }
    ]
  },
  'quick-assignment-builder': {
    name: 'Quick Assignment Builder',
    description: 'Build structured assignments quickly and efficiently',
    icon: ClipboardList,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true }
    ]
  },
  'exam-readiness-checker': {
    name: 'Exam Readiness Checker',
    description: 'Assess your readiness for upcoming exams',
    icon: CheckCircle2,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'examType', label: 'Exam Type', type: 'select', options: ['Unit Test', 'Mid-Term', 'Final Exam', 'Board Exam', 'Competitive Exam'] },
      { name: 'examDate', label: 'Exam Date (Optional)', type: 'text', placeholder: 'e.g., 2025-03-15' }
    ]
  },
  'project-layout-designer': {
    name: 'Project Layout Designer',
    description: 'Design structured layouts for your projects',
    icon: Layout,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'projectTopic', label: 'Project Topic *', type: 'select', required: true, placeholder: 'Select project topic', isNCERT: true },
      { name: 'projectType', label: 'Project Type', type: 'select', options: ['Research', 'Science Experiment', 'Model', 'Presentation', 'Report'] }
    ]
  },
  'goal-motivation-planner': {
    name: 'Goal & Motivation Planner',
    description: 'Set goals and create motivation plans for success',
    icon: Target,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'goalType', label: 'Goal Type', type: 'select', options: ['Academic', 'Exam Preparation', 'Skill Development', 'Overall Improvement'] },
      { name: 'timeframe', label: 'Timeframe', type: 'select', options: ['1 week', '1 month', '3 months', '6 months', '1 year'] },
      { name: 'description', label: 'Goal Description (Optional)', type: 'textarea', placeholder: 'Describe your specific goals...' }
    ]
  },
  // Teacher AI Tools - Now available for students
  'worksheet-mcq-generator': {
    name: 'Worksheet & MCQ Generator',
    description: 'Generate worksheets with MCQs, Fill in the Blanks, and Match the Following',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard'], placeholder: 'Select difficulty' }
    ]
  },
  'concept-mastery-helper': {
    name: 'Concept Mastery Helper',
    description: 'Break down complex concepts into digestible lessons',
    icon: Brain,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'flashcard-generator': {
    name: 'Flashcard Generator',
    description: 'Build study flashcards for quick revision',
    icon: BookMarked,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'short-notes-summaries-maker': {
    name: 'Short Notes & Summaries Maker',
    description: 'Condense complex topics into concise notes',
    icon: FileText,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'homework-creator': {
    name: 'Homework Creator',
    description: 'Generate meaningful homework assignments',
    icon: ClipboardList,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'duration', label: 'Expected Duration (minutes)', type: 'number', placeholder: '30' }
    ]
  },
  'exam-question-paper-generator': {
    name: 'Exam Question Paper Generator',
    description: 'Create comprehensive exam papers with varying difficulty',
    icon: CheckCircle2,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic *', type: 'select', required: true, placeholder: 'Select topic', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'questionCount', label: 'Number of Questions', type: 'number', placeholder: '20' },
      { name: 'duration', label: 'Exam Duration (minutes)', type: 'number', placeholder: '90' },
      { name: 'difficulty', label: 'Difficulty Mix', type: 'select', options: ['easy', 'medium', 'hard', 'mixed'] }
    ]
  },
  'activity-project-generator': {
    name: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum',
    icon: Layout,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all projects if not selected)', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  },
  'story-passage-creator': {
    name: 'Story & Passage Creator',
    description: 'Generate engaging stories and reading passages (Available for English and Hindi only)',
    icon: FileText,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all passages if not selected)', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true },
      { name: 'length', label: 'Length', type: 'select', options: ['short', 'medium', 'long'] }
    ]
  },
  'lesson-planner': {
    name: 'Lesson Planner',
    description: 'Plan structured lessons with objectives and activities',
    icon: Calendar,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel' },
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all lessons if not selected)', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic *', type: 'select', required: true, placeholder: 'Select subtopic', isCascadeSubtopic: true }
    ]
  }
};

export default function StudentToolPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/student/tools/:toolType');
  const { toast } = useToast();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<any>(null);
  const [contentSource, setContentSource] = useState<string>('');
  const [responseMeta, setResponseMeta] = useState<any>(null);
  const [fallbackEmptyMessage, setFallbackEmptyMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);

  const cascade = useCurriculumCascade(
    formParams.gradeLevel,
    formParams.subject,
    formParams.topic,
  );

  const classSelectOptions =
    cascade.classOptions.length > 0 ? cascade.classOptions : CLASS_OPTIONS;

  const availableSubjects = (() => {
    const gv = formParams.gradeLevel;
    if (!gv || !isGradeWithScienceCurriculumDropdowns(gv)) return [];
    const raw = cascade.subjects;
    if (cascade.loadingSubjects && raw.length === 0) return [];
    if (raw.length > 0) return raw;
    return [];
  })();

  const toolType = params?.toolType || '';
  const config = TOOL_CONFIGS[toolType];

  // Fetch user data to get assigned class
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoadingUser(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
          
          // Auto-populate class field with student's assigned class
          if (userData.user) {
            const studentClass = userData.user.assignedClass?.classNumber || userData.user.classNumber;
            if (studentClass) {
              // Convert class number to match CLASS_OPTIONS format
              // Handle formats like "8", "-8", "Class 8", "8A", "-11A", etc.
              let classValue = studentClass.toString().trim();
              
              // Remove "Class " prefix if present
              classValue = classValue.replace(/^Class\s*/i, '');
              
              // Extract just the number part (remove section letters like A, B, C)
              const classNum = classValue.replace(/[^-\d]/g, '');
              
              // Map to CLASS_OPTIONS format
              // CLASS_OPTIONS uses positive numbers only: "Class 6", "Class 7", ..., "Class 12"
              // So we convert negative numbers to their absolute value
              const absNum = Math.abs(parseInt(classNum));
              
              if (!isNaN(absNum) && absNum >= 6 && absNum <= 12) {
                const mappedClass = `Class ${absNum}`;
                if (CLASS_OPTIONS.includes(mappedClass)) {
                  setFormParams(prev => ({
                    ...prev,
                    gradeLevel: mappedClass
                  }));
                }
              } else if (classValue.toLowerCase().includes('dropper')) {
                // Handle "Dropper Batch"
                setFormParams(prev => ({
                  ...prev,
                  gradeLevel: 'Dropper Batch'
                }));
              } else if (classValue.toLowerCase().includes('iit') || classValue === 'IIT-6' || classValue === 'Class-6-IIT') {
                setFormParams((prev) => ({
                  ...prev,
                  gradeLevel: 'Class 6',
                }));
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const classValue = formParams.gradeLevel;
    const subjectValue = formParams.subject;
    if (!classValue || !subjectValue) {
      setAvailableNCERTTopics([]);
      return;
    }
    if (cascade.loadingTopics && cascade.topics.length === 0) {
      setAvailableNCERTTopics([]);
      return;
    }
    let topics = [...cascade.topics];
    const gl = normalizeGradeForCurriculum(classValue) || classValue;
    const isIit = gl === 'IIT-6';
    const classNumber = isIit ? NaN : parseInt(String(gl).replace('Class ', '').trim(), 10);
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
    setAvailableNCERTTopics(topics);
  }, [formParams.gradeLevel, formParams.subject, cascade.topics, cascade.loadingTopics]);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tool Not Found</h1>
          <Button onClick={() => setLocation('/ai-tutor')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const Icon = config.icon;

  const handleInputChange = (name: string, value: any) => {
    setFormParams(prev => {
      const newParams = { ...prev, [name]: value };
      
      // Clear dependent fields when parent field changes
      if (name === 'gradeLevel') {
        delete newParams.subject;
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'subject') {
        delete newParams.topic;
        delete newParams.subTopic;
        delete newParams.concept;
        delete newParams.chapter;
        delete newParams.projectTopic;
      }
      if (name === 'topic') {
        delete newParams.subTopic;
      }
      
      return newParams;
    });
  };

  const getFieldOptions = (field: ToolConfig['fields'][0]): string[] => {
    if (field.options) {
      return field.options;
    }
    
    // For subject field, use availableSubjects if fetched dynamically
    if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
      const classValue = formParams[field.dependsOn];
      if (classValue && availableSubjects.length > 0) {
        return availableSubjects;
      }
      return [];
    }
    
    if (field.isCascadeSubtopic && field.name === 'subTopic') {
      return cascade.subtopics;
    }

    // For topic/concept/chapter fields with isNCERT flag, use availableNCERTTopics
    if (field.isNCERT && (field.name === 'topic' || field.name === 'concept' || field.name === 'chapter' || field.name === 'projectTopic')) {
      return availableNCERTTopics;
    }
    
    if (field.dependsOn && field.getOptions) {
      const parentValue = formParams[field.dependsOn];
      if (parentValue) {
        return field.getOptions(parentValue);
      }
      return [];
    }
    
    return [];
  };

  const fieldUsesCurriculumSelect = (field: ToolConfig['fields'][0]) => field.type === 'select';

  const handleGenerate = async () => {
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
    try {
      const token = localStorage.getItem('authToken');

      const teacherTools = [
        'worksheet-mcq-generator',
        'concept-mastery-helper',
        'flashcard-generator',
        'short-notes-summaries-maker',
        'homework-creator',
        'exam-question-paper-generator',
        'activity-project-generator',
        'story-passage-creator',
        'lesson-planner',
      ];

      const isTeacherTool = teacherTools.includes(toolType);

      const applySuccessPayload = (data: {
        success?: boolean;
        message?: string;
        data?: {
          content?: string;
          rawData?: unknown;
          metadata?: { source?: string; sourceLabel?: string; aiUnavailable?: boolean; chunksUsed?: number; citations?: CitationItem[] };
        };
      }) => {
        if (!data.success || !data?.data?.content || String(data.data.content).trim().length === 0) {
          throw new Error(data.message || 'AI returned empty response');
        }
        const sourceLabel =
          data.data.metadata?.sourceLabel ||
          (data.data.metadata?.source === 'pdf-extracted' ? 'Textbook (PDF)' : 'Question Bank (CSV)');
        const fromAiFailure = !!data.data.metadata?.aiUnavailable;
        setContentSource(sourceLabel);
        setResponseMeta(data.data.metadata || null);
        const okTitle = fromAiFailure ? 'Stored content (AI unavailable)' : 'Success';
        const okDescription = fromAiFailure
          ? `Showing ${sourceLabel}.`
          : `Content generated successfully from ${sourceLabel}!`;

        if (data.data.rawData) {
          setRawGeneratedContent(data.data.rawData);
          if (
            toolType === 'short-notes-summaries-maker' ||
            toolType === 'concept-mastery-helper' ||
            toolType === 'lesson-planner' ||
            toolType === 'flashcard-generator'
          ) {
            const contentWithData = JSON.stringify({
              formatted: data.data.content,
              raw: data.data.rawData,
            });
            setGeneratedContent(contentWithData);
            toast({ title: okTitle, description: okDescription });
          } else {
            setGeneratedContent(data.data.content);
            toast({ title: okTitle, description: okDescription });
          }
        } else {
          setRawGeneratedContent(null);
          setGeneratedContent(data.data.content);
          toast({ title: okTitle, description: okDescription });
        }
      };

      if (isTeacherTool) {
        const selectedClass = formParams.gradeLevel;
        const selectedSubject = formParams.subject || formParams.subjects;
        const selectedTopic = formParams.topic || '';
        const selectedSubTopic = formParams.subTopic || '';
        const selectedSection = formParams.section || formParams.className || '';

        const requestBody = {
          toolType,
          classNumber: selectedClass
            ? selectedClass === 'IIT-6' || selectedClass === 'Class-6-IIT'
              ? 'IIT-6'
              : parseInt(String(selectedClass).replace('Class ', ''), 10)
            : undefined,
          subject: selectedSubject,
          topic: selectedTopic,
          subTopic: selectedSubTopic,
          section: selectedSection,
          questionCount: formParams.questionCount ? parseInt(String(formParams.questionCount), 10) : undefined,
          duration: formParams.duration ? parseInt(String(formParams.duration), 10) : undefined,
          ...formParams,
        };

        const response = await fetch(`${API_BASE_URL}/api/teacher/ai/generate-content`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        let data: {
          success?: boolean;
          data?: {
            content?: string;
            rawData?: unknown;
            metadata?: { source?: string; sourceLabel?: string; aiUnavailable?: boolean; citations?: CitationItem[] };
          };
          message?: string;
          code?: string;
        } = {};
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

        applySuccessPayload(data);
      } else {
        const mappedTopic =
          formParams.topic ||
          formParams.concept ||
          formParams.chapter ||
          formParams.projectTopic ||
          '';
        const requestBody: Record<string, unknown> = {
          toolType,
          ...formParams,
          gradeLevel: formParams.gradeLevel,
          subject: formParams.subject || formParams.subjects,
          topic: mappedTopic,
        };

        const response = await fetch(`${API_BASE_URL}/api/student/ai/tool`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        let data: {
          success?: boolean;
          data?: {
            content?: string;
            rawData?: unknown;
            metadata?: { source?: string; sourceLabel?: string; aiUnavailable?: boolean; citations?: CitationItem[] };
          };
          message?: string;
          code?: string;
        } = {};
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
          throw new Error(errorMessage || 'Content fetch failed');
        }

        applySuccessPayload(data);
      }
    } catch (error: unknown) {
      console.error('Generate error:', error);
      const errMsg = String((error as Error)?.message || '');
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
          const mappedTopic =
            formParams.topic ||
            formParams.concept ||
            formParams.chapter ||
            formParams.projectTopic ||
            '';
          const params = new URLSearchParams({
            class: String(selectedClass),
            subject: String(selectedSubject),
            topic: String(mappedTopic),
            subTopic: String(formParams.subTopic || ''),
            toolType: String(toolType || ''),
          });
          const token = localStorage.getItem('authToken');
          const fallbackRes = await fetch(
            `${API_BASE_URL}/api/teacher/ai/generated-content?${params.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );
          if (!fallbackRes.ok) throw new Error('Fallback lookup failed');
          const fallbackJson = await fallbackRes.json();
          const fallbackContent =
            fallbackJson?.data?.generatedContent ?? fallbackJson?.data?.content ?? '';
          if (fallbackJson?.success && String(fallbackContent).trim().length > 0) {
            setGeneratedContent(String(fallbackContent));
            setRawGeneratedContent(null);
            setContentSource('Previously generated content');
            setResponseMeta({ source: 'cache', sourceLabel: 'Previously generated content', chunksUsed: 0 });
            toast({
              title: 'Fallback loaded',
              description: 'Source: Previously generated content',
            });
          } else {
            setGeneratedContent('');
            setRawGeneratedContent(null);
            setContentSource('');
            setResponseMeta(null);
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
        } catch (fallbackError: unknown) {
          console.error('Fallback error:', fallbackError);
          setGeneratedContent('');
          setRawGeneratedContent(null);
          setContentSource('');
          setResponseMeta(null);
          const fe = String((fallbackError as Error)?.message || 'Fallback lookup failed');
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
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard'
    });
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
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => setLocation('/ai-tutor')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-3 mb-4 min-w-0">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{config.name}</h1>
              <p className="text-gray-600">{config.description}</p>
            </div>
          </div>
        </motion.div>

        <div className={`grid grid-cols-1 ${toolType === 'flashcard-generator' ? 'lg:grid-cols-3' : (toolType === 'short-notes-summaries-maker' || toolType === 'concept-mastery-helper' || toolType === 'lesson-planner') ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-6`}>
          {/* Left Panel: Tool Parameters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={toolType === 'flashcard-generator' ? 'lg:col-span-1' : ''}
          >
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Tool Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.fields.map((field) => {
                  let fieldOptions = getFieldOptions(field);
                  let isDisabled = !!(field.dependsOn && !formParams[field.dependsOn]);
                  let loadingDropdown = false;

                  if (field.name === 'gradeLevel') {
                    fieldOptions = classSelectOptions;
                    isDisabled = cascade.loadingClasses && classSelectOptions.length === 0;
                    loadingDropdown = cascade.loadingClasses;
                  } else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
                    fieldOptions = availableSubjects;
                    loadingDropdown = cascade.loadingSubjects;
                    isDisabled =
                      !formParams.gradeLevel ||
                      cascade.loadingSubjects ||
                      isLoadingUser;
                  } else if (field.isNCERT && (field.name === 'topic' || field.name === 'concept' || field.name === 'chapter' || field.name === 'projectTopic')) {
                    loadingDropdown = cascade.loadingTopics;
                    isDisabled =
                      !formParams.gradeLevel ||
                      !formParams.subject ||
                      cascade.loadingTopics;
                  } else if (field.isCascadeSubtopic && field.name === 'subTopic') {
                    fieldOptions = cascade.subtopics;
                    loadingDropdown = cascade.loadingSubtopics;
                    isDisabled =
                      !formParams.gradeLevel ||
                      !formParams.subject ||
                      !formParams.topic ||
                      cascade.loadingSubtopics;
                  }

                  const isClassField = field.name === 'gradeLevel';
                  const isClassFieldDisabled = isClassField && user?.classNumber;

                  let placeholderText = field.placeholder || `Select ${field.label}`;
                  if (isDisabled) {
                    if (field.name === 'gradeLevel' && cascade.loadingClasses) {
                      placeholderText = 'Loading classes...';
                    } else if (field.name === 'subject') {
                      placeholderText =
                        !formParams.gradeLevel || cascade.loadingSubjects
                          ? 'Select Class first'
                          : availableSubjects.length === 0
                            ? 'No data available'
                            : field.placeholder || placeholderText;
                    } else if (
                      field.isNCERT &&
                      (field.name === 'topic' ||
                        field.name === 'concept' ||
                        field.name === 'chapter' ||
                        field.name === 'projectTopic')
                    ) {
                      placeholderText = !formParams.gradeLevel
                        ? 'Select Class first'
                        : !formParams.subject || cascade.loadingTopics
                          ? 'Select Subject first'
                          : cascade.loadingTopics
                            ? 'Loading topics...'
                            : fieldOptions.length === 0
                              ? 'No data available'
                              : field.placeholder || 'Select topic';
                    } else if (field.isCascadeSubtopic) {
                      placeholderText = !formParams.topic
                        ? 'Select Topic first'
                        : cascade.loadingSubtopics
                          ? 'Loading subtopics...'
                          : cascade.subtopics.length === 0
                            ? 'No data available'
                            : field.placeholder || 'Select subtopic';
                    } else if (fieldOptions.length === 0 && field.dependsOn) {
                      placeholderText = `Select ${config.fields.find((f) => f.name === field.dependsOn)?.label || 'Class'} first`;
                    }
                  }

                  return (
                    <div key={field.name}>
                      <Label htmlFor={field.name} className="flex items-center gap-2">
                        {field.label}
                        {loadingDropdown && <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden />}
                      </Label>
                      {fieldUsesCurriculumSelect(field) ? (
                        <Select
                          value={formParams[field.name] || ''}
                          onValueChange={(value) => handleInputChange(field.name, value)}
                          disabled={isDisabled || isClassFieldDisabled}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={placeholderText} />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptions.length > 0 ? (
                              fieldOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option.charAt(0).toUpperCase() + option.slice(1)}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-gray-500">
                                {field.isNCERT &&
                                (field.name === 'topic' ||
                                  field.name === 'concept' ||
                                  field.name === 'chapter' ||
                                  field.name === 'projectTopic')
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
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
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
          </motion.div>

          {/* Right Panel: Generated Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className={toolType === 'flashcard-generator' ? 'lg:col-span-2' : (toolType === 'short-notes-summaries-maker' || toolType === 'concept-mastery-helper' || toolType === 'lesson-planner') ? 'col-span-1' : ''}
          >
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                  <CardTitle>Generated Content</CardTitle>
                    {generatedContent && contentSource && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span>Source:</span>
                        <span className={`font-medium ${contentSource.includes('PDF') ? 'text-blue-600' : 'text-purple-600'}`}>
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
                        variant="outline"
                        size="sm"
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
                    <ActivityProjectViewer activities={rawGeneratedContent?.activities || []} />
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
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{fallbackEmptyMessage || 'Generated content will appear here'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

