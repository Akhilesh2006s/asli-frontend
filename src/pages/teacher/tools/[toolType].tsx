import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Download, Copy, Check, FileText, FileSpreadsheet, FileDown } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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
import { getTopicsForClassAndSubject } from '@/data/ncert-topics';

// Enhanced markdown renderer with math support
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
    
    // Check if this line contains raw HTML (from note cards that span multiple lines)
    const hasHTML = line.includes('<div') || line.includes('</div>') || line.includes('<h2') || line.includes('<h3') || line.includes('<ul') || line.includes('<li') || line.includes('<p') || line.includes('<span');
    
    // If line contains HTML, add it directly without escaping (for note cards)
    if (hasHTML) {
      closeList();
      html += line + '\n';
      continue;
    }
    
    // Headers
    if (trimmed.startsWith('#### ')) {
      closeList();
      html += `<h4 class="text-base font-bold text-gray-900 mt-4 mb-2">${formatInline(trimmed.substring(5))}</h4>`;
    } else if (trimmed.startsWith('### ')) {
      closeList();
      html += `<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3">${formatInline(trimmed.substring(4))}</h3>`;
    } else if (trimmed.startsWith('## ')) {
      closeList();
      html += `<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 border-b border-gray-200 pb-2">${formatInline(trimmed.substring(3))}</h2>`;
    } else if (trimmed.startsWith('# ')) {
      closeList();
      html += `<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">${formatInline(trimmed.substring(2))}</h1>`;
    }
    // Numbered lists
    else if (/^\d+\.\s+/.test(trimmed)) {
      if (!inList || listType !== 'ol') {
        closeList();
        html += '<ol class="list-decimal ml-6 mb-4 space-y-1">';
        inList = true;
        listType = 'ol';
      }
      const content = trimmed.replace(/^\d+\.\s+/, '');
      html += `<li class="mb-1">${formatInline(content)}</li>`;
    }
    // Bullet points
    else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList || listType !== 'ul') {
        closeList();
        html += '<ul class="list-disc ml-6 mb-4 space-y-1">';
        inList = true;
        listType = 'ul';
      }
      const content = trimmed.replace(/^[-*]\s+/, '');
      html += `<li class="mb-1">${formatInline(content)}</li>`;
    }
    // Empty line
    else if (!trimmed) {
      closeList();
      if (html && !html.endsWith('</p>') && !html.endsWith('</h1>') && !html.endsWith('</h2>') && !html.endsWith('</h3>') && !html.endsWith('</h4>') && !html.endsWith('</div>')) {
        html += '<br>';
      }
    }
    // Regular paragraph
    else {
      closeList();
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
    getOptions?: (value: string) => string[]; // Function to get options based on dependency
    isStudentSelect?: boolean; // If true, populate from assigned students
  }>;
}

// Class-wise subjects mapping
const CLASS_SUBJECTS: Record<string, string[]> = {
  'Class 6': [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 7': [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 8': [
    'Mathematics',
    'Science',
    'English',
    'Hindi',
    'Social Studies',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 9': [
    'Mathematics',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Social Studies',
    'History',
    'Geography',
    'Civics',
    'Economics',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 10': [
    'Mathematics',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Social Studies',
    'History',
    'Geography',
    'Civics',
    'Economics',
    'Computer Science',
    'Physical Education',
    'Art',
    'Music'
  ],
  'Class 11': [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Computer Science',
    'Physical Education',
    'Economics',
    'Business Studies',
    'Accountancy',
    'History',
    'Geography',
    'Political Science',
    'Psychology',
    'Sociology',
    'Philosophy',
    'Fine Arts',
    'Music'
  ],
  'Class 12': [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'Hindi',
    'Computer Science',
    'Physical Education',
    'Economics',
    'Business Studies',
    'Accountancy',
    'History',
    'Geography',
    'Political Science',
    'Psychology',
    'Sociology',
    'Philosophy',
    'Fine Arts',
    'Music'
  ],
  'Dropper Batch': [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English'
  ],
  'IIT-6': [
    'Physics',
    'Chemistry',
    'Maths',
    'Biology'
  ]
};

const CLASS_OPTIONS = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-6'];

// Subject options - will be fetched from API for Class 6, fallback for other classes
const DEFAULT_SUBJECT_OPTIONS = ['mathematics', 'maths', 'english', 'science', 'social science', 'social', 'evs', 'sst'];

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'activity-project-generator': {
    name: 'Activity & Project Generator',
    description: 'Create engaging activities and projects tailored to your curriculum',
    icon: Sparkles,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true },
      { name: 'topic', label: 'Topic (Optional)', type: 'select', required: false, placeholder: 'Select topic to filter (optional - shows all projects if not selected)', isNCERT: true },
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' }
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
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
      { name: 'subTopic', label: 'Sub Topic', type: 'text', required: false, placeholder: 'Enter sub topic (optional)' },
      { name: 'questionCount', label: 'Number of Questions *', type: 'number', required: true, placeholder: '20' },
      { name: 'duration', label: 'Exam Duration (minutes)', type: 'number', placeholder: '90' },
      { name: 'difficulty', label: 'Difficulty Mix', type: 'select', options: ['easy', 'medium', 'hard', 'mixed'] }
    ]
  },
};

