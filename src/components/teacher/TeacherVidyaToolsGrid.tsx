import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Calendar,
  CheckSquare,
  CreditCard,
  FileQuestion,
  FileText,
  Layers,
  Lightbulb,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { filterVisibleTeacherTools } from '@/lib/teacher-ai-tools';

type TeacherVidyaToolsGridProps = {
  subjectNames: string[];
  onOpenTool: (route: string) => void;
};

const TOOL_UI: Record<
  string,
  { icon: LucideIcon; iconBg: string; iconColor: string; delay: number }
> = {
  'activity-project-generator': {
    icon: Sparkles,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    delay: 0.4,
  },
  'worksheet-mcq-generator': {
    icon: FileText,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    delay: 0.5,
  },
  'concept-mastery-helper': {
    icon: Lightbulb,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    delay: 0.6,
  },
  'lesson-planner': {
    icon: Calendar,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    delay: 0.7,
  },
  'exam-question-paper-generator': {
    icon: FileQuestion,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    delay: 0.8,
  },
  'daily-class-plan-maker': {
    icon: CheckSquare,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    delay: 0.9,
  },
  'homework-creator': {
    icon: Rocket,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    delay: 1.0,
  },
  'story-passage-creator': {
    icon: BookOpen,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    delay: 1.3,
  },
  'short-notes-summaries-maker': {
    icon: Layers,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    delay: 1.4,
  },
  'flashcard-generator': {
    icon: CreditCard,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    delay: 1.5,
  },
};

export function TeacherVidyaToolsGrid({ subjectNames, onOpenTool }: TeacherVidyaToolsGridProps) {
  const visibleTools = filterVisibleTeacherTools(subjectNames);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:p-4 lg:p-6">
      {visibleTools.map((tool) => {
        const ui = TOOL_UI[tool.id];
        if (!ui) return null;
        const Icon = ui.icon;
        return (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ui.delay }}
            className="bg-white rounded-xl p-3 sm:p-4 lg:p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200"
            onClick={() => onOpenTool(tool.route)}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`w-12 h-12 ${ui.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${ui.iconColor}`} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">{tool.title}</h4>
                <p className="text-xs sm:text-sm text-gray-600">{tool.description}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
