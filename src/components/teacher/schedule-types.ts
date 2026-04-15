export type TimetableEntry = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  room?: string;
};

export type UnifiedScheduleEntry = {
  id: string;
  date: string;
  endDateKey?: string;
  startTime: string;
  endTime: string;
  title: string;
  room?: string;
  eventType: 'class' | 'exam' | 'admin_event';
  subject?: string;
  classNumber?: string;
  description?: string;
  removable?: boolean;
};
