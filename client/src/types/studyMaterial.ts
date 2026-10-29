export type MaterialCategory =
  | 'notes'
  | 'pdf'
  | 'worksheet'
  | 'past_paper'
  | 'assignment_resource'
  | 'presentation'
  | 'video'
  | 'external_link'
  | 'other';

export type MaterialStatus = 'draft' | 'published' | 'archived';

export interface AttachmentMeta {
  name: string;
  url: string;
  fileType: string;
  sizeBytes: number;
  storageKey?: string;
}

export interface StudyMaterialItem {
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
  sectionId?: {
    _id: string;
    name: string;
    roomNumber?: string;
  } | string;
  subjectId: {
    _id: string;
    name: string;
    code?: string;
  } | string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  } | string;
  title: string;
  description?: string;
  category: MaterialCategory;
  tags: string[];
  fileUrl?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageKey?: string;
  attachments?: AttachmentMeta[];
  externalUrl?: string;
  status: MaterialStatus;
  publishedAt?: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudyMaterialInput {
  title: string;
  description?: string;
  academicSessionId: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  category: MaterialCategory;
  tags?: string[];
  fileUrl?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageKey?: string;
  externalUrl?: string;
  status?: MaterialStatus;
}

export interface UpdateStudyMaterialInput {
  title?: string;
  description?: string;
  academicSessionId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  category?: MaterialCategory;
  tags?: string[];
  fileUrl?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageKey?: string;
  externalUrl?: string;
  status?: MaterialStatus;
}

export interface QueryStudyMaterialParams {
  academicSessionId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  category?: MaterialCategory;
  status?: MaterialStatus;
  search?: string;
  studentId?: string; // For parents viewing a specific ward
  page?: number;
  limit?: number;
}
