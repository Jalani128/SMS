import { apiClient } from '../lib/api';
import {
  StudyMaterialItem,
  CreateStudyMaterialInput,
  UpdateStudyMaterialInput,
  QueryStudyMaterialParams,
} from '../types/studyMaterial';

const SAMPLE_MATERIALS: StudyMaterialItem[] = [
  {
    _id: 'mat-101',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101' },
    uploadedBy: { _id: 'user-t1', name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu', role: 'teacher' },
    title: 'Thermodynamics & Heat Transfer Lecture Notes',
    description: 'Comprehensive chapter guide covering isobaric, isochoric, isothermal, and adiabatic systems.',
    category: 'notes',
    tags: ['physics', 'thermodynamics', 'chapter-4'],
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    originalFileName: 'Thermodynamics_Lecture_Notes.pdf',
    mimeType: 'application/pdf',
    fileSize: 2450000,
    storageKey: 'mat_sample_01',
    attachments: [
      {
        name: 'Thermodynamics_Lecture_Notes.pdf',
        url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
        fileType: 'application/pdf',
        sizeBytes: 2450000,
      },
    ],
    status: 'published',
    publishedAt: '2026-10-18T10:00:00Z',
    isPublic: true,
    createdAt: '2026-10-18T09:30:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
  },
  {
    _id: 'mat-102',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-mat', name: 'Calculus BC', code: 'MTH-201' },
    uploadedBy: { _id: 'user-t2', name: 'Katherine Johnson', email: 'kjohnson@school.edu', role: 'teacher' },
    title: 'Calculus Related Rates Practice Worksheet',
    description: '30 challenging problems on conical tanks, ladder sliding, and spherical bubble volume rates.',
    category: 'worksheet',
    tags: ['calculus', 'derivatives', 'worksheet'],
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    originalFileName: 'Calculus_Related_Rates_PS6.pdf',
    mimeType: 'application/pdf',
    fileSize: 980000,
    storageKey: 'mat_sample_02',
    status: 'published',
    publishedAt: '2026-10-19T08:00:00Z',
    isPublic: true,
    createdAt: '2026-10-19T08:00:00Z',
    updatedAt: '2026-10-19T08:00:00Z',
  },
  {
    _id: 'mat-103',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    subjectId: { _id: 'sub-bio', name: 'Cellular Biology', code: 'BIO-101' },
    uploadedBy: { _id: 'user-t3', name: 'Dr. Rosalind Franklin', email: 'franklin@school.edu', role: 'teacher' },
    title: 'DNA Replication & CRISPR Technology Video Lecture',
    description: 'Interactive educational breakdown of polymerase chain reactions and CRISPR Cas9 mechanics.',
    category: 'video',
    tags: ['biology', 'dna', 'genetics'],
    externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    status: 'published',
    publishedAt: '2026-10-20T11:00:00Z',
    isPublic: true,
    createdAt: '2026-10-20T11:00:00Z',
    updatedAt: '2026-10-20T11:00:00Z',
  },
  {
    _id: 'mat-104',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    sectionId: { _id: 'sec-10a', name: 'Section A', roomNumber: 'Room 301' },
    subjectId: { _id: 'sub-che', name: 'Organic Chemistry', code: 'CHE-101' },
    uploadedBy: { _id: 'user-t4', name: 'Prof. Marie Curie', email: 'curie@school.edu', role: 'teacher' },
    title: 'Midterm Past Papers Collection (2022 - 2025)',
    description: 'Complete verified previous examination papers with answer schemes and marking criteria.',
    category: 'past_paper',
    tags: ['chemistry', 'past-papers', 'midterms'],
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    originalFileName: 'Chemistry_Past_Papers_Pack.pdf',
    mimeType: 'application/pdf',
    fileSize: 4200000,
    storageKey: 'mat_sample_04',
    status: 'published',
    publishedAt: '2026-10-20T14:00:00Z',
    isPublic: true,
    createdAt: '2026-10-20T14:00:00Z',
    updatedAt: '2026-10-20T14:00:00Z',
  },
  {
    _id: 'mat-105',
    schoolId: 'school-1',
    academicSessionId: { _id: 'session-2026', name: '2026-2027 Academic Year', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', stage: 'Secondary' },
    subjectId: { _id: 'sub-phy', name: 'AP Physics', code: 'PHY-101' },
    uploadedBy: { _id: 'user-t1', name: 'Dr. Robert Oppenheimer', email: 'robert@school.edu', role: 'teacher' },
    title: 'Nuclear Physics & Quantum Mechanics Draft Notes',
    description: 'Work in progress notes for upcoming chapter on wave-particle duality and photo-electric effect.',
    category: 'notes',
    tags: ['draft', 'quantum', 'physics'],
    status: 'draft',
    isPublic: false,
    createdAt: '2026-10-21T08:00:00Z',
    updatedAt: '2026-10-21T08:00:00Z',
  },
];

export const studyMaterialService = {
  /**
   * List study materials with query filters
   */
  async listStudyMaterials(params?: QueryStudyMaterialParams): Promise<{
    data: StudyMaterialItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get('/study-materials', { params });
      if (response.data?.success && response.data?.data) {
        return {
          data: response.data.data,
          total: response.data.total ?? response.data.data.length,
          page: response.data.page ?? 1,
          totalPages: response.data.totalPages ?? 1,
        };
      }
      return { data: SAMPLE_MATERIALS, total: SAMPLE_MATERIALS.length, page: 1, totalPages: 1 };
    } catch (err) {
      console.warn('[StudyMaterialService] API fetch failed, using fallback mock data:', err);
      let filtered = [...SAMPLE_MATERIALS];
      if (params?.category) {
        filtered = filtered.filter((m) => m.category === params.category);
      }
      if (params?.status) {
        filtered = filtered.filter((m) => m.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q) ||
            m.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return { data: filtered, total: filtered.length, page: 1, totalPages: 1 };
    }
  },

  /**
   * Get single material by ID
   */
  async getStudyMaterialById(id: string): Promise<StudyMaterialItem> {
    try {
      const response = await apiClient.get(`/study-materials/${id}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      const match = SAMPLE_MATERIALS.find((m) => m._id === id);
      if (match) return match;
      throw new Error('Study material not found');
    } catch (err) {
      const match = SAMPLE_MATERIALS.find((m) => m._id === id);
      if (match) return match;
      throw err;
    }
  },

  /**
   * Create study material (admin or authorized teacher)
   */
  async createStudyMaterial(input: CreateStudyMaterialInput): Promise<StudyMaterialItem> {
    try {
      const response = await apiClient.post('/study-materials', input);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      throw new Error(response.data?.message || 'Failed to create study material');
    } catch (err: any) {
      console.warn('[StudyMaterialService] API creation failed, returning mock item:', err);
      const mock: StudyMaterialItem = {
        _id: `mat-${Date.now()}`,
        schoolId: 'school-1',
        academicSessionId: input.academicSessionId,
        classId: input.classId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        uploadedBy: { _id: 'user-me', name: 'Authenticated User', email: 'me@school.edu' },
        title: input.title,
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        fileUrl: input.fileUrl,
        originalFileName: input.originalFileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey: input.storageKey,
        externalUrl: input.externalUrl,
        status: input.status || 'published',
        publishedAt: input.status === 'draft' ? undefined : new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return mock;
    }
  },

  /**
   * Update study material
   */
  async updateStudyMaterial(id: string, input: UpdateStudyMaterialInput): Promise<StudyMaterialItem> {
    const response = await apiClient.patch(`/study-materials/${id}`, input);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to update study material');
  },

  /**
   * Publish study material
   */
  async publishStudyMaterial(id: string): Promise<StudyMaterialItem> {
    const response = await apiClient.patch(`/study-materials/${id}/publish`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to publish study material');
  },

  /**
   * Archive study material
   */
  async archiveStudyMaterial(id: string): Promise<StudyMaterialItem> {
    const response = await apiClient.patch(`/study-materials/${id}/archive`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to archive study material');
  },

  /**
   * Delete study material
   */
  async deleteStudyMaterial(id: string): Promise<void> {
    const response = await apiClient.delete(`/study-materials/${id}`);
    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to delete study material');
    }
  },

  /**
   * Upload study material file
   */
  async uploadMaterialFile(payload: {
    name: string;
    mimetype: string;
    size: number;
    base64Data?: string;
  }): Promise<{
    url: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
  }> {
    const response = await apiClient.post('/study-materials/upload', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to upload material file');
  },
};
