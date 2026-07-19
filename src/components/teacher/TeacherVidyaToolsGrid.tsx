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
import { formatAiToolText } from '@/lib/title-case';
import { vidyaPastelTone } from '@/lib/vidya-pastel-tones';
import { cn } from '@/lib/utils';

type TeacherVidyaToolsGridProps = {
  subjectNames: string[];
  onOpenTool: (route: string) => void;
};

const TOOL_UI: Record<string, { icon: LucideIcon; delay: number }> = {
  'activity-project-generator': { icon: Sparkles, delay: 0.4 },
  'worksheet-mcq-generator': { icon: FileText, delay: 0.5 },
  'concept-mastery-helper': { icon: Lightbulb, delay: 0.6 },
  'lesson-planner': { icon: Calendar, delay: 0.7 },
  'exam-question-paper-generator': { icon: FileQuestion, delay: 0.8 },
  'daily-class-plan-maker': { icon: CheckSquare, delay: 0.9 },
  'homework-creator': { icon: Rocket, delay: 1.0 },
  'story-passage-creator': { icon: BookOpen, delay: 1.3 },
  'short-notes-summaries-maker': { icon: Layers, delay: 1.4 },
  'flashcard-generator': { icon: CreditCard, delay: 1.5 },
};

export function TeacherVidyaToolsGrid({ subjectNames, onOpenTool }: TeacherVidyaToolsGridProps) {
  const visibleTools = filterVisibleTeacherTools(subjectNames);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 sm:p-4 lg:p-6">
      {visibleTools.map((tool, index) => {
        const ui = TOOL_UI[tool.id];
        if (!ui) return null;
        const Icon = ui.icon;
        const tone = vidyaPastelTone(index);
        return (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ui.delay }}
            className={cn(
              'cursor-pointer rounded-2xl border p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-elevated sm:p-4 lg:p-6',
              tone.card
            )}
            onClick={() => onOpenTool(tool.route)}
          >
            <div className="flex items-start space-x-4">
              <div
                className={cn(
                  'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
                  tone.iconBg
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6',
                    tone.iconColor
                  )}
                />
              </div>
              <div>
                <h4 className="mb-1 font-bold text-gray-900">{formatAiToolText(tool.title)}</h4>
                <p className="text-xs text-gray-600 sm:text-sm">{formatAiToolText(tool.description)}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
