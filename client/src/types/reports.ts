export interface ReportFilterQuery {
  academicSessionId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  examId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
  timeframe?: 'today' | 'week' | 'month' | 'term' | 'year' | 'custom';
  page?: number;
  limit?: number;
  format?: 'json' | 'csv';
}

export interface DashboardAnalyticsResponse {
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  entityCounts: {
    students: number;
    teachers: number;
    classes: number;
    sections: number;
  };
  attendance: {
    todayTotal: number;
    todayPresent: number;
    todayAttendanceRate: number;
    trends: Array<{
      date: string;
      total: number;
      present: number;
      rate: number;
    }>;
  };
  finances: {
    grossCollected: number;
    netCollected: number;
    refunds: number;
    outstandingBalance: number;
    overdueBalance: number;
    unpaidInvoicesCount: number;
    overdueInvoicesCount: number;
  } | null;
  academics: {
    evaluatedCount: number;
    passedCount: number;
    averagePercentage: number;
    passRate: number;
  };
  homework: {
    totalSubmissions: number;
    lateSubmissions: number;
    gradedSubmissions: number;
  };
}

export interface AttendanceReportResponse {
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRecordedDays: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    attendanceRate: number;
  };
  dailyTrends: Array<{
    date: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    rate: number;
  }>;
  classSummaries: Array<{
    classId: string;
    className: string;
    total: number;
    present: number;
    absent: number;
    attendanceRate: number;
  }>;
  frequentAbsentees: Array<{
    studentId: string;
    admissionNumber: string;
    studentName: string;
    absenceCount: number;
  }>;
}

export interface FeeFinanceReportResponse {
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  collections: {
    grossCollected: number;
    netCollected: number;
    refunds: number;
    successfulTransactions: number;
    refundedTransactions: number;
    collectionRatePercentage: number;
  };
  invoicing: {
    totalInvoicedAmount: number;
    totalOutstandingBalance: number;
    totalOverdueBalance: number;
    invoiceCountsByStatus: Record<string, number>;
  };
  paymentMethods: Array<{
    method: string;
    amount: number;
  }>;
}

export interface StudentEnrollmentReportResponse {
  summary: {
    totalActiveStudents: number;
    totalStudentsAcrossAllStatuses: number;
    statusDistribution: Record<string, number>;
  };
  cohortDistribution: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    studentCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalRecords: number;
  };
  students: Array<{
    studentId: string;
    admissionNumber: string;
    name: string;
    email: string;
    class: string;
    section: string;
    status: string;
    admissionDate: string;
  }>;
}

export interface AcademicPerformanceReportResponse {
  performanceSummary: {
    totalEvaluatedAssessments: number;
    passedCount: number;
    failedCount: number;
    passRatePercentage: number;
    averagePercentage: number;
    highestPercentage: number;
    lowestPercentage: number;
  };
  gradeDistribution: Array<{
    grade: string;
    count: number;
  }>;
}

export interface HomeworkReportResponse {
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  assignmentsCount: number;
  submissions: {
    totalUniqueSubmissions: number;
    onTimeSubmissions: number;
    lateSubmissions: number;
    gradedSubmissions: number;
  };
}

export interface SingleStudentReportResponse {
  profile: {
    studentId: string;
    admissionNumber: string;
    name: string;
    class: string;
    section: string;
    status: string;
  };
  attendance: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    attendanceRate: number;
  };
  academics: Array<{
    examName: string;
    marksObtained?: number;
    maxMarks: number;
    percentage?: number;
    grade: string;
    isPassed?: boolean;
    isAbsent: boolean;
  }>;
  fees: {
    totalInvoiced: number;
    outstandingBalance: number;
    invoices: Array<{
      invoiceNumber: string;
      balance: number;
      status: string;
      dueDate: string;
    }>;
  } | null;
}

export interface AdvancedAnalyticsResponse {
  reportingPeriod: {
    startDate: string;
    endDate: string;
  };
  comparisonPeriod: {
    startDate: string;
    endDate: string;
  };
  enrollment: {
    totalActiveStudents: number;
    totalEnrolledAllTime: number;
    newAdmissionsCurrent: number;
    newAdmissionsPrior: number;
    admissionsGrowthPercentage: number;
    statusBreakdown: Record<string, number>;
    cohortDistribution: Array<{
      className: string;
      studentCount: number;
    }>;
  };
  attendance: {
    currentAttendanceRate: number;
    priorAttendanceRate: number;
    attendanceRateDelta: number;
    statusCounts: {
      present: number;
      late: number;
      absent: number;
      leave: number;
      total: number;
    };
    classWiseAttendance: Array<{
      classId: string;
      className: string;
      rate: number;
      total: number;
      present: number;
    }>;
    lowAttendanceCount: number;
    threshold: number;
  };
  finances: {
    currency: string;
    grossCollected: number;
    netCollected: number;
    refunds: number;
    priorNetCollected: number;
    collectionGrowthPercentage: number;
    totalInvoiced: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueInvoicesCount: number;
    paymentMethods: Array<{
      method: string;
      amount: number;
      count: number;
    }>;
  } | null;
  academics: {
    totalEvaluated: number;
    passedAssessments: number;
    averageScore: number;
    passRatePercentage: number;
    highestScore: number;
    lowestScore: number;
    gradeDistribution: Array<{
      grade: string;
      count: number;
    }>;
    supportRequiredCount: number;
  };
  homework: {
    publishedAssignmentsCount: number;
    totalSubmissions: number;
    onTimeSubmissions: number;
    lateSubmissions: number;
    gradedSubmissions: number;
    pendingGradingCount: number;
  };
  operations: {
    activeTeachersCount: number;
    openTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
    pendingApprovalsCount: number;
  } | null;
  insights: Array<{
    category: 'attendance' | 'finances' | 'academics' | 'homework' | 'operations';
    title: string;
    observation: string;
    trend: 'positive' | 'negative' | 'neutral';
  }>;
}
