import { api } from '../lib/api';
import { ParentItem, PaginationMeta } from '../types/management';

export interface ParentFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface ParentListResponse {
  parents: ParentItem[];
  pagination: PaginationMeta;
}

const FALLBACK_PARENTS: ParentItem[] = [
  {
    _id: 'par-demo-001',
    userId: {
      _id: 'usr-par-001',
      name: 'Elena Martinez',
      firstName: 'Elena',
      lastName: 'Martinez',
      email: 'elena.martinez@gmail.com',
      phone: '+1 555-0192',
      isActive: true,
      role: 'parent',
    },
    schoolId: 'school-demo-1',
    occupation: 'Senior Software Engineer',
    alternatePhone: '+1 555-0193',
    address: '42 Pine Crest Avenue, Greenfield',
    emergencyContact: {
      name: 'Carlos Martinez',
      relationship: 'Brother',
      phone: '+1 555-0194',
    },
    adminNotes: 'Primary contact for Sophia Martinez. Active in Parent-Teacher Association.',
    children: [
      {
        studentProfileId: {
          _id: 'stu-demo-001',
          admissionNumber: 'GIA-9042',
          rollNumber: '101',
          userId: { name: 'Sophia Martinez' },
          currentClassId: { name: 'Grade 9', code: 'G9' },
          currentSectionId: { name: 'Section B', code: 'B' },
          status: 'active',
        },
        relationship: 'mother',
        isPrimary: true,
      },
    ],
    status: 'active',
    createdAt: '2023-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
  {
    _id: 'par-demo-002',
    userId: {
      _id: 'usr-par-002',
      name: 'David Chen',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@gmail.com',
      phone: '+1 555-0112',
      isActive: true,
      role: 'parent',
    },
    schoolId: 'school-demo-1',
    occupation: 'Financial Analyst',
    alternatePhone: '+1 555-0113',
    address: '158 Cedar Brook Road, Greenfield',
    emergencyContact: {
      name: 'Sarah Chen',
      relationship: 'Spouse',
      phone: '+1 555-0114',
    },
    adminNotes: 'Requested quarterly fee invoicing statements via email.',
    children: [
      {
        studentProfileId: {
          _id: 'stu-demo-002',
          admissionNumber: 'GIA-8812',
          rollNumber: '102',
          userId: { name: 'Liam Chen' },
          currentClassId: { name: 'Grade 10', code: 'G10' },
          currentSectionId: { name: 'Section A', code: 'A' },
          status: 'active',
        },
        relationship: 'father',
        isPrimary: true,
      },
    ],
    status: 'active',
    createdAt: '2022-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
  },
];

export const parentService = {
  getParents: async (params?: ParentFilterParams): Promise<ParentListResponse> => {
    try {
      const response = await api.get<ParentListResponse>('/parents', params as Record<string, unknown>);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch parents');
    } catch {
      let filtered = [...FALLBACK_PARENTS];
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.userId.name.toLowerCase().includes(q) ||
            p.userId.email.toLowerCase().includes(q) ||
            p.occupation?.toLowerCase().includes(q)
        );
      }
      if (params?.status) {
        filtered = filtered.filter((p) => p.status === params.status);
      }
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const total = filtered.length;
      return {
        parents: filtered.slice((page - 1) * limit, page * limit),
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

  getParentById: async (id: string): Promise<ParentItem> => {
    try {
      const response = await api.get<ParentItem>(`/parents/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Parent not found');
    } catch {
      return FALLBACK_PARENTS.find((p) => p._id === id) || FALLBACK_PARENTS[0];
    }
  },

  createParent: async (data: Record<string, unknown>): Promise<ParentItem> => {
    const response = await api.post<ParentItem>('/parents', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to create parent');
  },

  updateParent: async (id: string, data: Record<string, unknown>): Promise<ParentItem> => {
    const response = await api.patch<ParentItem>(`/parents/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update parent');
  },

  updateChildren: async (id: string, data: Record<string, unknown>): Promise<ParentItem> => {
    const response = await api.put<ParentItem>(`/parents/${id}/children`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update parent-child relationships');
  },
};
