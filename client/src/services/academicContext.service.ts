import { api } from '../lib/api';
import { AcademicContextData } from '../types/management';

const FALLBACK_CONTEXT: AcademicContextData = {
  classes: [
    { _id: 'cls-9', name: 'Grade 9', code: 'G9', order: 1 },
    { _id: 'cls-10', name: 'Grade 10', code: 'G10', order: 2 },
    { _id: 'cls-11', name: 'Grade 11', code: 'G11', order: 3 },
    { _id: 'cls-12', name: 'Grade 12', code: 'G12', order: 4 },
  ],
  sections: [
    { _id: 'sec-9a', classId: 'cls-9', name: 'Section A', code: 'A', capacity: 35 },
    { _id: 'sec-9b', classId: 'cls-9', name: 'Section B', code: 'B', capacity: 35 },
    { _id: 'sec-10a', classId: 'cls-10', name: 'Section A', code: 'A', capacity: 35 },
    { _id: 'sec-10b', classId: 'cls-10', name: 'Section B', code: 'B', capacity: 35 },
    { _id: 'sec-11s', classId: 'cls-11', name: 'Science', code: 'SCI', capacity: 30 },
    { _id: 'sec-11c', classId: 'cls-11', name: 'Commerce', code: 'COM', capacity: 30 },
  ],
  sessions: [
    { _id: 'sess-2026', name: '2025-2026', code: 'AY-2026', isCurrent: true, status: 'active' },
    { _id: 'sess-2025', name: '2024-2025', code: 'AY-2025', isCurrent: false, status: 'completed' },
  ],
  currentSession: { _id: 'sess-2026', name: '2025-2026', code: 'AY-2026', isCurrent: true, status: 'active' },
};

export const academicContextService = {
  getContext: async (): Promise<AcademicContextData> => {
    try {
      const response = await api.get<AcademicContextData>('/academic-context');
      if (response.success && response.data) {
        return response.data;
      }
      return FALLBACK_CONTEXT;
    } catch {
      return FALLBACK_CONTEXT;
    }
  },
};
