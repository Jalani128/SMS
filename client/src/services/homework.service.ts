import { apiClient } from '../lib/api';
import {
  HomeworkItem,
  SubmissionItem,
  HomeworkSummaryStats,
  RosterStudentItem,
  QueryHomeworkParams,
  AttachmentMeta,
} from '../types/homework';

const SAMPLE_HOMEWORKS: HomeworkItem[] = [
  {
    _id: 'hw-101',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101' },
    teacherId: { _id: 't-1', employeeId: 'TCH-001', userId: { name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu' } },
    title: 'Thermodynamics & Heat Transfer Lab Report',
    description: 'Empirical verification of the First Law of Thermodynamics using calorimeter experiments.',
    instructions: 'Submit a typed report containing hypothesis, data tables, error analysis, and conclusions. Follow IEEE format.',
    assignmentType: 'homework',
    assignedDate: '2026-10-18T09:00:00Z',
    publishDate: '2026-10-18T09:00:00Z',
    dueDate: '2026-10-24T23:59:59Z',
    maxMarks: 100,
    isGraded: true,
    attachments: [
      {
        name: 'calorimeter_experiment_guide.pdf',
        url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
        fileType: 'application/pdf',
        sizeBytes: 1542000,
      },
    ],
    resourceLinks: [
      { title: 'OpenStax Physics Ch 14', url: 'https://openstax.org/books/university-physics-volume-2' },
    ],
    submissionSettings: {
      allowLateSubmission: true,
      latePenaltyPercent: 10,
      allowResubmission: true,
      maxSubmissions: 3,
    },
    status: 'published',
    version: 1,
    isOverdue: false,
    createdAt: '2026-10-18T09:00:00Z',
    updatedAt: '2026-10-18T09:00:00Z',
  },
  {
    _id: 'hw-102',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-mat', name: 'Calculus BC', code: 'MTH-201' },
    teacherId: { _id: 't-2', employeeId: 'TCH-002', userId: { name: 'Katherine Johnson', email: 'kjohnson@school.edu' } },
    title: 'Problem Set 6: Implicit Differentiation & Related Rates',
    description: 'Solve questions 1 through 15 on geometric rates of change and spherical expansion.',
    instructions: 'Show all intermediate algebraic steps. Box your final numerical solutions with units.',
    assignmentType: 'homework',
    assignedDate: '2026-10-19T08:00:00Z',
    publishDate: '2026-10-19T08:00:00Z',
    dueDate: '2026-10-23T17:00:00Z',
    maxMarks: 50,
    isGraded: true,
    attachments: [
      {
        name: 'Calculus_PS6_Worksheet.pdf',
        url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
        fileType: 'application/pdf',
        sizeBytes: 420000,
      },
    ],
    resourceLinks: [],
    submissionSettings: {
      allowLateSubmission: false,
      latePenaltyPercent: 0,
      allowResubmission: false,
      maxSubmissions: 1,
    },
    status: 'published',
    version: 1,
    isOverdue: false,
    createdAt: '2026-10-19T08:00:00Z',
    updatedAt: '2026-10-19T08:00:00Z',
  },
  {
    _id: 'hw-103',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-his', name: 'World History', code: 'HIS-101' },
    teacherId: { _id: 't-3', employeeId: 'TCH-003', userId: { name: 'Howard Zinn', email: 'hzinn@school.edu' } },
    title: 'Renaissance & Scientific Revolution Analytical Essay',
    description: 'Examine the socioeconomic impact of the movable-type printing press.',
    instructions: '1,500 word double-spaced essay in Chicago Notes & Bibliography style.',
    assignmentType: 'project',
    assignedDate: '2026-10-15T10:00:00Z',
    publishDate: '2026-10-15T10:00:00Z',
    dueDate: '2026-10-21T18:00:00Z',
    maxMarks: 100,
    isGraded: true,
    attachments: [],
    resourceLinks: [
      { title: 'Primary Source Archive', url: 'https://fordham.edu/halsall/mod/modsbook.asp' },
    ],
    submissionSettings: {
      allowLateSubmission: true,
      latePenaltyPercent: 5,
      allowResubmission: true,
      maxSubmissions: 3,
    },
    status: 'published',
    version: 1,
    isOverdue: true,
    createdAt: '2026-10-15T10:00:00Z',
    updatedAt: '2026-10-15T10:00:00Z',
  },
];

const SAMPLE_ROSTER: RosterStudentItem[] = [
  {
    enrollmentId: 'enr-1',
    studentId: 'stu-101',
    studentName: 'Emma Watson',
    studentEmail: 'emma.watson@student.school.edu',
    admissionNumber: 'ADM-2024-001',
    rollNumber: '10-A-01',
    status: 'graded',
    submission: {
      _id: 'sub-1',
      schoolId: 'school-1',
      homeworkId: 'hw-101',
      studentId: 'stu-101',
      submittedAt: '2026-10-21T14:30:00Z',
      submissionText: 'Completed experimental measurements with 3 trials. Calorimeter heat loss calibrated.',
      attachments: [
        {
          name: 'watson_physics_lab_final.pdf',
          url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
          fileType: 'application/pdf',
          sizeBytes: 850000,
        },
      ],
      status: 'graded',
      isLate: false,
      marksObtained: 96,
      teacherFeedback: 'Exemplary error propagation calculations. Very well written report.',
      isGradeReleased: true,
      revisionNumber: 1,
    },
  },
  {
    enrollmentId: 'enr-2',
    studentId: 'stu-102',
    studentName: 'Liam Alexander Vance',
    studentEmail: 'liam.vance@student.school.edu',
    admissionNumber: 'ADM-2024-002',
    rollNumber: '10-A-02',
    status: 'submitted',
    submission: {
      _id: 'sub-2',
      schoolId: 'school-1',
      homeworkId: 'hw-101',
      studentId: 'stu-102',
      submittedAt: '2026-10-22T08:15:00Z',
      submissionText: 'Raw data attached. Graphs plotted in Python with matplotlib.',
      attachments: [
        {
          name: 'vance_thermo_report.pdf',
          url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
          fileType: 'application/pdf',
          sizeBytes: 1200000,
        },
      ],
      status: 'submitted',
      isLate: false,
      isGradeReleased: false,
      revisionNumber: 1,
    },
  },
  {
    enrollmentId: 'enr-3',
    studentId: 'stu-103',
    studentName: 'Sophia Isabella Chen',
    studentEmail: 'sophia.chen@student.school.edu',
    admissionNumber: 'ADM-2024-003',
    rollNumber: '10-A-03',
    status: 'late',
    submission: {
      _id: 'sub-3',
      schoolId: 'school-1',
      homeworkId: 'hw-101',
      studentId: 'stu-103',
      submittedAt: '2026-10-25T02:10:00Z',
      submissionText: 'Apologies for the slight delay. Encountered lab software glitch during graphing.',
      attachments: [
        {
          name: 'chen_lab_report.pdf',
          url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
          fileType: 'application/pdf',
          sizeBytes: 940000,
        },
      ],
      status: 'late',
      isLate: true,
      isGradeReleased: false,
      revisionNumber: 1,
    },
  },
  {
    enrollmentId: 'enr-4',
    studentId: 'stu-104',
    studentName: 'Noah Ethan Vance',
    studentEmail: 'noah.vance@student.school.edu',
    admissionNumber: 'ADM-2024-004',
    rollNumber: '10-A-04',
    status: 'missing',
    submission: null,
  },
];

export const homeworkService = {
  /**
   * Retrieves assignments list with optional filters
   */
  async getHomeworkList(params?: QueryHomeworkParams): Promise<{
    data: HomeworkItem[];
    pagination?: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      const response = await apiClient.get('/homework', { params });
      if (response.data?.success && response.data?.data) {
        return {
          data: response.data.data,
          pagination: response.data.pagination,
        };
      }
    } catch (err) {
      console.warn('[homeworkService] Using offline homework data fallback:', err);
    }

    let filtered = [...SAMPLE_HOMEWORKS];
    if (params?.status && params.status !== 'all') {
      filtered = filtered.filter((h) => h.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (h) => h.title.toLowerCase().includes(q) || h.instructions.toLowerCase().includes(q)
      );
    }

    return {
      data: filtered,
      pagination: { page: 1, limit: 20, total: filtered.length, pages: 1 },
    };
  },

  /**
   * Retrieves single assignment details
   */
  async getHomeworkById(id: string): Promise<HomeworkItem> {
    try {
      const response = await apiClient.get(`/homework/${id}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] getHomeworkById offline fallback:', err);
    }

    const found = SAMPLE_HOMEWORKS.find((h) => h._id === id);
    if (!found) throw new Error('Assignment not found');
    return found;
  },

  /**
   * Creates a new homework assignment
   */
  async createHomework(payload: Partial<HomeworkItem>): Promise<HomeworkItem> {
    try {
      const response = await apiClient.post('/homework', payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] createHomework offline fallback:', err);
    }

    const newItem: HomeworkItem = {
      _id: `hw-${Date.now()}`,
      schoolId: 'school-1',
      academicSessionId: payload.academicSessionId || 'session-2026',
      classId: payload.classId || 'cls-10',
      sectionId: payload.sectionId || 'sec-10a',
      subjectId: payload.subjectId || 'sub-phy',
      teacherId: payload.teacherId || 't-1',
      title: payload.title || 'Untitled Assignment',
      description: payload.description,
      instructions: payload.instructions || 'Follow assignment guidelines.',
      assignmentType: payload.assignmentType || 'homework',
      assignedDate: new Date().toISOString(),
      publishDate: payload.status === 'published' ? new Date().toISOString() : undefined,
      dueDate: payload.dueDate || new Date(Date.now() + 86400000 * 3).toISOString(),
      maxMarks: payload.maxMarks ?? 100,
      isGraded: payload.isGraded ?? true,
      attachments: payload.attachments || [],
      resourceLinks: payload.resourceLinks || [],
      submissionSettings: payload.submissionSettings || {
        allowLateSubmission: true,
        latePenaltyPercent: 0,
        allowResubmission: false,
        maxSubmissions: 3,
      },
      status: payload.status || 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SAMPLE_HOMEWORKS.unshift(newItem);
    return newItem;
  },

  /**
   * Updates an existing homework assignment
   */
  async updateHomework(id: string, payload: Partial<HomeworkItem>): Promise<HomeworkItem> {
    try {
      const response = await apiClient.patch(`/homework/${id}`, payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] updateHomework offline fallback:', err);
    }

    const idx = SAMPLE_HOMEWORKS.findIndex((h) => h._id === id);
    if (idx !== -1) {
      SAMPLE_HOMEWORKS[idx] = { ...SAMPLE_HOMEWORKS[idx], ...payload, updatedAt: new Date().toISOString() };
      return SAMPLE_HOMEWORKS[idx];
    }
    throw new Error('Assignment not found');
  },

  /**
   * Publishes draft homework
   */
  async publishHomework(id: string): Promise<HomeworkItem> {
    try {
      const response = await apiClient.patch(`/homework/${id}/publish`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] publishHomework offline fallback:', err);
    }

    return this.updateHomework(id, { status: 'published', publishDate: new Date().toISOString() });
  },

  /**
   * Archives homework with mandatory reason
   */
  async archiveHomework(id: string, archiveReason: string): Promise<HomeworkItem> {
    try {
      const response = await apiClient.patch(`/homework/${id}/archive`, { archiveReason });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] archiveHomework offline fallback:', err);
    }

    return this.updateHomework(id, { status: 'archived', archiveReason });
  },

  /**
   * Retrieves submissions roster for an assignment
   */
  async getSubmissionsRoster(homeworkId: string): Promise<{
    data: RosterStudentItem[];
    totalStudents: number;
    submittedCount: number;
  }> {
    try {
      const response = await apiClient.get(`/homework/${homeworkId}/submissions`);
      if (response.data?.success && response.data?.data) {
        return {
          data: response.data.data,
          totalStudents: response.data.totalStudents || response.data.data.length,
          submittedCount: response.data.submittedCount || 0,
        };
      }
    } catch (err) {
      console.warn('[homeworkService] getSubmissionsRoster offline fallback:', err);
    }

    return {
      data: SAMPLE_ROSTER,
      totalStudents: SAMPLE_ROSTER.length,
      submittedCount: SAMPLE_ROSTER.filter((r) => r.submission !== null).length,
    };
  },

  /**
   * Submits student work
   */
  async submitAssignment(
    homeworkId: string,
    payload: { submissionText?: string; attachments?: AttachmentMeta[] }
  ): Promise<SubmissionItem> {
    try {
      const response = await apiClient.post(`/homework/${homeworkId}/submissions`, payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] submitAssignment offline fallback:', err);
    }

    const newSub: SubmissionItem = {
      _id: `sub-${Date.now()}`,
      schoolId: 'school-1',
      homeworkId,
      studentId: 'stu-current',
      submittedAt: new Date().toISOString(),
      submissionText: payload.submissionText,
      attachments: payload.attachments || [],
      status: 'submitted',
      isLate: false,
      isGradeReleased: false,
      revisionNumber: 1,
    };

    return newSub;
  },

  /**
   * Grades a student submission
   */
  async gradeSubmission(
    submissionId: string,
    payload: { marksObtained: number; teacherFeedback?: string; releaseGrade?: boolean }
  ): Promise<SubmissionItem> {
    try {
      const response = await apiClient.patch(`/homework/submissions/${submissionId}/grade`, payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] gradeSubmission offline fallback:', err);
    }

    const r = SAMPLE_ROSTER.find((item) => item.submission?._id === submissionId);
    if (r?.submission) {
      r.submission.marksObtained = payload.marksObtained;
      r.submission.teacherFeedback = payload.teacherFeedback;
      r.submission.status = 'graded';
      if (payload.releaseGrade) {
        r.submission.isGradeReleased = true;
        r.submission.releasedAt = new Date().toISOString();
      }
      return r.submission;
    }

    throw new Error('Submission not found');
  },

  /**
   * Returns a submission to student for revision
   */
  async returnSubmission(submissionId: string, teacherFeedback: string): Promise<SubmissionItem> {
    try {
      const response = await apiClient.patch(`/homework/submissions/${submissionId}/return`, {
        teacherFeedback,
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] returnSubmission offline fallback:', err);
    }

    const r = SAMPLE_ROSTER.find((item) => item.submission?._id === submissionId);
    if (r?.submission) {
      r.submission.status = 'returned';
      r.submission.teacherFeedback = teacherFeedback;
      r.submission.isGradeReleased = true;
      return r.submission;
    }

    throw new Error('Submission not found');
  },

  /**
   * Releases grades in bulk or for an assignment
   */
  async releaseGrades(homeworkId: string, submissionIds?: string[]): Promise<number> {
    try {
      const response = await apiClient.patch(`/homework/${homeworkId}/release-grades`, {
        submissionIds,
      });
      if (response.data?.success) {
        return response.data.modifiedCount || 0;
      }
    } catch (err) {
      console.warn('[homeworkService] releaseGrades offline fallback:', err);
    }

    SAMPLE_ROSTER.forEach((r) => {
      if (r.submission && r.submission.status === 'graded') {
        r.submission.isGradeReleased = true;
        r.submission.releasedAt = new Date().toISOString();
      }
    });

    return 1;
  },

  /**
   * Retrieves aggregate completion stats for an assignment
   */
  async getHomeworkSummary(homeworkId: string): Promise<HomeworkSummaryStats> {
    try {
      const response = await apiClient.get(`/homework/${homeworkId}/summary`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] getHomeworkSummary offline fallback:', err);
    }

    return {
      homeworkId,
      title: 'Thermodynamics & Heat Transfer Lab Report',
      dueDate: '2026-10-24T23:59:59Z',
      isOverdue: false,
      eligibleStudents: 32,
      totalSubmissions: 26,
      submittedCount: 18,
      lateCount: 4,
      gradedCount: 3,
      returnedCount: 1,
      missingCount: 6,
      completionRate: 81,
    };
  },

  /**
   * Uploads attachment
   */
  async uploadAttachment(fileData: {
    name: string;
    mimetype: string;
    size: number;
    base64Data?: string;
  }): Promise<AttachmentMeta> {
    try {
      const response = await apiClient.post('/homework/upload', fileData);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (err) {
      console.warn('[homeworkService] uploadAttachment offline fallback:', err);
    }

    return {
      name: fileData.name,
      url: `/api/v1/homework/files/${Date.now()}/${encodeURIComponent(fileData.name)}`,
      fileType: fileData.mimetype,
      sizeBytes: fileData.size,
    };
  },
};
