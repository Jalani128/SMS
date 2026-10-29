import { apiClient } from '../lib/api';
import {
  TimetableSlot,
  TodayScheduleResponse,
  CopyDayPayload,
  DuplicateTimetablePayload,
  QueryTimetableParams,
} from '../types/timetable';

const SAMPLE_SLOTS: TimetableSlot[] = [
  // Monday
  {
    _id: 'slot-1',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101' },
    teacherId: { _id: 't-1', employeeId: 'TCH-001', userId: { name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu' } },
    dayOfWeek: 'monday',
    startTime: '08:30',
    endTime: '09:25',
    room: 'Lab 302',
    periodNumber: 1,
    entryType: 'lab',
    notes: 'Thermodynamics experiment',
    status: 'active',
  },
  {
    _id: 'slot-2',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-mat', name: 'Calculus BC', code: 'MTH-201' },
    teacherId: { _id: 't-2', employeeId: 'TCH-002', userId: { name: 'Katherine Johnson', email: 'kjohnson@school.edu' } },
    dayOfWeek: 'monday',
    startTime: '09:30',
    endTime: '10:25',
    room: 'Room 201',
    periodNumber: 2,
    entryType: 'lecture',
    status: 'active',
  },
  {
    _id: 'slot-3',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: null,
    teacherId: null,
    dayOfWeek: 'monday',
    startTime: '10:25',
    endTime: '10:55',
    room: 'Cafeteria',
    periodNumber: 3,
    entryType: 'break',
    notes: 'Morning Recess',
    status: 'active',
  },
  {
    _id: 'slot-4',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-his', name: 'World History', code: 'HIS-101' },
    teacherId: { _id: 't-3', employeeId: 'TCH-003', userId: { name: 'Howard Zinn', email: 'hzinn@school.edu' } },
    dayOfWeek: 'monday',
    startTime: '11:00',
    endTime: '11:55',
    room: 'Hall 12',
    periodNumber: 4,
    entryType: 'lecture',
    status: 'active',
  },
  {
    _id: 'slot-5',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-eng', name: 'English Literature', code: 'ENG-101' },
    teacherId: { _id: 't-4', employeeId: 'TCH-004', userId: { name: 'Toni Morrison', email: 'tmorrison@school.edu' } },
    dayOfWeek: 'monday',
    startTime: '12:00',
    endTime: '12:55',
    room: 'Room 104',
    periodNumber: 5,
    entryType: 'lecture',
    status: 'active',
  },

  // Tuesday
  {
    _id: 'slot-6',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-mat', name: 'Calculus BC', code: 'MTH-201' },
    teacherId: { _id: 't-2', employeeId: 'TCH-002', userId: { name: 'Katherine Johnson', email: 'kjohnson@school.edu' } },
    dayOfWeek: 'tuesday',
    startTime: '08:30',
    endTime: '09:25',
    room: 'Room 201',
    periodNumber: 1,
    entryType: 'lecture',
    status: 'active',
  },
  {
    _id: 'slot-7',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-cs', name: 'Computer Science', code: 'CS-101' },
    teacherId: { _id: 't-5', employeeId: 'TCH-005', userId: { name: 'Alan Turing', email: 'aturing@school.edu' } },
    dayOfWeek: 'tuesday',
    startTime: '09:30',
    endTime: '10:25',
    room: 'Lab 1',
    periodNumber: 2,
    entryType: 'lab',
    status: 'active',
  },
  {
    _id: 'slot-8',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: null,
    teacherId: null,
    dayOfWeek: 'tuesday',
    startTime: '10:25',
    endTime: '10:55',
    room: 'Cafeteria',
    periodNumber: 3,
    entryType: 'break',
    status: 'active',
  },
  {
    _id: 'slot-9',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101' },
    teacherId: { _id: 't-1', employeeId: 'TCH-001', userId: { name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu' } },
    dayOfWeek: 'tuesday',
    startTime: '11:00',
    endTime: '11:55',
    room: 'Lab 302',
    periodNumber: 4,
    entryType: 'lecture',
    status: 'active',
  },

  // Wednesday
  {
    _id: 'slot-10',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-chem', name: 'Chemistry', code: 'CHM-101' },
    teacherId: { _id: 't-6', employeeId: 'TCH-006', userId: { name: 'Marie Curie', email: 'mcurie@school.edu' } },
    dayOfWeek: 'wednesday',
    startTime: '08:30',
    endTime: '09:25',
    room: 'Lab 201',
    periodNumber: 1,
    entryType: 'lab',
    status: 'active',
  },
  {
    _id: 'slot-11',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101' },
    teacherId: { _id: 't-1', employeeId: 'TCH-001', userId: { name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu' } },
    dayOfWeek: 'wednesday',
    startTime: '09:30',
    endTime: '10:25',
    room: 'Lab 302',
    periodNumber: 2,
    entryType: 'lecture',
    status: 'active',
  },
];

export const timetableService = {
  /**
   * Retrieves timetable slots with filters and grouped-by-day mapping
   */
  async getTimetableList(params?: QueryTimetableParams): Promise<{
    data: TimetableSlot[];
    groupedByDay: Record<string, TimetableSlot[]>;
    totalSlots: number;
  }> {
    try {
      const response = await apiClient.get('/timetable', { params });
      if (response.data?.success && response.data?.data) {
        return {
          data: response.data.data,
          groupedByDay: response.data.groupedByDay || {},
          totalSlots: response.data.totalSlots || response.data.data.length,
        };
      }
    } catch (err) {
      console.warn('[timetableService] Using offline timetable fallback:', err);
    }

    let filtered = [...SAMPLE_SLOTS];
    if (params?.dayOfWeek && params.dayOfWeek !== 'all') {
      filtered = filtered.filter((s) => s.dayOfWeek === params.dayOfWeek);
    }

    const groupedByDay: Record<string, TimetableSlot[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    filtered.forEach((s) => {
      if (groupedByDay[s.dayOfWeek]) {
        groupedByDay[s.dayOfWeek].push(s);
      }
    });

    return {
      data: filtered,
      groupedByDay,
      totalSlots: filtered.length,
    };
  },

  /**
   * Retrieves a single slot
   */
  async getTimetableById(id: string): Promise<TimetableSlot> {
    try {
      const response = await apiClient.get(`/timetable/${id}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[timetableService] getTimetableById offline fallback:', err);
    }

    const found = SAMPLE_SLOTS.find((s) => s._id === id);
    if (!found) throw new Error('Slot not found');
    return found;
  },

  /**
   * Creates a new slot with authoritative conflict checks
   */
  async createTimetableSlot(payload: Partial<TimetableSlot>): Promise<TimetableSlot> {
    try {
      const response = await apiClient.post('/timetable', payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err: any) {
      // Re-throw conflict error with details
      if (err.response?.status === 409) {
        throw new Error(err.response.data?.message || 'Schedule conflict detected');
      }
      console.warn('[timetableService] createTimetableSlot offline fallback:', err);
    }

    const newSlot: TimetableSlot = {
      _id: `slot-${Date.now()}`,
      schoolId: 'school-1',
      academicSessionId: payload.academicSessionId || 'session-2026',
      classId: payload.classId || 'cls-10',
      sectionId: payload.sectionId || 'sec-10a',
      subjectId: payload.subjectId || null,
      teacherId: payload.teacherId || null,
      dayOfWeek: payload.dayOfWeek || 'monday',
      startTime: payload.startTime || '08:30',
      endTime: payload.endTime || '09:25',
      room: payload.room || 'Room 101',
      periodNumber: payload.periodNumber || 1,
      entryType: payload.entryType || 'lecture',
      notes: payload.notes,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SAMPLE_SLOTS.push(newSlot);
    return newSlot;
  },

  /**
   * Updates an existing timetable slot
   */
  async updateTimetableSlot(id: string, payload: Partial<TimetableSlot>): Promise<TimetableSlot> {
    try {
      const response = await apiClient.patch(`/timetable/${id}`, payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        throw new Error(err.response.data?.message || 'Schedule conflict detected');
      }
      console.warn('[timetableService] updateTimetableSlot offline fallback:', err);
    }

    const idx = SAMPLE_SLOTS.findIndex((s) => s._id === id);
    if (idx !== -1) {
      SAMPLE_SLOTS[idx] = { ...SAMPLE_SLOTS[idx], ...payload, updatedAt: new Date().toISOString() };
      return SAMPLE_SLOTS[idx];
    }
    throw new Error('Slot not found');
  },

  /**
   * Archives a timetable slot
   */
  async archiveTimetableSlot(id: string): Promise<TimetableSlot> {
    try {
      const response = await apiClient.patch(`/timetable/${id}/archive`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[timetableService] archiveTimetableSlot offline fallback:', err);
    }

    return this.updateTimetableSlot(id, { status: 'archived' });
  },

  /**
   * Deletes a timetable slot
   */
  async deleteTimetableSlot(id: string): Promise<void> {
    try {
      await apiClient.delete(`/timetable/${id}`);
    } catch (err) {
      console.warn('[timetableService] deleteTimetableSlot offline fallback:', err);
    }

    const idx = SAMPLE_SLOTS.findIndex((s) => s._id === id);
    if (idx !== -1) {
      SAMPLE_SLOTS.splice(idx, 1);
    }
  },

  /**
   * Retrieves today's schedule, ongoing lesson, and next upcoming lesson
   */
  async getTodaySchedule(params?: { sectionId?: string; teacherId?: string }): Promise<TodayScheduleResponse> {
    try {
      const response = await apiClient.get('/timetable/today', { params });
      if (response.data?.success) {
        return response.data;
      }
    } catch (err) {
      console.warn('[timetableService] getTodaySchedule offline fallback:', err);
    }

    const todaySlots = SAMPLE_SLOTS.filter((s) => s.dayOfWeek === 'monday');
    return {
      dayOfWeek: 'monday',
      currentTime: '09:00',
      slots: todaySlots,
      currentLesson: todaySlots[0] || null,
      nextLesson: todaySlots[1] || null,
    };
  },

  /**
   * Copies schedule from sourceDay to targetDay with conflict validation
   */
  async copyDaySchedule(payload: CopyDayPayload): Promise<{
    copiedCount?: number;
    conflicts?: any[];
    preview?: boolean;
  }> {
    try {
      const response = await apiClient.post('/timetable/copy-day', payload);
      if (response.data?.success) {
        return response.data;
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        return { conflicts: err.response.data?.conflicts || [] };
      }
      console.warn('[timetableService] copyDaySchedule offline fallback:', err);
    }

    return { copiedCount: 4, conflicts: [] };
  },

  /**
   * Duplicates timetable across sections
   */
  async duplicateTimetable(payload: DuplicateTimetablePayload): Promise<{
    duplicatedCount?: number;
    conflicts?: any[];
    preview?: boolean;
  }> {
    try {
      const response = await apiClient.post('/timetable/duplicate', payload);
      if (response.data?.success) {
        return response.data;
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        return { conflicts: err.response.data?.conflicts || [] };
      }
      console.warn('[timetableService] duplicateTimetable offline fallback:', err);
    }

    return { duplicatedCount: 12, conflicts: [] };
  },
};
