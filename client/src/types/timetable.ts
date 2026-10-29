export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TimetableSlotStatus = 'active' | 'cancelled' | 'substituted' | 'archived';
export type TimetableEntryType = 'lecture' | 'lab' | 'break' | 'activity' | 'assembly' | 'other';

export interface TimetableSlot {
  _id: string;
  schoolId: string;
  academicSessionId: {
    _id: string;
    name: string;
    isCurrent?: boolean;
  } | string;
  classId: {
    _id: string;
    name: string;
    stage?: string;
  } | string;
  sectionId: {
    _id: string;
    name: string;
    roomNumber?: string;
  } | string;
  subjectId?: {
    _id: string;
    name: string;
    code?: string;
  } | string | null;
  teacherId?: {
    _id: string;
    employeeId: string;
    userId?: {
      name: string;
      email: string;
    };
  } | string | null;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  room: string;
  periodNumber: number;
  entryType: TimetableEntryType;
  notes?: string;
  status: TimetableSlotStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TodayScheduleResponse {
  dayOfWeek: DayOfWeek;
  currentTime: string;
  slots: TimetableSlot[];
  currentLesson?: TimetableSlot | null;
  nextLesson?: TimetableSlot | null;
}

export interface CopyDayPayload {
  academicSessionId: string;
  sectionId: string;
  sourceDay: DayOfWeek;
  targetDay: DayOfWeek;
  overwriteExisting?: boolean;
  previewOnly?: boolean;
}

export interface DuplicateTimetablePayload {
  academicSessionId: string;
  sourceSectionId: string;
  targetSectionId: string;
  targetClassId: string;
  previewOnly?: boolean;
}

export interface TimetableConflictError {
  conflictType: 'teacher' | 'section' | 'room';
  message: string;
  conflictingSlot?: Partial<TimetableSlot>;
}

export interface QueryTimetableParams {
  academicSessionId?: string;
  classId?: string;
  sectionId?: string;
  teacherId?: string;
  dayOfWeek?: string;
  room?: string;
  status?: string;
  wardId?: string;
}