export default function TeacherToolPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/teacher/tools/:toolType');
  const { toast } = useToast();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [rawGeneratedContent, setRawGeneratedContent] = useState<any>(null);
  const [contentSource, setContentSource] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState<Array<{id: string, name: string, classNumber?: string}>>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [availableNCERTTopics, setAvailableNCERTTopics] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(DEFAULT_SUBJECT_OPTIONS);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Get tool type from route params
  const toolType = params?.toolType || '';
  const config = TOOL_CONFIGS[toolType];

  // No PDF auto-fill needed - users can enter any topic with Gemini API

  // Fetch subjects from API when a class is selected (classes 5-10)
  useEffect(() => {
    const fetchSubjects = async () => {
      const classValue = formParams.gradeLevel;
      
      if (!classValue) {
        setAvailableSubjects(DEFAULT_SUBJECT_OPTIONS);
        return;
      }

      // Handle IIT-6 specially
      if (classValue === 'IIT-6') {
        setIsLoadingSubjects(true);
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/teacher/ai/subjects?classNumber=IIT-6`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
              // Extract subject names and convert to lowercase for consistency
              const subjects = data.data.map((subj: any) => 
                (subj.name || subj.displayName || subj).toLowerCase()
              );
              setAvailableSubjects(subjects);
              console.log(`✅ Fetched subjects for IIT-6:`, subjects);
            }
          }
        } catch (error) {
          console.error('Failed to fetch subjects:', error);
          // Fallback to class-specific subjects
          const classSubjects = CLASS_SUBJECTS[classValue];
          if (classSubjects && classSubjects.length > 0) {
            setAvailableSubjects(classSubjects.map(s => s.toLowerCase()));
          } else {
            setAvailableSubjects(DEFAULT_SUBJECT_OPTIONS);
          }
        } finally {
          setIsLoadingSubjects(false);
        }
        return;
      }

      // Extract class number (e.g., "Class 6" -> 6)
      const classNumber = parseInt(classValue.replace('Class ', '').trim());
      
      // Fetch for classes 5-10 (hardcoded content available)
      if (!isNaN(classNumber) && classNumber >= 5 && classNumber <= 10) {
        setIsLoadingSubjects(true);
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/teacher/ai/subjects?classNumber=${classNumber}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
              // Extract subject names and convert to lowercase for consistency
              const subjects = data.data.map((subj: any) => 
                (subj.name || subj.displayName || subj).toLowerCase()
              );
              setAvailableSubjects(subjects);
              console.log(`✅ Fetched subjects for Class ${classNumber}:`, subjects);
            }
          }
        } catch (error) {
          console.error('Failed to fetch subjects:', error);
          // Fallback to class-specific subjects or default
          const classSubjects = CLASS_SUBJECTS[classValue];
          if (classSubjects && classSubjects.length > 0) {
            setAvailableSubjects(classSubjects.map(s => s.toLowerCase()));
          } else {
            setAvailableSubjects(DEFAULT_SUBJECT_OPTIONS);
          }
        } finally {
          setIsLoadingSubjects(false);
        }
      } else if (classValue) {
        // For other classes, use class-specific subjects or default
        const classSubjects = CLASS_SUBJECTS[classValue];
        if (classSubjects && classSubjects.length > 0) {
          setAvailableSubjects(classSubjects.map(s => s.toLowerCase()));
        } else {
          setAvailableSubjects(DEFAULT_SUBJECT_OPTIONS);
        }
      } else {
        // No class selected, use default
        setAvailableSubjects(DEFAULT_SUBJECT_OPTIONS);
      }
    };

    fetchSubjects();
  }, [formParams.gradeLevel]);

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

  // Fetch topics when class and subject are selected
  useEffect(() => {
    const classValue = formParams.gradeLevel;
    const subjectValue = formParams.subject;

    if (!classValue || !subjectValue) {
      setAvailableNCERTTopics([]);
      return;
    }

    // Handle IIT-6 specially
    if (classValue === 'IIT-6') {
      const fetchTopics = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/teacher/ai/topics?classNumber=IIT-6&subject=${encodeURIComponent(subjectValue)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
              // Extract chapter names from the response
              const topics = data.data.map((chapter: any) => 
                chapter.chapterName || chapter.name || chapter
              );
              setAvailableNCERTTopics(topics);
              console.log(`✅ Fetched topics for IIT-6:`, topics);
            }
          }
        } catch (error) {
          console.error('Failed to fetch topics:', error);
          setAvailableNCERTTopics([]);
        }
      };

      fetchTopics();
      return;
    }

    // Extract class number (e.g., "Class 9" -> 9)
    const classNumber = parseInt(classValue.replace('Class ', '').trim());
    
    if (isNaN(classNumber) || classNumber < 1 || classNumber > 10) {
      setAvailableNCERTTopics([]);
      return;
    }

    // For classes 5-10, fetch topics from API (hardcoded content)
    if (classNumber >= 5 && classNumber <= 10) {
      const fetchTopics = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/teacher/ai/topics?classNumber=${classNumber}&subject=${encodeURIComponent(subjectValue)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && Array.isArray(data.data)) {
              // Extract chapter names from the response
              const topics = data.data.map((chapter: any) => 
                chapter.chapterName || chapter.name || chapter
              );
              setAvailableNCERTTopics(topics);
              console.log(`✅ Fetched topics for Class ${classNumber}:`, topics);
            }
          }
        } catch (error) {
          console.error('Failed to fetch topics:', error);
          // Fallback to hardcoded NCERT topics
    const topics = getTopicsForClassAndSubject(classNumber, subjectValue);
    setAvailableNCERTTopics(topics);
        }
      };

      fetchTopics();
    } else {
      // For other classes, use hardcoded NCERT topics
      const topics = getTopicsForClassAndSubject(classNumber, subjectValue);
      setAvailableNCERTTopics(topics);
    }
  }, [formParams.gradeLevel, formParams.subject]);

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
      
      // If gradeLevel changes, clear dependent fields (like subject, topic)
      if (fieldName === 'gradeLevel') {
        // Clear subject and other dependent fields
        Object.keys(updated).forEach(key => {
          const field = config?.fields.find(f => f.name === key);
          if (field?.dependsOn === 'gradeLevel' || key === 'topic') {
            delete updated[key];
          }
        });
      }
      
      // If subject changes, clear topic
      if (fieldName === 'subject') {
        delete updated.topic;
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
          return field.getOptions();
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
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/ai/tool`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolType,
          // Handle IIT-6 as string, otherwise parse as number
          classNumber: formParams.gradeLevel 
            ? (formParams.gradeLevel === 'IIT-6' 
                ? 'IIT-6' 
                : parseInt(formParams.gradeLevel.replace('Class ', '')))
            : undefined,
          // Handle both 'subject' and 'subjects' field names
          subject: formParams.subject || formParams.subjects,
          topic: formParams.topic,
          questionCount: formParams.questionCount ? parseInt(formParams.questionCount) : undefined,
          duration: formParams.duration ? parseInt(formParams.duration) : undefined,
          ...formParams
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.success) {
        const sourceLabel = data.data.metadata?.sourceLabel || (data.data.metadata?.source === 'pdf-extracted' ? 'Textbook (PDF)' : 'Question Bank (CSV)');
        setContentSource(sourceLabel);
        
        // Keep isGenerating true during 3-second delay to show loading animation
        // Store raw data if available (for Short Notes, Concept Mastery, and Lesson Planner)
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
            setTimeout(() => {
              setGeneratedContent(contentWithData);
              setIsGenerating(false);
              toast({
                title: 'Success',
                description: `Content generated successfully from ${sourceLabel}!`
              });
            }, 3000);
          } else {
            // For exam papers and other tools, use content directly
            setTimeout(() => {
              setGeneratedContent(data.data.content);
              setIsGenerating(false);
              toast({
                title: 'Success',
                description: `Content generated successfully from ${sourceLabel}!`
              });
            }, 3000);
          }
        } else {
          // Clear raw content if not available
          setRawGeneratedContent(null);
          // Add 3-second delay before showing content with loading state
          setTimeout(() => {
            setGeneratedContent(data.data.content);
            setIsGenerating(false);
            toast({
              title: 'Success',
              description: `Content generated successfully from ${sourceLabel}!`
            });
          }, 3000);
        }
        // Note: isGenerating stays true until setTimeout completes
      } else {
        setIsGenerating(false);
        throw new Error(data.message || 'Failed to generate content');
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate content',
        variant: 'destructive'
      });
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
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
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
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
              {config.fields.map((field) => {
                // Check if field should be shown based on showWhen condition
                if (field.showWhen && !field.showWhen(formParams)) {
                  return null;
                }
                let fieldOptions: string[] = [];
                let isDisabled = false;
                
                if (field.isStudentSelect) {
                  // Use assigned students for student selection
                  fieldOptions = assignedStudents.map(s => s.name);
                  isDisabled = isLoadingStudents || assignedStudents.length === 0;
                } else if (field.isNCERT && field.name === 'topic') {
                  // Use NCERT topics based on selected class and subject
                  fieldOptions = availableNCERTTopics;
                  isDisabled = !formParams.gradeLevel || !formParams.subject || availableNCERTTopics.length === 0;
                } else if (field.name === 'subjects' && field.dependsOn === 'gradeLevel') {
                  // For daily-class-plan-maker, use available subjects based on class
                  fieldOptions = availableSubjects;
                  isDisabled = !formParams.gradeLevel || availableSubjects.length === 0;
                } else if (field.name === 'subject' && field.dependsOn === 'gradeLevel') {
                  // For subject field that depends on gradeLevel, use available subjects
                  fieldOptions = availableSubjects;
                  isDisabled = !formParams.gradeLevel || availableSubjects.length === 0;
                } else {
                  fieldOptions = getFieldOptions(field);
                  isDisabled = field.dependsOn && !formParams[field.dependsOn];
                }
                
                return (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {(field.type === 'select' || field.isNCERT) ? (
                      <Select
                        value={formParams[field.name] || ''}
                        onValueChange={(value) => handleInputChange(field.name, value)}
                        disabled={isDisabled}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isDisabled 
                              ? field.isStudentSelect
                                ? isLoadingStudents 
                                  ? 'Loading students...'
                                  : 'No students assigned'
                                : field.isNCERT && field.name === 'topic'
                                  ? !formParams.gradeLevel || !formParams.subject
                                    ? 'Select Class and Subject first'
                                    : 'No topics available for this class/subject'
                                  : `Select ${config.fields.find(f => f.name === field.dependsOn)?.label || 'Class'} first`
                              : field.placeholder || `Select ${field.label}`
                          } />
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
                                ? 'No topics available. Please select Class and Subject first.'
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
                      <span className={`font-medium ${contentSource.includes('PDF') ? 'text-blue-600' : 'text-purple-600'}`}>
                        {contentSource}
                      </span>
                    </p>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isDownloading || !generatedContent}
                        >
                          {isDownloading ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloading}>
                          <FileText className="w-4 h-4 mr-2" />
                          Download as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadCSV} disabled={isDownloading}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Download as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadWord} disabled={isDownloading}>
                          <FileDown className="w-4 h-4 mr-2" />
                          Download as Word
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <p>Fill in the form and click Generate to create content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

