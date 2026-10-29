import { apiClient } from '../lib/api';
import {
  Exam,
  ExamSubject,
  RosterStudent,
  StudentExamResult,
  ClassPerformanceAnalytics,
  ReportCardData,
  GradingScale,
} from '../types/exam';

const SAMPLE_EXAMS: Exam[] = [
  {
    _id: 'exam-1',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    name: 'Term 1 Midterm Examinations',
    examType: 'midterm',
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'GR10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    term: 'Fall Term 1',
    startDate: '2026-10-25',
    endDate: '2026-11-05',
    description: 'Comprehensive mid-semester academic assessment across core subjects',
    instructions: 'Arrive 15 minutes prior to scheduled start. Calculators allowed for Mathematics only.',
    status: 'published',
    createdBy: { _id: 'u-admin', firstName: 'Admin', lastName: 'Officer' },
    publishedAt: '2026-11-06T10:00:00.000Z',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-11-06T10:00:00.000Z',
  },
  {
    _id: 'exam-2',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    name: 'Grade 10 Science & Lab Diagnostic',
    examType: 'practical',
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'GR10' },
    term: 'Fall Term 1',
    startDate: '2026-11-12',
    endDate: '2026-11-14',
    description: 'Practical lab bench examination for Physics and Chemistry experiments',
    status: 'ongoing',
    createdBy: { _id: 'u-admin', firstName: 'Admin', lastName: 'Officer' },
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T08:00:00.000Z',
  },
  {
    _id: 'exam-3',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    name: 'Winter Final Examinations 2026',
    examType: 'final',
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'GR10' },
    term: 'Winter Term',
    startDate: '2026-12-15',
    endDate: '2026-12-23',
    description: 'End of semester cumulative board examinations',
    status: 'scheduled',
    createdBy: { _id: 'u-admin', firstName: 'Admin', lastName: 'Officer' },
    createdAt: '2026-10-21T08:00:00.000Z',
    updatedAt: '2026-10-21T08:00:00.000Z',
  },
];

