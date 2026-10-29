import { api } from '../lib/api';
import { TeacherItem, PaginationMeta } from '../types/management';

export interface TeacherFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  designation?: string;
  status?: string;
}

export interface TeacherListResponse {
  teachers: TeacherItem[];
  pagination: PaginationMeta;
}

const FALLBACK_TEACHERS: TeacherItem[] = [
  {
    _id: 'tch-demo-001',
    userId: {
      _id: 'usr-tch-001',
      name: 'Dr. Robert Langdon',
      firstName: 'Robert',
      lastName: 'Langdon',
      email: 'robert.langdon@greenwood.edu',
      phone: '+1 555-0141',
      isActive: true,
      role: 'teacher',
    },
    schoolId: 'school-demo-1',
    employeeId: 'TCH-1001',
    department: 'History',
    designation: 'Senior Faculty',
    qualification: 'Ph.D. in World History, Harvard University',
    specializations: ['Ancient Civilizations', 'European Renaissance'],
    joiningDate: '2019-08-15',
    experienceYears: 12,
    bio: 'Published author and department coordinator with over a decade of secondary school teaching.',
    adminNotes: 'Appointed Lead of Academic Curriculum Committee for 2025-2026.',
    status: 'active',
    createdAt: '2019-08-15T08:00:00Z',
    updatedAt: '2026-08-15T08:00:00Z',
  },
  {
    _id: 'tch-demo-002',
    userId: {
      _id: 'usr-tch-002',
      name: 'Sarah Connor',
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@greenwood.edu',
      phone: '+1 555-0142',
      isActive: true,
      role: 'teacher',
    },
    schoolId: 'school-demo-1',
    employeeId: 'TCH-1002',
    department: 'Science',
    designation: 'Department Head',
    qualification: 'M.Sc. Physics, M.Ed.',
    specializations: ['Physics', 'Applied Mechanics', 'Robotics'],
    joiningDate: '2020-01-10',
    experienceYears: 9,
    bio: 'STEM club advisor with expertise in laboratory safety and hands-on scientific projects.',
    adminNotes: 'Organized annual inter-school science exhibition.',
    status: 'active',
    createdAt: '2020-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    _id: 'tch-demo-003',
    userId: {
      _id: 'usr-tch-003',
      name: 'Alan Turing',
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan.turing@greenwood.edu',
      phone: '+1 555-0143',
      isActive: true,
      role: 'teacher',
    },
    schoolId: 'school-demo-1',
    employeeId: 'TCH-1003',
    department: 'Computer Science',
    designation: 'Faculty Instructor',
    qualification: 'M.Tech Computer Science',
    specializations: ['Python', 'Web Development', 'Algorithms'],
    joiningDate: '2021-06-01',
    experienceYears: 7,
    bio: 'Passionate about introducing high school students to modern computational thinking and software engineering.',
    adminNotes: 'Supervises computer laboratories and coding club.',
    status: 'active',
    createdAt: '2021-06-01T08:00:00Z',
    updatedAt: '2026-06-01T08:00:00Z',
  },
];

export const teacherService = {
  getTeachers: async (params?: TeacherFilterParams): Promise<TeacherListResponse> => {
    try {
      const response = await api.get<TeacherListResponse>('/teachers', params as Record<string, unknown>);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch teachers');
    } catch {
      let filtered = [...FALLBACK_TEACHERS];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.userId.name.toLowerCase().includes(q) ||
            t.employeeId.toLowerCase().includes(q) ||
            t.department.toLowerCase().includes(q) ||
            t.userId.email.toLowerCase().includes(q)
        );
      }
      if (params?.status) {
        filtered = filtered.filter((t) => t.status === params.status);
      }
      if (params?.department) {
        filtered = filtered.filter((t) => t.department === params.department);
      }
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const total = filtered.length;
      return {
        teachers: filtered.slice((page - 1) * limit, page * limit),
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

  getTeacherById: async (id: string): Promise<TeacherItem> => {
    try {
      const response = await api.get<TeacherItem>(`/teachers/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Teacher not found');
    } catch {
      return FALLBACK_TEACHERS.find((t) => t._id === id) || FALLBACK_TEACHERS[0];
    }
  },

  createTeacher: async (data: Record<string, unknown>): Promise<TeacherItem> => {
    const response = await api.post<TeacherItem>('/teachers', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create teacher');
  },

  updateTeacher: async (id: string, data: Record<string, unknown>): Promise<TeacherItem> => {
    const response = await api.patch<TeacherItem>(`/teachers/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update teacher');
  },

  archiveTeacher: async (id: string, reason?: string, status = 'resigned'): Promise<{ status: string }> => {
    const response = await api.patch<{ status: string }>(`/teachers/${id}/archive`, { reason, status });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to archive teacher');
  },
};
