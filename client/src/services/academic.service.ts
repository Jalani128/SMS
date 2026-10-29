import { api } from '../lib/api';
import {
  AcademicSessionRecord,
  ClassRecord,
  SectionRecord,
  SubjectRecord,
  SubjectAssignmentRecord,
  AcademicEnrollmentItem,
  AcademicSummaryMetrics,
} from '../types/academic';

// Fallback session data
const FALLBACK_SESSIONS: AcademicSessionRecord[] = [
  {
    _id: 'sess-2025-2026',
    name: 'Academic Year 2025-2026',
    code: 'AY-2025-2026',
    startDate: '2025-08-01',
    endDate: '2026-06-30',
    isCurrent: true,
    status: 'active',
    terms: [
      { name: 'Fall Term', startDate: '2025-08-01', endDate: '2025-12-20' },
      { name: 'Spring Term', startDate: '2026-01-10', endDate: '2026-06-30' },
    ],
  },
  {
    _id: 'sess-2024-2025',
    name: 'Academic Year 2024-2025',
    code: 'AY-2024-2025',
    startDate: '2024-08-01',
    endDate: '2025-06-30',
    isCurrent: false,
    status: 'completed',
  },
  {
    _id: 'sess-2026-2027',
    name: 'Academic Year 2026-2027',
    code: 'AY-2026-2027',
    startDate: '2026-08-01',
    endDate: '2027-06-30',
    isCurrent: false,
    status: 'upcoming',
  },
];

// Fallback class data
const FALLBACK_CLASSES: ClassRecord[] = [
  { _id: 'cls-9', name: 'Grade 9', code: 'G9', order: 9, description: 'Junior Secondary 3rd Year', status: 'active', sectionsCount: 3, studentsCount: 92 },
  { _id: 'cls-10', name: 'Grade 10', code: 'G10', order: 10, description: 'Senior Secondary 1st Year (GCSE / High School)', status: 'active', sectionsCount: 3, studentsCount: 96 },
  { _id: 'cls-11', name: 'Grade 11', code: 'G11', order: 11, description: 'Pre-University / Advanced Placement', status: 'active', sectionsCount: 2, studentsCount: 64 },
  { _id: 'cls-12', name: 'Grade 12', code: 'G12', order: 12, description: 'Senior Graduation Year', status: 'active', sectionsCount: 2, studentsCount: 58 },
];

