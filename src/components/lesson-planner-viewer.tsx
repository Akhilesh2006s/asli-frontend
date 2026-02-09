import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Clock, Target, GraduationCap, Lightbulb, FileText, CheckCircle, Award } from 'lucide-react';

interface Lesson {
  lesson_name: string;
  subject_area?: string;
  duration?: { periods: number; minutes_per_period: number };
  learning_objectives?: string[];
  teaching_learning_materials?: string[];
  previous_knowledge?: string[];
  introduction?: { time_minutes: number; activities: string[] };
  presentation?: { time_minutes: number; methods: string[]; key_vocabulary?: string[] };
  explanation_discussion?: { time_minutes: number; discussion_points: string[] };
  activities?: { time_minutes: number; class_activities: string[] };
  values_and_moral?: string[];
  homework?: string[];
  evaluation?: string[];
}

interface LessonPlannerViewerProps {
  content: string;
  rawContent?: any;
}

export function LessonPlannerViewer({ content, rawContent }: LessonPlannerViewerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number | null>(null);
  const [bookName, setBookName] = useState<string>('');
  const [className, setClassName] = useState<string>('');

  useEffect(() => {
    // Try to parse from raw JSON data first (more reliable)
    let parsedLessons: Lesson[] = [];
    let book = '';
    let classNum = '';
    
    try {
      const contentData = JSON.parse(content);
      if (contentData.raw && contentData.raw.lessons) {
        // Use raw JSON data if available
        parsedLessons = contentData.raw.lessons;
        book = contentData.raw.book || '';
        classNum = contentData.raw.class || '';
      } else if (contentData.formatted) {
        // Parse from formatted content
        const parsed = parseLessons(contentData.formatted);
        parsedLessons = parsed.lessons;
        book = parsed.book;
        classNum = parsed.class;
      }
    } catch (e) {
      // Not JSON, try parsing from rawContent prop
      if (rawContent) {
        if (rawContent.lessons) {
          parsedLessons = rawContent.lessons;
          book = rawContent.book || '';
          classNum = rawContent.class || '';
        } else if (rawContent.lesson_plans) {
          // Social Science format
          parsedLessons = rawContent.lesson_plans;
          book = rawContent.book || '';
          classNum = rawContent.class || '';
        }
      } else {
        // Fallback: parse from markdown/HTML content
        const parsed = parseLessons(content);
        parsedLessons = parsed.lessons;
        book = parsed.book;
        classNum = parsed.class;
      }
    }
    
    setLessons(parsedLessons);
    setBookName(book);
    setClassName(classNum);
    if (parsedLessons.length > 0) {
      setSelectedLessonIndex(0);
    }
  }, [content, rawContent]);

  const selectedLesson = selectedLessonIndex !== null ? lessons[selectedLessonIndex] : null;

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No lesson plans found in the generated content.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold mb-2" style={{
          background: 'linear-gradient(90deg, #00f5ff, #ff00ff, #00ff00)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(0, 245, 255, 0.5)',
          filter: 'drop-shadow(0 0 10px rgba(0, 245, 255, 0.8))'
        }}>
          📚 Lesson Planner
        </h1>
        {bookName && (
          <p className="text-xl text-white/80">
            {className && `Class ${className} • `}{bookName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Left Side: Lesson List */}
        <div className="space-y-4">
          <div className="text-white mb-4">
            <h2 className="text-2xl font-semibold mb-2" style={{
              textShadow: '0 0 20px rgba(0, 245, 255, 0.6)'
            }}>
              Lessons ({lessons.length})
            </h2>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            {lessons.map((lesson, index) => (
              <motion.div
                key={index}
                onClick={() => setSelectedLessonIndex(index)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedLessonIndex === index
                    ? 'ring-4 ring-cyan-400 shadow-2xl'
                    : 'hover:ring-2 hover:ring-cyan-400/50'
                }`}
                style={{
                  background: selectedLessonIndex === index
                    ? 'linear-gradient(135deg, rgba(0, 245, 255, 0.2), rgba(255, 0, 255, 0.2))'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                  backdropFilter: 'blur(10px)',
                  border: selectedLessonIndex === index
                    ? '2px solid rgba(0, 245, 255, 0.6)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: selectedLessonIndex === index
                    ? '0 0 30px rgba(0, 245, 255, 0.4), inset 0 0 20px rgba(255, 0, 255, 0.2)'
                    : '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-5 h-5 text-cyan-400" style={{ filter: 'drop-shadow(0 0 5px rgba(0, 245, 255, 0.8))' }} />
                      <h3 className="text-lg font-semibold text-white">
                        {index + 1}. {lesson.lesson_name}
                      </h3>
                    </div>
                    {lesson.subject_area && (
                      <span className="inline-block px-2 py-1 text-xs rounded-full text-white/70 bg-white/10 mb-2">
                        {lesson.subject_area}
                      </span>
                    )}
                    {lesson.duration && (
                      <div className="flex items-center gap-1 text-sm text-white/70">
                        <Clock className="w-4 h-4" />
                        <span>
                          {lesson.duration.periods} periods × {lesson.duration.minutes_per_period} min
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Lesson Details */}
        <div className="space-y-4">
          {selectedLesson ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedLessonIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-6 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(0, 245, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 40px rgba(0, 245, 255, 0.1)',
                  maxHeight: 'calc(100vh - 200px)',
                  overflowY: 'auto'
                }}
              >
                {/* Lesson Header */}
                <div className="mb-6 pb-4 border-b border-white/20">
                  <h2 className="text-3xl font-bold text-white mb-2" style={{
                    textShadow: '0 0 20px rgba(0, 245, 255, 0.6)'
                  }}>
                    {selectedLesson.lesson_name}
                  </h2>
                  {selectedLesson.subject_area && (
                    <span className="inline-block px-3 py-1 text-sm rounded-full text-white bg-gradient-to-r from-cyan-500 to-purple-500 mb-2">
                      {selectedLesson.subject_area}
                    </span>
                  )}
                  {selectedLesson.duration && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Clock className="w-5 h-5 text-cyan-400" style={{ filter: 'drop-shadow(0 0 5px rgba(0, 245, 255, 0.8))' }} />
                      <span>
                        {selectedLesson.duration.periods} periods × {selectedLesson.duration.minutes_per_period} minutes each
                      </span>
                    </div>
                  )}
                </div>

                {/* Learning Objectives */}
                {selectedLesson.learning_objectives && selectedLesson.learning_objectives.length > 0 && (
                  <SectionCard
                    icon={<Target className="w-6 h-6" />}
                    title="Learning Objectives"
                    color="from-cyan-400 to-blue-500"
                  >
                    <ul className="space-y-2">
                      {selectedLesson.learning_objectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/90">
                          <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 5px rgba(0, 245, 255, 0.8))' }} />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {/* Teaching Materials */}
                {selectedLesson.teaching_learning_materials && selectedLesson.teaching_learning_materials.length > 0 && (
                  <SectionCard
                    icon={<GraduationCap className="w-6 h-6" />}
                    title="Teaching Materials"
                    color="from-purple-400 to-pink-500"
                  >
                    <ul className="space-y-2">
                      {selectedLesson.teaching_learning_materials.map((material, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/90">
                          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.8))' }} />
                          <span>{material}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {/* Prerequisites */}
                {selectedLesson.previous_knowledge && selectedLesson.previous_knowledge.length > 0 && (
                  <SectionCard
                    icon={<Lightbulb className="w-6 h-6" />}
                    title="Prerequisites"
                    color="from-yellow-400 to-orange-500"
                  >
                    <ul className="space-y-2">
                      {selectedLesson.previous_knowledge.map((knowledge, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/90">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0 mt-2" style={{ filter: 'drop-shadow(0 0 5px rgba(251, 191, 36, 0.8))' }} />
                          <span>{knowledge}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {/* Introduction */}
                {selectedLesson.introduction && (
                  <SectionCard
                    icon={<Lightbulb className="w-6 h-6" />}
                    title={`Introduction (${selectedLesson.introduction.time_minutes || 5} minutes)`}
                    color="from-green-400 to-emerald-500"
                  >
                    {selectedLesson.introduction.activities && (
                      <ul className="space-y-2">
                        {selectedLesson.introduction.activities.map((activity, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-white/90">
                            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 mt-2" style={{ filter: 'drop-shadow(0 0 5px rgba(74, 222, 128, 0.8))' }} />
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                )}

                {/* Presentation */}
                {selectedLesson.presentation && (
                  <SectionCard
                    icon={<BookOpen className="w-6 h-6" />}
                    title={`Presentation (${selectedLesson.presentation.time_minutes || 15} minutes)`}
                    color="from-blue-400 to-indigo-500"
                  >
                    {selectedLesson.presentation.methods && (
                      <ul className="space-y-2 mb-4">
                        {selectedLesson.presentation.methods.map((method, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-white/90">
                            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-2" style={{ filter: 'drop-shadow(0 0 5px rgba(96, 165, 250, 0.8))' }} />
                            <span>{method}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedLesson.presentation.key_vocabulary && selectedLesson.presentation.key_vocabulary.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-2">Key Vocabulary:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedLesson.presentation.key_vocabulary.map((vocab, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 rounded-full text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600"
                              style={{
                                boxShadow: '0 0 10px rgba(96, 165, 250, 0.5)'
                              }}
                            >
                              {vocab}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Explanation & Discussion */}
                {selectedLesson.explanation_discussion && (
                  <SectionCard
                    icon={<Award className="w-6 h-6" />}
                    title={`Explanation & Discussion (${selectedLesson.explanation_discussion.time_minutes || 10} minutes)`}
                    color="from-pink-400 to-rose-500"
                  >
                    {selectedLesson.explanation_discussion.discussion_points && (
                      <ul className="space-y-2">
                        {selectedLesson.explanation_discussion.discussion_points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-white/90">
                            <span className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0 mt-2" style={{ filter: 'drop-shadow(0 0 5px rgba(244, 114, 182, 0.8))' }} />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                )}

                {/* Activities */}
                {selectedLesson.activities && (
                  <SectionCard
                    icon={<Award className="w-6 h-6" />}
                    title={`Activities (${selectedLesson.activities.time_minutes || 5} minutes)`}
                    color="from-violet-400 to-purple-500"
                  >
                    {selectedLesson.activities.class_activities && (
                      <ul className="space-y-2">
                        {selectedLesson.activities.class_activities.map((activity, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-white/90">
                            <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0 mt-2" style={{ filter: 'drop-shadow(0 0 5px rgba(167, 139, 250, 0.8))' }} />
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                )}

                {/* Values & Moral */}
                {selectedLesson.values_and_moral && selectedLesson.values_and_moral.length > 0 && (
                  <SectionCard
                    icon={<Award className="w-6 h-6" />}
                    title="Values & Moral"
                    color="from-amber-400 to-yellow-500"
                  >
                    <div className="flex flex-wrap gap-2">
                      {selectedLesson.values_and_moral.map((value, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full text-sm text-white bg-gradient-to-r from-amber-500 to-yellow-600"
                          style={{
                            boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                          }}
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Homework */}
                {selectedLesson.homework && selectedLesson.homework.length > 0 && (
                  <SectionCard
                    icon={<FileText className="w-6 h-6" />}
                    title="Homework"
                    color="from-teal-400 to-cyan-500"
                  >
                    <ul className="space-y-2">
                      {selectedLesson.homework.map((hw, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/90">
                          <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0 mt-2" style={{ filter: 'drop-shadow(0 0 5px rgba(45, 212, 191, 0.8))' }} />
                          <span>{hw}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}

                {/* Evaluation */}
                {selectedLesson.evaluation && selectedLesson.evaluation.length > 0 && (
                  <SectionCard
                    icon={<CheckCircle className="w-6 h-6" />}
                    title="Evaluation"
                    color="from-red-400 to-pink-500"
                  >
                    <ul className="space-y-2">
                      {selectedLesson.evaluation.map((evalItem, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-white/90">
                          <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" style={{ filter: 'drop-shadow(0 0 5px rgba(248, 113, 113, 0.8))' }} />
                          <span>{evalItem}</span>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 text-white/60">
              <p>Select a lesson to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 p-4 rounded-lg" style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    }}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${color}`} style={{
          boxShadow: '0 0 15px rgba(0, 0, 0, 0.3)'
        }}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-white" style={{
          textShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
        }}>
          {title}
        </h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function parseLessons(content: string): { lessons: Lesson[]; book: string; class: string } {
  const lessons: Lesson[] = [];
  let book = '';
  let classNum = '';

  // Try to parse from HTML markers
  const lessonRegex = /__LESSON_CARD_START__\n([\s\S]*?)\n__LESSON_CARD_END__/g;
  const matches = Array.from(content.matchAll(lessonRegex));

  for (const match of matches) {
    // Parse lesson from HTML (simplified - would need more robust parsing)
    const lessonNameMatch = match[1].match(/<h3[^>]*>(.*?)<\/h3>/);
    if (lessonNameMatch) {
      lessons.push({
        lesson_name: lessonNameMatch[1].trim()
      });
    }
  }

  // Fallback: parse from markdown
  if (lessons.length === 0) {
    const lessonRegex = /### Lesson \d+: (.*?)\n/g;
    const lessonMatches = Array.from(content.matchAll(lessonRegex));
    
    lessonMatches.forEach((match) => {
      lessons.push({
        lesson_name: match[1].trim()
      });
    });
  }

  return { lessons, book, class: classNum };
}
