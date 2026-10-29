import { api } from '../lib/api';
import { StudentItem, PaginationMeta, EnrollmentRecord } from '../types/management';

export interface StudentFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  sectionId?: string;
  academicSessionId?: string;
  status?: string;
  gender?: string;
}

export interface StudentListResponse {
  students: StudentItem[];
  pagination: PaginationMeta;
}

// Fallback preview students for offline development
const FALLBACK_STUDENTS: StudentItem[] = [
  {
    _id: 'stu-demo-001',
    userId: {
      _id: 'usr-stu-001',
      name: 'Sophia Martinez',
      firstName: 'Sophia',
      lastName: 'Martinez',
      email: 'sophia.martinez@greenwood.edu',
      phone: '+1 555-0192',
      isActive: true,
      role: 'student',
    },
    schoolId: 'school-demo-1',
    admissionNumber: 'GIA-9042',
    rollNumber: '101',
    currentClassId: { _id: 'cls-9', name: 'Grade 9', code: 'G9' },
    currentSectionId: { _id: 'sec-9b', name: 'Section B', code: 'B' },
    currentSessionId: { _id: 'sess-2026', name: '2025-2026', code: 'AY-2026', isCurrent: true },
    dateOfBirth: '2011-04-12',
    gender: 'female',
    bloodGroup: 'O+',
    medicalNotes: 'No allergies known. Mild asthmatic symptoms in cold seasons.',
    adminNotes: 'Academic honor roll candidate. Participates in science olympiad.',
    address: '42 Pine Crest Avenue, Greenfield',
    admissionDate: '2023-09-01',
    emergencyContact: {
      name: 'Elena Martinez',
      relationship: 'Mother',
      phone: '+1 555-0193',
    },
    guardians: [],
    status: 'active',
    createdAt: '2023-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
  {
    _id: 'stu-demo-002',
    userId: {
      _id: 'usr-stu-002',
      name: 'Liam Chen',
      firstName: 'Liam',
      lastName: 'Chen',
      email: 'liam.chen@greenwood.edu',
      phone: '+1 555-0112',
      isActive: true,
      role: 'student',
    },
    schoolId: 'school-demo-1',
    admissionNumber: 'GIA-8812',
    rollNumber: '102',
    currentClassId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    currentSectionId: { _id: 'sec-10a', name: 'Section A', code: 'A' },
    currentSessionId: { _id: 'sess-2026', name: '2025-2026', code: 'AY-2026', isCurrent: true },
    dateOfBirth: '2010-08-22',
    gender: 'male',
    bloodGroup: 'A+',
    medicalNotes: 'Nut allergy (epipen in school infirmary).',
    adminNotes: 'School robotics club team captain.',
    address: '158 Cedar Brook Road, Greenfield',
    admissionDate: '2022-09-01',
    emergencyContact: {
      name: 'David Chen',
      relationship: 'Father',
      phone: '+1 555-0113',
    },
    guardians: [],
    status: 'active',
    createdAt: '2022-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
  {
    _id: 'stu-demo-003',
    userId: {
      _id: 'usr-stu-003',
      name: 'Emily Watson',
      firstName: 'Emily',
      lastName: 'Watson',
      email: 'emily.watson@greenwood.edu',
      phone: '+1 555-0349',
      isActive: true,
      role: 'student',
    },
    schoolId: 'school-demo-1',
    admissionNumber: 'GIA-9104',
    rollNumber: '103',
    currentClassId: { _id: 'cls-11', name: 'Grade 11', code: 'G11' },
    currentSectionId: { _id: 'sec-11s', name: 'Section Science', code: 'SCI' },
    currentSessionId: { _id: 'sess-2026', name: '2025-2026', code: 'AY-2026', isCurrent: true },
    dateOfBirth: '2009-11-05',
    gender: 'female',
    bloodGroup: 'B+',
    medicalNotes: 'None',
    adminNotes: 'Debate team representative.',
    address: '88 Oakridge Boulevard, Greenfield',
    admissionDate: '2021-09-01',
    emergencyContact: {
      name: 'Dr. John Watson',
      relationship: 'Father',
      phone: '+1 555-0350',
    },
    guardians: [],
    status: 'active',
    createdAt: '2021-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
];

export const studentService = {
  getStudents: async (params?: StudentFilterParams): Promise<StudentListResponse> => {
    try {
      const response = await api.get<StudentListResponse>('/students', params as Record<string, unknown>);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch students');
    } catch {
      // Fallback for offline development preview
      let filtered = [...FALLBACK_STUDENTS];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.userId.name.toLowerCase().includes(q) ||
            s.admissionNumber.toLowerCase().includes(q) ||
            s.userId.email.toLowerCase().includes(q)
        );
      }
      if (params?.status) {
        filtered = filtered.filter((s) => s.status === params.status);
      }
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const total = filtered.length;
      return {
        students: filtered.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      };
    }
  },

  getStudentById: async (id: string): Promise<StudentItem> => {
    try {
      const response = await api.get<StudentItem>(`/students/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Student not found');
    } catch {
      const found = FALLBACK_STUDENTS.find((s) => s._id === id) || FALLBACK_STUDENTS[0];
      return found;
    }
  },

  getNextAdmissionNumber: async (): Promise<string> => {
    try {
      const response = await api.get<{ nextAdmissionNumber: string }>('/students/next-admission-number');
      if (response.success && response.data?.nextAdmissionNumber) {
        return response.data.nextAdmissionNumber;
      }
      return `ADM-${new Date().getFullYear()}-0043`;
    } catch {
      return `ADM-${new Date().getFullYear()}-0043`;
    }
  },

  createStudent: async (data: Record<string, unknown>): Promise<StudentItem> => {
    const response = await api.post<StudentItem>('/students', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create student');
  },

  updateStudent: async (id: string, data: Record<string, unknown>): Promise<StudentItem> => {
    const response = await api.patch<StudentItem>(`/students/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update student');
  },

  archiveStudent: async (id: string, reason?: string, status = 'inactive'): Promise<{ status: string }> => {
    const response = await api.patch<{ status: string }>(`/students/${id}/archive`, { reason, status });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to archive student');
  },

  createEnrollment: async (studentId: string, data: Record<string, unknown>): Promise<EnrollmentRecord> => {
    const response = await api.post<EnrollmentRecord>(`/students/${studentId}/enrollments`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create enrollment');
  },
};