// Fallback section data
const FALLBACK_SECTIONS: SectionRecord[] = [
  { _id: 'sec-9a', classId: { _id: 'cls-9', name: 'Grade 9', code: 'G9' }, name: 'Section A', code: '9A', capacity: 35, currentEnrolled: 32, roomNumber: 'Room 101', status: 'active' },
  { _id: 'sec-9b', classId: { _id: 'cls-9', name: 'Grade 9', code: 'G9' }, name: 'Section B', code: '9B', capacity: 35, currentEnrolled: 31, roomNumber: 'Room 102', status: 'active' },
  { _id: 'sec-9c', classId: { _id: 'cls-9', name: 'Grade 9', code: 'G9' }, name: 'Section C', code: '9C', capacity: 35, currentEnrolled: 29, roomNumber: 'Room 103', status: 'active' },
  { _id: 'sec-10a', classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' }, name: 'Section A', code: '10A', capacity: 35, currentEnrolled: 34, roomNumber: 'Room 201', status: 'active' },
  { _id: 'sec-10b', classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' }, name: 'Section B', code: '10B', capacity: 35, currentEnrolled: 32, roomNumber: 'Room 202', status: 'active' },
  { _id: 'sec-10c', classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' }, name: 'Section C', code: '10C', capacity: 35, currentEnrolled: 30, roomNumber: 'Room 203', status: 'active' },
];

// Fallback subject data
const FALLBACK_SUBJECTS: SubjectRecord[] = [
  { _id: 'subj-math', name: 'Mathematics & Statistics', code: 'MATH-101', type: 'core', department: 'Mathematics', creditHours: 4, description: 'Algebra, Geometry, Pre-calculus', status: 'active' },
  { _id: 'subj-phys', name: 'Physics & Experimental Lab', code: 'PHYS-101', type: 'core', department: 'Science', creditHours: 4, description: 'Mechanics, Heat, Optics, Laboratory work', status: 'active' },
  { _id: 'subj-chem', name: 'General Chemistry', code: 'CHEM-101', type: 'core', department: 'Science', creditHours: 4, description: 'Inorganic & Organic Chemistry', status: 'active' },
  { _id: 'subj-eng', name: 'English Literature & Composition', code: 'ENG-101', type: 'core', department: 'Languages', creditHours: 3, description: 'Critical writing and classical literature', status: 'active' },
  { _id: 'subj-cs', name: 'Computer Science & Coding', code: 'CS-101', type: 'elective', department: 'Technology', creditHours: 3, description: 'Python, Algorithms, Web fundamentals', status: 'active' },
  { _id: 'subj-art', name: 'Visual Arts & Design', code: 'ART-101', type: 'optional', department: 'Fine Arts', creditHours: 2, description: 'Drawing, Painting, and Digital Illustration', status: 'active' },
];

// Fallback subject assignments
const FALLBACK_ASSIGNMENTS: SubjectAssignmentRecord[] = [
  {
    _id: 'asg-01',
    academicSessionId: { _id: 'sess-2025-2026', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A', code: '10A' },
    subjectId: { _id: 'subj-math', name: 'Mathematics & Statistics', code: 'MATH-101', type: 'core', creditHours: 4 },
    teacherId: {
      _id: 'tch-01',
      employeeId: 'EMP-TCH-010',
      department: 'Mathematics',
      userId: { _id: 'usr-tch-01', name: 'Dr. Sarah Jenkins', email: 'sarah.jenkins@greenwood.edu' },
    },
    periodsPerWeek: 5,
    status: 'active',
  },
  {
    _id: 'asg-02',
    academicSessionId: { _id: 'sess-2025-2026', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A', code: '10A' },
    subjectId: { _id: 'subj-phys', name: 'Physics & Experimental Lab', code: 'PHYS-101', type: 'core', creditHours: 4 },
    teacherId: {
      _id: 'tch-02',
      employeeId: 'EMP-TCH-012',
      department: 'Science',
      userId: { _id: 'usr-tch-02', name: 'Prof. David Miller', email: 'david.miller@greenwood.edu' },
    },
    periodsPerWeek: 4,
    status: 'active',
  },
];

// Fallback enrollments
const FALLBACK_ENROLLMENTS: AcademicEnrollmentItem[] = [
  {
    _id: 'enr-01',
    studentId: {
      _id: 'stu-01',
      admissionNumber: 'GIA-9042',
      userId: { _id: 'usr-stu-01', name: 'Sophia Martinez', email: 'sophia.martinez@greenwood.edu' },
    },
    academicSessionId: { _id: 'sess-2025-2026', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A', code: '10A', capacity: 35 },
    rollNumber: '10-A-01',
    status: 'enrolled',
    enrollmentDate: '2025-08-15',
    remarks: 'Enrolled on schedule',
  },
  {
    _id: 'enr-02',
    studentId: {
      _id: 'stu-02',
      admissionNumber: 'GIA-9043',
      userId: { _id: 'usr-stu-02', name: 'Liam Chen', email: 'liam.chen@greenwood.edu' },
    },
    academicSessionId: { _id: 'sess-2025-2026', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A', code: '10A', capacity: 35 },
    rollNumber: '10-A-02',
    status: 'enrolled',
    enrollmentDate: '2025-08-15',
    remarks: 'Enrolled on schedule',
  },
];

export const academicService = {
  // =========================================================================
  // ACADEMIC SESSIONS
  // =========================================================================
  async getSessions(): Promise<AcademicSessionRecord[]> {
    try {
      const res = await api.get<AcademicSessionRecord[]>('/academic-sessions');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return FALLBACK_SESSIONS;
    } catch (err) {
      console.warn('AcademicService.getSessions using fallback data:', err);
      return FALLBACK_SESSIONS;
    }
  },

  async createSession(payload: Partial<AcademicSessionRecord>): Promise<AcademicSessionRecord> {
    const res = await api.post<AcademicSessionRecord>('/academic-sessions', payload);
    return res.data;
  },

  async updateSession(id: string, payload: Partial<AcademicSessionRecord>): Promise<AcademicSessionRecord> {
    const res = await api.patch<AcademicSessionRecord>(`/academic-sessions/${id}`, payload);
    return res.data;
  },

  async activateSession(id: string): Promise<AcademicSessionRecord> {
    const res = await api.patch<AcademicSessionRecord>(`/academic-sessions/${id}/activate`);
    return res.data;
  },

  async archiveSession(id: string): Promise<AcademicSessionRecord> {
    const res = await api.patch<AcademicSessionRecord>(`/academic-sessions/${id}/archive`);
    return res.data;
  },

  // =========================================================================
  // CLASSES
  // =========================================================================
  async getClasses(sessionId?: string): Promise<ClassRecord[]> {
    try {
      const params = sessionId ? { academicSessionId: sessionId } : undefined;
      const res = await api.get<ClassRecord[]>('/classes', params as Record<string, unknown>);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return FALLBACK_CLASSES;
    } catch (err) {
      console.warn('AcademicService.getClasses using fallback data:', err);
      return FALLBACK_CLASSES;
    }
  },

  async createClass(payload: Partial<ClassRecord>): Promise<ClassRecord> {
    const res = await api.post<ClassRecord>('/classes', payload);
    return res.data;
  },

  async updateClass(id: string, payload: Partial<ClassRecord>): Promise<ClassRecord> {
    const res = await api.patch<ClassRecord>(`/classes/${id}`, payload);
    return res.data;
  },

  async archiveClass(id: string): Promise<ClassRecord> {
    const res = await api.patch<ClassRecord>(`/classes/${id}/archive`);
    return res.data;
  },

  // =========================================================================
  // SECTIONS
  // =========================================================================
  async getSections(classId?: string, sessionId?: string): Promise<SectionRecord[]> {
    try {
      const params: Record<string, unknown> = {};
      if (classId) params.classId = classId;
      if (sessionId) params.academicSessionId = sessionId;
      const res = await api.get<SectionRecord[]>('/sections', Object.keys(params).length > 0 ? params : undefined);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return FALLBACK_SECTIONS;
    } catch (err) {
      console.warn('AcademicService.getSections using fallback data:', err);
      return FALLBACK_SECTIONS;
    }
  },

  async createSection(payload: Partial<SectionRecord>): Promise<SectionRecord> {
    const res = await api.post<SectionRecord>('/sections', payload);
    return res.data;
  },

  async updateSection(id: string, payload: Partial<SectionRecord>): Promise<SectionRecord> {
    const res = await api.patch<SectionRecord>(`/sections/${id}`, payload);
    return res.data;
  },

  async archiveSection(id: string): Promise<SectionRecord> {
    const res = await api.patch<SectionRecord>(`/sections/${id}/archive`);
    return res.data;
  },

  // =========================================================================
  // SUBJECTS
  // =========================================================================
  async getSubjects(type?: string): Promise<SubjectRecord[]> {
    try {
      const params = type ? { type } : undefined;
      const res = await api.get<SubjectRecord[]>('/subjects', params as Record<string, unknown>);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return FALLBACK_SUBJECTS;
    } catch (err) {
      console.warn('AcademicService.getSubjects using fallback data:', err);
      return FALLBACK_SUBJECTS;
    }
  },

  async createSubject(payload: Partial<SubjectRecord>): Promise<SubjectRecord> {
    const res = await api.post<SubjectRecord>('/subjects', payload);
    return res.data;
  },

  async updateSubject(id: string, payload: Partial<SubjectRecord>): Promise<SubjectRecord> {
    const res = await api.patch<SubjectRecord>(`/subjects/${id}`, payload);
    return res.data;
  },

  async archiveSubject(id: string): Promise<SubjectRecord> {
    const res = await api.patch<SubjectRecord>(`/subjects/${id}/archive`);
    return res.data;
  },

  // =========================================================================
  // SUBJECT & TEACHER ASSIGNMENTS
  // =========================================================================
  async getAssignments(filters?: {
    academicSessionId?: string;
    classId?: string;
    sectionId?: string;
    teacherId?: string;
  }): Promise<SubjectAssignmentRecord[]> {
    try {
      const res = await api.get<SubjectAssignmentRecord[]>('/subject-assignments', filters as Record<string, unknown>);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return FALLBACK_ASSIGNMENTS;
    } catch (err) {
      console.warn('AcademicService.getAssignments using fallback data:', err);
      return FALLBACK_ASSIGNMENTS;
    }
  },

  async createAssignment(payload: Partial<SubjectAssignmentRecord>): Promise<SubjectAssignmentRecord> {
    const res = await api.post<SubjectAssignmentRecord>('/subject-assignments', payload);
    return res.data;
  },

  async updateAssignment(id: string, payload: Partial<SubjectAssignmentRecord>): Promise<SubjectAssignmentRecord> {
    const res = await api.patch<SubjectAssignmentRecord>(`/subject-assignments/${id}`, payload);
    return res.data;
  },

  async archiveAssignment(id: string): Promise<SubjectAssignmentRecord> {
    const res = await api.patch<SubjectAssignmentRecord>(`/subject-assignments/${id}/archive`);
    return res.data;
  },

  // =========================================================================
  // ENROLLMENTS & TRANSFERS
  // =========================================================================
  async getEnrollments(filters?: {
    academicSessionId?: string;
    classId?: string;
    sectionId?: string;
    status?: string;
  }): Promise<AcademicEnrollmentItem[]> {
    try {
      const res = await api.get<AcademicEnrollmentItem[]>('/enrollments', filters as Record<string, unknown>);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return FALLBACK_ENROLLMENTS;
    } catch (err) {
      console.warn('AcademicService.getEnrollments using fallback data:', err);
      return FALLBACK_ENROLLMENTS;
    }
  },

  async enrollStudent(payload: {
    studentId: string;
    academicSessionId: string;
    classId: string;
    sectionId: string;
    rollNumber?: string;
    remarks?: string;
  }): Promise<AcademicEnrollmentItem> {
    const res = await api.post<AcademicEnrollmentItem>('/enrollments', payload);
    return res.data;
  },

  async transferStudent(
    enrollmentId: string,
    payload: {
      targetClassId: string;
      targetSectionId: string;
      targetRollNumber?: string;
      reason: string;
    }
  ): Promise<{ previousEnrollment: AcademicEnrollmentItem; newEnrollment: AcademicEnrollmentItem }> {
    const res = await api.post<{ previousEnrollment: AcademicEnrollmentItem; newEnrollment: AcademicEnrollmentItem }>(
      `/enrollments/${enrollmentId}/transfer`,
      payload
    );
    return res.data;
  },

  async getStudentEnrollmentHistory(studentId: string): Promise<AcademicEnrollmentItem[]> {
    const res = await api.get<AcademicEnrollmentItem[]>(`/enrollments/student/${studentId}`);
    return res.data;
  },

  // =========================================================================
  // ACADEMIC SUMMARY METRICS
  // =========================================================================
  async getSummary(): Promise<AcademicSummaryMetrics> {
    try {
      const res = await api.get<AcademicSummaryMetrics>('/academic/summary');
      if (res.success && res.data) {
        return res.data;
      }
      return {
        activeSession: {
          _id: 'sess-2025-2026',
          name: 'Academic Year 2025-2026',
          code: 'AY-2025-2026',
          startDate: '2025-08-01',
          endDate: '2026-06-30',
          status: 'active',
        },
        classesCount: 4,
        sectionsCount: 10,
        subjectsCount: 6,
        enrolledStudentsCount: 310,
        assignedTeachersCount: 18,
        averageSectionCapacity: 35,
        capacityUtilizationRate: 88.6,
      };
    } catch (err) {
      console.warn('AcademicService.getSummary using fallback metrics:', err);
      return {
        activeSession: {
          _id: 'sess-2025-2026',
          name: 'Academic Year 2025-2026',
          code: 'AY-2025-2026',
          startDate: '2025-08-01',
          endDate: '2026-06-30',
          status: 'active',
        },
        classesCount: 4,
        sectionsCount: 10,
        subjectsCount: 6,
        enrolledStudentsCount: 310,
        assignedTeachersCount: 18,
        averageSectionCapacity: 35,
        capacityUtilizationRate: 88.6,
      };
    }
  },
};
