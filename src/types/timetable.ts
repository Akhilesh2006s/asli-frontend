export interface TimetableEntry {
  _id: string;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  classId: { _id: string; classNumber: string; section: string } | string;
  sectionId: string;
  subjectId: { _id: string; name: string; code?: string } | string;
  teacherId: { _id: string; fullName: string; email: string } | string;
  room?: string;
  building?: string;
  repeatRule: 'none' | 'daily' | 'weekly' | 'monthly';
  effectiveFrom?: string;
  effectiveTo?: string;
  sessionType: 'Lecture' | 'Lab' | 'Exam' | 'Workshop' | 'Activity' | 'Holiday' | 'Special Class';
  attendanceRequired: boolean;
  expectedStudents?: number;
  capacity?: number;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  priority?: number;
  notes?: string;
  colorTag?: string;
  attachment?: string;
  repeatGroupId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableConflict {
  type: 'teacher' | 'room' | 'class';
  existing: TimetableEntry;
}

export interface TimetableFilters {
  startDate?: string;
  endDate?: string;
  classId?: string;
  teacherId?: string;
  subjectId?: string;
  room?: string;
  status?: string;
  sessionType?: string;
  sectionId?: string;
}

export type SessionType = TimetableEntry['sessionType'];

export const SESSION_TYPE_COLORS: Record<SessionType, { bg: string; text: string; border: string }> = {
  Lecture: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  Lab: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  Exam: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  Workshop: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  Activity: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  Holiday: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  'Special Class': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
};

export const STATUS_COLORS: Record<TimetableEntry['status'], string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700 line-through',
};

export const COLOR_PRESETS = [
  '#3B82F6', '#8B5CF6', '#EF4444', '#F97316',
  '#22C55E', '#6B7280', '#EAB308', '#EC4899',
];
