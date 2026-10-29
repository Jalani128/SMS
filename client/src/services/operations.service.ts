import { api } from '../lib/api';

export interface OperationsDashboardData {
  timezone: string;
  currentDate: string;
  isWorkingDay: boolean;
  attendance: {
    classesTotal: number;
    classesMarked: number;
    classesMissing: number;
    completionPercentage: number;
    missingClasses: Array<{
      classId: string;
      className: string;
      sectionId?: string;
      sectionName?: string;
      assignedTeacher?: {
        id: string;
        name: string;
        email?: string;
      };
    }>;
  };
  finance: {
    overdueInvoicesCount: number;
    overdueAmount: number;
    dueSoonInvoicesCount: number;
    dueSoonAmount: number;
    currency: string;
  };
  academic: {
    pendingHomeworkReviews: number;
    upcomingExamsCount: number;
    missingMarksExamsCount: number;
    upcomingExams: Array<{
      id: string;
      name: string;
      startDate: string;
      examType: string;
      className?: string;
    }>;
  };
  tasks: {
    openCount: number;
    urgentCount: number;
    overdueCount: number;
    recentTasks: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      dueDate?: string;
      assignedToName?: string;
    }>;
  };
  approvals: {
    pendingCount: number;
    recentApprovals: Array<{
      id: string;
      type: string;
      title: string;
      priority: string;
      requestedByName?: string;
      createdAt: string;
    }>;
  };
  userActivation: {
    inactiveUsersCount: number;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    targetResource: string;
    actorName?: string;
    actorRole?: string;
    timestamp: string;
  }>;
}

export interface IOperationalTaskItem {
  _id: string;
  title: string;
  description?: string;
  category: 'attendance' | 'fees' | 'academic' | 'administrative' | 'maintenance' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  completionNotes?: string;
  completedAt?: string;
  createdAt: string;
}

export interface IApprovalRequestItem {
  _id: string;
  type:
    | 'staff_activation'
    | 'student_record_correction'
    | 'fee_concession'
    | 'exam_mark_correction'
    | 'general_request';
  title: string;
  description?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  targetModel?: string;
  targetId?: string;
  reviewedBy?: {
    _id: string;
    name: string;
  };
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
}

export interface TaskListResponse {
  tasks: IOperationalTaskItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApprovalListResponse {
  approvals: IApprovalRequestItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const OperationsService = {
  /**
   * Fetch aggregated daily operations dashboard
   */
  async getDashboard(): Promise<OperationsDashboardData> {
    const res = await api.get<OperationsDashboardData>('/operations/dashboard');
    return res.data;
  },

  /**
   * Fetch operational tasks list with filters
   */
  async getTasks(params?: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TaskListResponse> {
    const res = await api.get<TaskListResponse>('/operations/tasks', params as Record<string, unknown>);
    return res.data;
  },

  /**
   * Create an operational task
   */
  async createTask(data: {
    title: string;
    description?: string;
    category: string;
    priority: string;
    dueDate?: string;
    assignedTo: string;
    relatedEntity?: { entityType?: string; entityId?: string };
  }): Promise<IOperationalTaskItem> {
    const res = await api.post<IOperationalTaskItem>('/operations/tasks', data);
    return res.data;
  },

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    data: { status: string; completionNotes?: string }
  ): Promise<IOperationalTaskItem> {
    const res = await api.patch<IOperationalTaskItem>(`/operations/tasks/${taskId}/status`, data);
    return res.data;
  },

  /**
   * Delete an operational task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const res = await api.delete<{ deleted: boolean }>(`/operations/tasks/${taskId}`);
    return !!res.data?.deleted;
  },

  /**
   * Fetch approval requests list with filters
   */
  async getApprovals(params?: {
    status?: string;
    type?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<ApprovalListResponse> {
    const res = await api.get<ApprovalListResponse>('/operations/approvals', params as Record<string, unknown>);
    return res.data;
  },

  /**
   * Submit an administrative approval request
   */
  async createApproval(data: {
    type: string;
    title: string;
    description?: string;
    reason: string;
    priority: string;
    targetModel?: string;
    targetId?: string;
    payload?: Record<string, any>;
  }): Promise<IApprovalRequestItem> {
    const res = await api.post<IApprovalRequestItem>('/operations/approvals', data);
    return res.data;
  },

  /**
   * Review (approve or reject) an administrative request
   */
  async reviewApproval(
    approvalId: string,
    data: { action: 'approved' | 'rejected'; reviewNotes?: string }
  ): Promise<IApprovalRequestItem> {
    const res = await api.patch<IApprovalRequestItem>(
      `/operations/approvals/${approvalId}/review`,
      data
    );
    return res.data;
  },

  /**
   * Trigger full daily operations automation check
   */
  async runDailyAutomation(types?: string[]): Promise<{
    attendanceRemindersSent: number;
    feeRemindersSent: number;
    homeworkRemindersSent: number;
    timestamp: string;
  }> {
    const res = await api.post<any>('/operations/automation/run-daily-check', { types });
    return res.data;
  },

  /**
   * Trigger attendance reminders for missing classes
   */
  async triggerAttendanceReminders(): Promise<{
    sentRemindersCount: number;
    missingClassesCount: number;
    isWorkingDay: boolean;
  }> {
    const res = await api.post<any>('/operations/reminders/attendance', {});
    return res.data;
  },

  /**
   * Trigger fee reminders for overdue invoices
   */
  async triggerFeeReminders(): Promise<{
    overdueRemindersCount: number;
    dueSoonRemindersCount: number;
  }> {
    const res = await api.post<any>('/operations/reminders/fees', {});
    return res.data;
  },
};