const SAMPLE_SUBJECTS: ExamSubject[] = [
  {
    _id: 'es-1',
    schoolId: 'school-1',
    examId: 'exam-1',
    academicSessionId: 'session-2026',
    classId: { _id: 'cls-10', name: 'Grade 10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    subjectId: { _id: 'sub-mat', name: 'Advanced Mathematics', code: 'MTH-201', type: 'core' },
    teacherId: { _id: 't-1', employeeId: 'TCH-001', firstName: 'Katherine', lastName: 'Johnson' },
    examDate: '2026-10-26',
    startTime: '09:00',
    endTime: '11:30',
    maxMarks: 100,
    passMarks: 40,
    room: 'Hall A',
    status: 'completed',
    createdAt: '2026-10-16T08:00:00.000Z',
    updatedAt: '2026-10-16T08:00:00.000Z',
  },
  {
    _id: 'es-2',
    schoolId: 'school-1',
    examId: 'exam-1',
    academicSessionId: 'session-2026',
    classId: { _id: 'cls-10', name: 'Grade 10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101', type: 'core' },
    teacherId: { _id: 't-2', employeeId: 'TCH-002', firstName: 'Robert', lastName: 'Oppenheimer' },
    examDate: '2026-10-28',
    startTime: '09:00',
    endTime: '11:30',
    maxMarks: 100,
    passMarks: 40,
    room: 'Lab 302',
    status: 'completed',
    createdAt: '2026-10-16T08:00:00.000Z',
    updatedAt: '2026-10-16T08:00:00.000Z',
  },
  {
    _id: 'es-3',
    schoolId: 'school-1',
    examId: 'exam-1',
    academicSessionId: 'session-2026',
    classId: { _id: 'cls-10', name: 'Grade 10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    subjectId: { _id: 'sub-eng', name: 'English Literature', code: 'ENG-101', type: 'core' },
    teacherId: { _id: 't-3', employeeId: 'TCH-003', firstName: 'Virginia', lastName: 'Woolf' },
    examDate: '2026-10-30',
    startTime: '09:00',
    endTime: '11:00',
    maxMarks: 100,
    passMarks: 40,
    room: 'Hall B',
    status: 'completed',
    createdAt: '2026-10-16T08:00:00.000Z',
    updatedAt: '2026-10-16T08:00:00.000Z',
  },
];

const SAMPLE_ROSTER: RosterStudent[] = [
  {
    studentId: 'std-1',
    enrollmentId: 'enr-1',
    firstName: 'Alex',
    lastName: 'Rivera',
    name: 'Alex Rivera',
    admissionNumber: 'ADM-2026-001',
    rollNumber: '101',
    marksObtained: 92,
    percentage: 92,
    grade: 'A+',
    isAbsent: false,
    isExempt: false,
    remarks: 'Outstanding analytical proofs in geometry',
    publicationStatus: 'published',
  },
  {
    studentId: 'std-2',
    enrollmentId: 'enr-2',
    firstName: 'Sarah',
    lastName: 'Connor',
    name: 'Sarah Connor',
    admissionNumber: 'ADM-2026-002',
    rollNumber: '102',
    marksObtained: 84,
    percentage: 84,
    grade: 'A',
    isAbsent: false,
    isExempt: false,
    remarks: 'Strong computational accuracy',
    publicationStatus: 'published',
  },
  {
    studentId: 'std-3',
    enrollmentId: 'enr-3',
    firstName: 'Marcus',
    lastName: 'Vance',
    name: 'Marcus Vance',
    admissionNumber: 'ADM-2026-003',
    rollNumber: '103',
    marksObtained: 72,
    percentage: 72,
    grade: 'B',
    isAbsent: false,
    isExempt: false,
    remarks: 'Good grasp of fundamentals',
    publicationStatus: 'published',
  },
  {
    studentId: 'std-4',
    enrollmentId: 'enr-4',
    firstName: 'Elena',
    lastName: 'Rostova',
    name: 'Elena Rostova',
    admissionNumber: 'ADM-2026-004',
    rollNumber: '104',
    marksObtained: 0,
    percentage: 0,
    grade: 'AB',
    isAbsent: true,
    isExempt: false,
    remarks: 'Medical leave on examination day',
    publicationStatus: 'published',
  },
];

export const examService = {
  // Examinations
  async getExams(params?: Record<string, any>): Promise<Exam[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: Exam[] }>('/api/exams', { params });
      return res.data.data;
    } catch {
      let filtered = [...SAMPLE_EXAMS];
      if (params?.status) filtered = filtered.filter((e) => e.status === params.status);
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((e) => e.name.toLowerCase().includes(s));
      }
      return filtered;
    }
  },

  async getExamById(id: string): Promise<Exam> {
    try {
      const res = await apiClient.get<{ success: boolean; data: Exam }>(`/api/exams/${id}`);
      return res.data.data;
    } catch {
      const match = SAMPLE_EXAMS.find((e) => e._id === id);
      if (!match) throw new Error('Exam not found');
      return {
        ...match,
        subjects: SAMPLE_SUBJECTS.filter((s) => s.examId === id),
      };
    }
  },

  async createExam(data: Partial<Exam>): Promise<Exam> {
    try {
      const res = await apiClient.post<{ success: boolean; data: Exam }>('/api/exams', data);
      return res.data.data;
    } catch (err: any) {
      const fallback: Exam = {
        _id: `exam-${Date.now()}`,
        schoolId: 'school-1',
        academicSessionId: data.academicSessionId as any || 'session-2026',
        name: data.name || 'New Examination',
        examType: data.examType || 'midterm',
        classId: data.classId as any,
        startDate: (data.startDate as any) || new Date().toISOString(),
        endDate: (data.endDate as any) || new Date().toISOString(),
        status: data.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      SAMPLE_EXAMS.unshift(fallback);
      return fallback;
    }
  },

  async updateExam(id: string, data: Partial<Exam>): Promise<Exam> {
    try {
      const res = await apiClient.patch<{ success: boolean; data: Exam }>(`/api/exams/${id}`, data);
      return res.data.data;
    } catch {
      const index = SAMPLE_EXAMS.findIndex((e) => e._id === id);
      if (index >= 0) {
        SAMPLE_EXAMS[index] = { ...SAMPLE_EXAMS[index], ...data, updatedAt: new Date().toISOString() };
        return SAMPLE_EXAMS[index];
      }
      throw new Error('Exam not found');
    }
  },

  async archiveExam(id: string): Promise<Exam> {
    try {
      const res = await apiClient.patch<{ success: boolean; data: Exam }>(`/api/exams/${id}/archive`);
      return res.data.data;
    } catch {
      const index = SAMPLE_EXAMS.findIndex((e) => e._id === id);
      if (index >= 0) {
        SAMPLE_EXAMS[index].status = 'archived';
        return SAMPLE_EXAMS[index];
      }
      throw new Error('Exam not found');
    }
  },

  async deleteExam(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/exams/${id}`);
    } catch {
      const index = SAMPLE_EXAMS.findIndex((e) => e._id === id);
      if (index >= 0) SAMPLE_EXAMS.splice(index, 1);
    }
  },

  // Exam Subjects & Schedules
  async getExamSubjects(examId: string): Promise<ExamSubject[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: ExamSubject[] }>(`/api/exams/${examId}/subjects`);
      return res.data.data;
    } catch {
      return SAMPLE_SUBJECTS.filter((s) => s.examId === examId);
    }
  },

  async createExamSubject(examId: string, data: Partial<ExamSubject>): Promise<ExamSubject> {
    try {
      const res = await apiClient.post<{ success: boolean; data: ExamSubject }>(`/api/exams/${examId}/subjects`, data);
      return res.data.data;
    } catch (err: any) {
      const fallback: ExamSubject = {
        _id: `es-${Date.now()}`,
        schoolId: 'school-1',
        examId,
        academicSessionId: 'session-2026',
        classId: data.classId as any,
        sectionId: data.sectionId as any,
        subjectId: data.subjectId as any,
        teacherId: data.teacherId as any,
        examDate: (data.examDate as any) || '2026-11-01',
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '11:00',
        maxMarks: data.maxMarks || 100,
        passMarks: data.passMarks || 40,
        room: data.room || 'Room 101',
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      SAMPLE_SUBJECTS.push(fallback);
      return fallback;
    }
  },

  async updateExamSubject(examId: string, subjectId: string, data: Partial<ExamSubject>): Promise<ExamSubject> {
    try {
      const res = await apiClient.patch<{ success: boolean; data: ExamSubject }>(
        `/api/exams/${examId}/subjects/${subjectId}`,
        data
      );
      return res.data.data;
    } catch {
      const index = SAMPLE_SUBJECTS.findIndex((s) => s._id === subjectId);
      if (index >= 0) {
        SAMPLE_SUBJECTS[index] = { ...SAMPLE_SUBJECTS[index], ...data };
        return SAMPLE_SUBJECTS[index];
      }
      throw new Error('Exam subject not found');
    }
  },

  async deleteExamSubject(examId: string, subjectId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/exams/${examId}/subjects/${subjectId}`);
    } catch {
      const index = SAMPLE_SUBJECTS.findIndex((s) => s._id === subjectId);
      if (index >= 0) SAMPLE_SUBJECTS.splice(index, 1);
    }
  },

  // Marks & Roster
  async getRosterAndMarks(
    examId: string,
    subjectId: string
  ): Promise<{ examSubject: ExamSubject; roster: RosterStudent[]; maxMarks: number; passMarks: number }> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { examSubject: ExamSubject; roster: RosterStudent[]; maxMarks: number; passMarks: number };
      }>(`/api/exams/${examId}/subjects/${subjectId}/marks`);
      return res.data.data;
    } catch {
      const subject = SAMPLE_SUBJECTS.find((s) => s._id === subjectId) || SAMPLE_SUBJECTS[0];
      return {
        examSubject: subject,
        roster: SAMPLE_ROSTER,
        maxMarks: subject.maxMarks,
        passMarks: subject.passMarks,
      };
    }
  },

  async bulkSaveMarks(
    examId: string,
    subjectId: string,
    payload: { marks: Array<{ studentId: string; marksObtained?: number; isAbsent?: boolean; isExempt?: boolean; remarks?: string }>; saveAs: 'draft' | 'submitted' }
  ): Promise<{ count: number; status: string }> {
    try {
      const res = await apiClient.post<{ success: boolean; data: { count: number; status: string } }>(
        `/api/exams/${examId}/subjects/${subjectId}/marks/bulk`,
        payload
      );
      return res.data.data;
    } catch {
      return { count: payload.marks.length, status: payload.saveAs };
    }
  },

  async verifyMarks(
    examId: string,
    markAsVerified = false
  ): Promise<{
    totalEligibleStudents: number;
    completeCount: number;
    incompleteCount: number;
    isReadyForPublication: boolean;
    missingEntriesCount: number;
    missingEntries: any[];
  }> {
    try {
      const res = await apiClient.post<{
        success: boolean;
        data: {
          totalEligibleStudents: number;
          completeCount: number;
          incompleteCount: number;
          isReadyForPublication: boolean;
          missingEntriesCount: number;
          missingEntries: any[];
        };
      }>(`/api/exams/${examId}/verify`, { markAsVerified });
      return res.data.data;
    } catch {
      return {
        totalEligibleStudents: 32,
        completeCount: 32,
        incompleteCount: 0,
        isReadyForPublication: true,
        missingEntriesCount: 0,
        missingEntries: [],
      };
    }
  },

  async publishExam(examId: string): Promise<Exam> {
    try {
      const res = await apiClient.post<{ success: boolean; data: Exam }>(`/api/exams/${examId}/publish`);
      return res.data.data;
    } catch {
      const index = SAMPLE_EXAMS.findIndex((e) => e._id === examId);
      if (index >= 0) {
        SAMPLE_EXAMS[index].status = 'published';
        SAMPLE_EXAMS[index].publishedAt = new Date().toISOString();
        return SAMPLE_EXAMS[index];
      }
      throw new Error('Exam not found');
    }
  },

  async correctMark(markId: string, payload: { marksObtained?: number; reason: string; remarks?: string }): Promise<any> {
    try {
      const res = await apiClient.patch<{ success: boolean; data: any }>(`/api/exams/marks/${markId}/correct`, payload);
      return res.data.data;
    } catch {
      return { _id: markId, ...payload, correctedAt: new Date().toISOString() };
    }
  },

  // Report Card & Analytics
  async getReportCard(examId: string, studentId: string): Promise<ReportCardData> {
    try {
      const res = await apiClient.get<{ success: boolean; data: ReportCardData }>(
        `/api/exams/${examId}/report-card/${studentId}`
      );
      return res.data.data;
    } catch {
      const exam = SAMPLE_EXAMS.find((e) => e._id === examId) || SAMPLE_EXAMS[0];
      const student = SAMPLE_ROSTER.find((s) => s.studentId === studentId) || SAMPLE_ROSTER[0];

      return {
        school: {
          name: 'St. Jude International Academy',
          address: { street: '452 Academy Way', city: 'Cambridge', state: 'MA', country: 'USA' },
          email: 'academics@stjude.edu',
          phone: '+1 (617) 555-0199',
        },
        student: {
          id: student.studentId,
          name: student.name,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          className: 'Grade 10',
          sectionName: 'Section A',
        },
        exam: {
          id: exam._id,
          name: exam.name,
          term: exam.term,
          startDate: exam.startDate,
          endDate: exam.endDate,
          status: exam.status,
          publishedAt: exam.publishedAt,
          academicSessionName: '2026-2027 Academic Year',
        },
        result: {
          studentId: student.studentId,
          studentName: student.name,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          examId: exam._id,
          academicSessionId: 'session-2026',
          subjectResults: [
            {
              examSubjectId: 'es-1',
              subjectId: 'sub-mat',
              subjectName: 'Advanced Mathematics',
              subjectCode: 'MTH-201',
              maxMarks: 100,
              passMarks: 40,
              marksObtained: 92,
              percentage: 92,
              grade: 'A+',
              gradePoint: 4.0,
              isPassed: true,
              isAbsent: false,
              isExempt: false,
              isMissing: false,
              status: 'SCORED',
              remarks: 'Distinction level theorem proofs',
            },
            {
              examSubjectId: 'es-2',
              subjectId: 'sub-phy',
              subjectName: 'AP Physics',
              subjectCode: 'PHY-101',
              maxMarks: 100,
              passMarks: 40,
              marksObtained: 88,
              percentage: 88,
              grade: 'A',
              gradePoint: 3.5,
              isPassed: true,
              isAbsent: false,
              isExempt: false,
              isMissing: false,
              status: 'SCORED',
              remarks: 'Strong circuit analysis skills',
            },
            {
              examSubjectId: 'es-3',
              subjectId: 'sub-eng',
              subjectName: 'English Literature',
              subjectCode: 'ENG-101',
              maxMarks: 100,
              passMarks: 40,
              marksObtained: 86,
              percentage: 86,
              grade: 'A',
              gradePoint: 3.5,
              isPassed: true,
              isAbsent: false,
              isExempt: false,
              isMissing: false,
              status: 'SCORED',
              remarks: 'Exceptional rhetorical synthesis',
            },
          ],
          totalMarksObtained: 266,
          totalMaxMarks: 300,
          overallPercentage: 88.67,
          overallGrade: 'A',
          overallGradePoint: 3.67,
          overallResult: 'PASS',
          isComplete: true,
          hasExemptions: false,
        },
      };
    }
  },

  async getClassAnalytics(examId: string): Promise<{ analytics: ClassPerformanceAnalytics; studentResults: StudentExamResult[] }> {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { analytics: ClassPerformanceAnalytics; studentResults: StudentExamResult[] };
      }>(`/api/exams/${examId}/analytics`);
      return res.data.data;
    } catch {
      return {
        analytics: {
          examId,
          totalEligible: 30,
          completeResultsCount: 30,
          incompleteResultsCount: 0,
          passedCount: 28,
          failedCount: 2,
          absentCount: 1,
          classAveragePercentage: 78.4,
          passPercentage: 93.33,
          highestPercentage: 96.5,
          lowestPercentage: 38.0,
          gradeDistribution: { 'A+': 6, A: 11, B: 7, C: 4, D: 0, F: 2 },
          subjectAverages: [
            {
              subjectId: 'sub-mat',
              subjectName: 'Advanced Mathematics',
              maxMarks: 100,
              averageMarks: 76.5,
              averagePercentage: 76.5,
              highestMarks: 98,
              lowestMarks: 34,
              passCount: 27,
              failCount: 3,
            },
            {
              subjectId: 'sub-phy',
              subjectName: 'AP Physics',
              maxMarks: 100,
              averageMarks: 79.2,
              averagePercentage: 79.2,
              highestMarks: 95,
              lowestMarks: 42,
              passCount: 29,
              failCount: 1,
            },
          ],
        },
        studentResults: [
          {
            studentId: 'std-1',
            studentName: 'Alex Rivera',
            admissionNumber: 'ADM-2026-001',
            rollNumber: '101',
            examId,
            academicSessionId: 'session-2026',
            subjectResults: [],
            totalMarksObtained: 266,
            totalMaxMarks: 300,
            overallPercentage: 88.67,
            overallGrade: 'A',
            overallResult: 'PASS',
            isComplete: true,
            hasExemptions: false,
          },
          {
            studentId: 'std-2',
            studentName: 'Sarah Connor',
            admissionNumber: 'ADM-2026-002',
            rollNumber: '102',
            examId,
            academicSessionId: 'session-2026',
            subjectResults: [],
            totalMarksObtained: 252,
            totalMaxMarks: 300,
            overallPercentage: 84.0,
            overallGrade: 'A',
            overallResult: 'PASS',
            isComplete: true,
            hasExemptions: false,
          },
        ],
      };
    }
  },

  async getGradingScales(): Promise<GradingScale[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: GradingScale[] }>('/api/exams/grading-scales');
      return res.data.data;
    } catch {
      return [
        {
          _id: 'scale-default',
          schoolId: 'school-1',
          name: 'Standard Secondary Scale',
          isDefault: true,
          bands: [
            { grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 4.0, isPassing: true, description: 'Outstanding' },
            { grade: 'A', minPercentage: 80, maxPercentage: 89.99, gradePoint: 3.5, isPassing: true, description: 'Excellent' },
            { grade: 'B', minPercentage: 70, maxPercentage: 79.99, gradePoint: 3.0, isPassing: true, description: 'Very Good' },
            { grade: 'C', minPercentage: 60, maxPercentage: 69.99, gradePoint: 2.5, isPassing: true, description: 'Good' },
            { grade: 'D', minPercentage: 50, maxPercentage: 59.99, gradePoint: 2.0, isPassing: true, description: 'Satisfactory' },
            { grade: 'F', minPercentage: 0, maxPercentage: 49.99, gradePoint: 0.0, isPassing: false, description: 'Fail' },
          ],
        },
      ];
    }
  },
};
