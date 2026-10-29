import { apiClient } from '../lib/api';

export interface OnboardingCounts {
  sessionsCount: number;
  classesCount: number;
  sectionsCount: number;
  subjectsCount: number;
  teachersCount: number;
  studentsCount: number;
  parentsCount: number;
  enrollmentsCount: number;
}

export interface OnboardingChecklist {
  profile: boolean;
  academicSession: boolean;
  academicStructure: boolean;
  staffSetup: boolean;
  studentSetup: boolean;
  enrollmentSetup: boolean;
}

export interface SchoolOnboardingData {
  _id: string;
  schoolId: string;
  currentStep: number;
  completedSteps: number[];
  status: 'not_started' | 'in_progress' | 'completed';
  stepsData: Record<string, any>;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStatusResponse {
  onboarding: SchoolOnboardingData;
  counts: OnboardingCounts;
  checklist: OnboardingChecklist;
  readinessPercentage: number;
  school: {
    id?: string;
    name?: string;
    code?: string;
    email?: string;
    phone?: string;
    status?: string;
    logo?: string;
  };
}

export interface ImportPreviewResponse {
  batchId: string;
  importType: 'teachers' | 'students' | 'parents';
  filename: string;
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  previewRows: any[];
  errors: Array<{
    row: number;
    identifier?: string;
    field?: string;
    message: string;
  }>;
}

export interface ImportConfirmResponse {
  success: boolean;
  batchId: string;
  status: 'completed' | 'partial' | 'failed';
  importedCount: number;
  failedCount: number;
  message: string;
}

export interface ImportHistoryItem {
  _id: string;
  batchId: string;
  importType: 'teachers' | 'students' | 'parents';
  filename: string;
  status: 'preview' | 'completed' | 'partial' | 'failed';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  failedRows: number;
  duplicateRows: number;
  errors: Array<{
    row: number;
    identifier?: string;
    field?: string;
    message: string;
  }>;
  summary: string;
  createdAt: string;
  userId?: {
    name: string;
    email: string;
  };
}

export const onboardingService = {
  /**
   * Retrieves onboarding progress and live readiness breakdown
   */
  async getStatus(): Promise<OnboardingStatusResponse> {
    const res = await apiClient.get<{ success: boolean; data: OnboardingStatusResponse }>(
      '/onboarding/status'
    );
    return res.data.data;
  },

  /**
   * Saves partial setup progress for a specific wizard step
   */
  async saveStep(step: number, data: any): Promise<SchoolOnboardingData> {
    const res = await apiClient.put<{ success: boolean; data: SchoolOnboardingData }>(
      '/onboarding/step',
      { step, data }
    );
    return res.data.data;
  },

  /**
   * Validates mandatory requirements and marks onboarding complete
   */
  async completeOnboarding(): Promise<{ success: boolean; message: string; onboarding: SchoolOnboardingData }> {
    const res = await apiClient.post<{
      success: boolean;
      data: { success: boolean; message: string; onboarding: SchoolOnboardingData };
    }>('/onboarding/complete');
    return res.data.data;
  },

  /**
   * Downloads pre-formatted CSV template
   */
  async downloadTemplate(type: 'teachers' | 'students' | 'parents'): Promise<Blob> {
    const res = await apiClient.get(`/onboarding/templates/${type}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Stage A: Uploads and previews CSV file, returning row-level validation errors
   */
  async previewImport(
    importType: 'teachers' | 'students' | 'parents',
    csvContent: string,
    filename: string = 'import.csv'
  ): Promise<ImportPreviewResponse> {
    const res = await apiClient.post<{ success: boolean; data: ImportPreviewResponse }>(
      '/onboarding/import/preview',
      { importType, csvContent, filename }
    );
    return res.data.data;
  },

  /**
   * Stage B: Confirms and commits a validated batch
   */
  async confirmImport(
    batchId: string,
    importType: 'teachers' | 'students' | 'parents'
  ): Promise<ImportConfirmResponse> {
    const res = await apiClient.post<{ success: boolean; data: ImportConfirmResponse }>(
      '/onboarding/import/confirm',
      { batchId, importType }
    );
    return res.data.data;
  },

  /**
   * Retrieves past data import jobs and results
   */
  async getImportHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<{ imports: ImportHistoryItem[]; pagination: any }> {
    const res = await apiClient.get<{
      success: boolean;
      data: { imports: ImportHistoryItem[]; pagination: any };
    }>(`/onboarding/import/history?page=${page}&limit=${limit}`);
    return res.data.data;
  },

  /**
   * Downloads sanitized CSV error report for a rejected/partial batch
   */
  async downloadErrorReport(batchId: string): Promise<Blob> {
    const res = await apiClient.get(`/onboarding/import/errors/${batchId}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};
