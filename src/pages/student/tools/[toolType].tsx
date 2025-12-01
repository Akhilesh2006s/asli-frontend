import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Sparkles, Download, Copy, Check, BookMarked, Brain, Calendar, HelpCircle, FileText, Key, ClipboardList, CheckCircle2, Layout, Target } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Import the renderMarkdown function from teacher tool page
const renderMarkdown = (text: string) => {
  if (!text) return '';
  
  let processedText = text;
  
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
    try {
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
  
  const lines = processedText.split('\n');
  let html = '';
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    const hasMathBlock = line.includes('__MATH_BLOCK__') || line.includes('__MATH_ERROR__');
    
    if (hasMathBlock) {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
      line = line.replace(/__MATH_BLOCK__(.*?)__MATH_BLOCK__/g, '<div class="my-4 overflow-x-auto">$1</div>');
      line = line.replace(/__MATH_ERROR__(.*?)__MATH_ERROR__/g, '<div class="my-4 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">Math Error: $1</div>');
      html += line;
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
  
  if (inList) {
    html += listType === 'ul' ? '</ul>' : '</ol>';
  }
  
  function formatInline(text: string): string {
    if (text.includes('__MATH_BLOCK__') || text.includes('__MATH_ERROR__')) {
      return text;
    }
    
    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    formatted = formatted.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (match, mathContent) => {
      try {
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
    
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-2 text-sm font-mono"><code>$1</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, (match, codeContent) => {
      if (match.includes('$')) return match;
      return `<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">${codeContent}</code>`;
    });
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
    
    return formatted;
  }
  
  return html;
};

const CLASS_SUBJECTS: Record<string, string[]> = {
  'Class 6': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 7': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 8': ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 9': ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Civics', 'Economics', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 10': ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Social Studies', 'History', 'Geography', 'Civics', 'Economics', 'Computer Science', 'Physical Education', 'Art', 'Music'],
  'Class 11': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Computer Science', 'Physical Education', 'Economics', 'Business Studies', 'Accountancy', 'History', 'Geography', 'Political Science', 'Psychology', 'Sociology', 'Philosophy', 'Fine Arts', 'Music'],
  'Class 12': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Computer Science', 'Physical Education', 'Economics', 'Business Studies', 'Accountancy', 'History', 'Geography', 'Political Science', 'Psychology', 'Sociology', 'Philosophy', 'Fine Arts', 'Music'],
  'Dropper Batch': ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English']
};

const CLASS_OPTIONS = ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Dropper Batch'];

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
  }>;
}

const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'smart-study-guide-generator': {
    name: 'Smart Study Guide Generator',
    description: 'Create personalized study guides tailored to your needs',
    icon: BookMarked,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'focusAreas', label: 'Focus Areas (Optional)', type: 'textarea', placeholder: 'e.g., formulas, concepts, practice problems' }
    ]
  },
  'concept-breakdown-explainer': {
    name: 'Concept Breakdown Explainer',
    description: 'Break down complex concepts into simple explanations',
    icon: Brain,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'concept', label: 'Concept *', type: 'text', required: true, placeholder: 'Enter concept name' }
    ]
  },
  'personalized-revision-planner': {
    name: 'Personalized Revision Planner',
    description: 'Get a customized revision schedule based on your goals',
    icon: Calendar,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subjects', label: 'Subjects *', type: 'text', required: true, placeholder: 'e.g., Mathematics, Physics, Chemistry' },
      { name: 'examDate', label: 'Exam Date (Optional)', type: 'text', placeholder: 'e.g., 2025-03-15' },
      { name: 'studyHoursPerDay', label: 'Study Hours Per Day', type: 'number', placeholder: '4' }
    ]
  },
  'smart-qa-practice-generator': {
    name: 'Smart Q&A Practice Generator',
    description: 'Generate practice questions with detailed answers',
    icon: HelpCircle,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
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
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'chapter', label: 'Chapter/Topic *', type: 'text', required: true, placeholder: 'Enter chapter or topic name' }
    ]
  },
  'key-points-formula-extractor': {
    name: 'Key Points & Formula Extractor',
    description: 'Extract key points and formulas from any topic',
    icon: Key,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' }
    ]
  },
  'quick-assignment-builder': {
    name: 'Quick Assignment Builder',
    description: 'Build structured assignments quickly and efficiently',
    icon: ClipboardList,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'topic', label: 'Topic *', type: 'text', required: true, placeholder: 'Enter topic name' },
      { name: 'assignmentType', label: 'Assignment Type', type: 'select', options: ['Homework', 'Project', 'Research', 'Practice'] }
    ]
  },
  'exam-readiness-checker': {
    name: 'Exam Readiness Checker',
    description: 'Assess your readiness for upcoming exams',
    icon: CheckCircle2,
    fields: [
      { name: 'gradeLevel', label: 'Class *', type: 'select', required: true, options: CLASS_OPTIONS },
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
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
      { name: 'subject', label: 'Subject *', type: 'select', required: true, dependsOn: 'gradeLevel', getOptions: (classValue) => CLASS_SUBJECTS[classValue] || [] },
      { name: 'projectTopic', label: 'Project Topic *', type: 'text', required: true, placeholder: 'Enter project topic' },
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
  }
};

export default function StudentToolPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/student/tools/:toolType');
  const { toast } = useToast();
  const [formParams, setFormParams] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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
      }
      
      return newParams;
    });
  };

  const getFieldOptions = (field: ToolConfig['fields'][0]): string[] => {
    if (field.options) {
      return field.options;
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
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/ai/tool`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolType,
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
        setGeneratedContent(data.data.content);
        toast({
          title: 'Success',
          description: 'Content generated successfully!'
        });
      } else {
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
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard'
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolType}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded!',
      description: 'Content downloaded successfully'
    });
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
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{config.name}</h1>
              <p className="text-gray-600">{config.description}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Tool Parameters */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Tool Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.fields.map((field) => {
                  const fieldOptions = getFieldOptions(field);
                  const isDisabled = field.dependsOn && !formParams[field.dependsOn];
                  
                  // Check if this is the gradeLevel field and should be disabled
                  const isClassField = field.name === 'gradeLevel';
                  const isClassFieldDisabled = isClassField && user?.classNumber;
                  
                  return (
                    <div key={field.name}>
                      <Label htmlFor={field.name}>{field.label}</Label>
                      {field.type === 'select' ? (
                        <Select
                          value={formParams[field.name] || ''}
                          onValueChange={(value) => handleInputChange(field.name, value)}
                          disabled={isDisabled || isClassFieldDisabled || isLoadingUser}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptions?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
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
          >
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {generatedContent && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <div
                    className="prose max-w-none bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(generatedContent) }}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Generated content will appear here</p>
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

