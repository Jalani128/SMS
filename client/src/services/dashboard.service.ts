import { apiClient } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import {
  ATTENDANCE_CHART_DATA,
  FEE_COLLECTION_CHART_DATA,
  STUDENT_STATISTICS_BREAKDOWN,
  RECENT_ACTIVITIES,
} from '../data/previewData';

export interface StatItem {
  value: string;
  rawValue: number;
  change?: string;
  isPositive?: boolean;
  description?: string;
}

export interface DashboardStats {
  totalStudents: StatItem;
  totalTeachers: StatItem;
  totalParents: StatItem;
  todayAttendance: StatItem;
  feesCollected: StatItem;
  outstandingFees: StatItem;
}

export interface AttendanceChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension?: number;
    fill?: boolean;
  }>;
  averageRate: string;
}

export interface FeeChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderRadius?: number;
  }>;
  ytdTotal: string;
}

export interface StudentDistributionData {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor: string[];
    borderWidth?: number;
  }>;
  totalEnrolled: number;
}

export interface AcademicPerformanceData {
  hasData: boolean;
  emptyReason?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderRadius?: number;
  }>;
}

export interface RecentAdmission {
  id: string;
  studentName: string;
  admissionNumber: string;
  grade: string;
  date: string;
  status: 'active' | 'pending' | 'review';
}

export interface RecentFeePayment {
  id: string;
  receiptNumber: string;
  studentName: string;
  grade: string;
  amount: number;
  formattedAmount: string;
  method: string;
  date: string;
  status: 'completed' | 'processing';
}

export interface RecentAnnouncement {
  id: string;
  title: string;
  audience: string;
  author: string;
  date: string;
  priority: 'normal' | 'high' | 'urgent';
}

export interface RecentActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badgeText: string;
  badgeVariant: 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline';
  category: 'academic' | 'finance' | 'admission' | 'system';
}

export interface DashboardOverviewData {
  isDevMock: boolean;
  devNotice?: string;
  stats: DashboardStats;
  attendanceTrend: AttendanceChartData;
  feeCollections: FeeChartData;
  studentDistribution: StudentDistributionData;
  academicPerformance: AcademicPerformanceData;
  recentAdmissions: RecentAdmission[];
  recentFeePayments: RecentFeePayment[];
  recentAnnouncements: RecentAnnouncement[];
  recentActivities: RecentActivityItem[];
}

/**
 * Fallback Development Mock Data Generator
 * Formats statistics with the authenticated school's configured currency
 */
export const getDevelopmentMockDashboardData = (currency = 'USD'): DashboardOverviewData => {
  return {
    isDevMock: true,
    devNotice: 'Development Preview Data (Backend analytics endpoint pending Phase 5)',
    stats: {
      totalStudents: {
        value: '1,420',
        rawValue: 1420,
        change: '+5.2%',
        isPositive: true,
        description: 'vs. last semester',
      },
      totalTeachers: {
        value: '84',
        rawValue: 84,
        change: '+2',
        isPositive: true,
        description: 'New faculty onboarded',
      },
      totalParents: {
        value: '1,190',
        rawValue: 1190,
        change: '96.2%',
        isPositive: true,
        description: 'Guardian portal activation',
      },
      todayAttendance: {
        value: '94.8%',
        rawValue: 94.8,
        change: '+0.6%',
        isPositive: true,
        description: 'vs. 30-day moving average',
      },
      feesCollected: {
        value: formatCurrency(284500, currency),
        rawValue: 284500,
        change: '+12.4%',
        isPositive: true,
        description: 'YTD collection progress',
      },
      outstandingFees: {
        value: formatCurrency(36800, currency),
        rawValue: 36800,
        change: '-4.1%',
        isPositive: true, // Lower outstanding is good
        description: 'Overdue invoices balance',
      },
    },
    attendanceTrend: {
      labels: ATTENDANCE_CHART_DATA.labels,
      datasets: ATTENDANCE_CHART_DATA.datasets as any,
      averageRate: '94.8% Average',
    },
    feeCollections: {
      labels: FEE_COLLECTION_CHART_DATA.labels,
      datasets: FEE_COLLECTION_CHART_DATA.datasets as any,
      ytdTotal: formatCurrency(284500, currency) + ' YTD',
    },
    studentDistribution: {
      labels: STUDENT_STATISTICS_BREAKDOWN.labels,
      datasets: STUDENT_STATISTICS_BREAKDOWN.datasets as any,
      totalEnrolled: 1420,
    },
    academicPerformance: {
      hasData: false,
      emptyReason: 'No standardized examination grading cycles published for current term yet.',
      labels: ['Mathematics', 'Science', 'English', 'History', 'Computer Sci'],
      datasets: [
        {
          label: 'Class Average (%)',
          data: [82, 78, 86, 80, 89],
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          borderRadius: 4,
        },
      ],
    },
    recentAdmissions: [
      {
        id: 'adm-01',
        studentName: 'Maya Lin',
        admissionNumber: 'ADM-2026-088',
        grade: 'Grade 9 - Sec A',
        date: 'Today, 10:30 AM',
        status: 'active',
      },
      {
        id: 'adm-02',
        studentName: 'Julian Sterling',
        admissionNumber: 'ADM-2026-089',
        grade: 'Grade 10 - Sec B',
        date: 'Yesterday, 3:15 PM',
        status: 'active',
      },
      {
        id: 'adm-03',
        studentName: 'Amara Okafor',
        admissionNumber: 'ADM-2026-090',
        grade: 'Grade 11 - Science',
        date: 'Oct 18, 2026',
        status: 'review',
      },
      {
        id: 'adm-04',
        studentName: 'Ethan Bradley',
        admissionNumber: 'ADM-2026-091',
        grade: 'Grade 8 - Sec C',
        date: 'Oct 17, 2026',
        status: 'active',
      },
    ],
    recentFeePayments: [
      {
        id: 'pay-01',
        receiptNumber: 'RCPT-9821',
        studentName: 'Liam Chen',
        grade: 'Grade 10-A',
        amount: 1250,
        formattedAmount: formatCurrency(1250, currency),
        method: 'Stripe Online',
        date: 'Today, 11:42 AM',
        status: 'completed',
      },
      {
        id: 'pay-02',
        receiptNumber: 'RCPT-9820',
        studentName: 'Sophie Davis',
        grade: 'Grade 9-B',
        amount: 850,
        formattedAmount: formatCurrency(850, currency),
        method: 'Bank Wire',
        date: 'Today, 09:15 AM',
        status: 'completed',
      },
      {
        id: 'pay-03',
        receiptNumber: 'RCPT-9819',
        studentName: 'Lucas Vance',
        grade: 'Grade 12-Sci',
        amount: 1500,
        formattedAmount: formatCurrency(1500, currency),
        method: 'Debit Card',
        date: 'Yesterday, 4:20 PM',
        status: 'completed',
      },
      {
        id: 'pay-04',
        receiptNumber: 'RCPT-9818',
        studentName: 'Chloe Bennett',
        grade: 'Grade 11-Arts',
        amount: 900,
        formattedAmount: formatCurrency(900, currency),
        method: 'Cash Voucher',
        date: 'Oct 18, 2026',
        status: 'completed',
      },
    ],
    recentAnnouncements: [
      {
        id: 'anc-01',
        title: 'Mid-Term Examination Schedule & Guidelines',
        audience: 'All Students & Parents',
        author: 'Principal Office',
        date: 'Today, 08:00 AM',
        priority: 'high',
      },
      {
        id: 'anc-02',
        title: 'Annual STEM Science Fair Registrations Open',
        audience: 'Faculty & High School',
        author: 'Science Department',
        date: 'Yesterday',
        priority: 'normal',
      },
      {
        id: 'anc-03',
        title: 'Campus Emergency Drill Scheduled for Thursday',
        audience: 'All Campus Staff',
        author: 'Operations Admin',
        date: 'Oct 17, 2026',
        priority: 'urgent',
      },
    ],
    recentActivities: RECENT_ACTIVITIES.map((act) => ({
      id: act.id,
      title: act.title,
      description: act.description,
      timestamp: act.timestamp,
      badgeText: act.badgeText,
      badgeVariant: act.badgeVariant as any,
      category: ((act as any).category || act.type || 'system') as any,
    })),
  };
};

/**
 * Modular Dashboard API Service
 * Queries live backend endpoint when available; gracefully falls back
 * to typed development mock data if backend route is not yet implemented.
 */
export const dashboardService = {
  getOverview: async (
    currency = 'USD',
    signal?: AbortSignal
  ): Promise<DashboardOverviewData> => {
    try {
      // Attempt to fetch from real authorized backend analytics endpoint
      const response = await apiClient.get<{
        success: boolean;
        data: DashboardOverviewData;
      }>('/admin/dashboard/overview', { signal });

      if (response.data && response.data.data) {
        return {
          ...response.data.data,
          isDevMock: false,
        };
      }
    } catch (error: any) {
      // Cancelled requests should propagate to abort hook processing
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        throw error;
      }
      // If endpoint returns 404 Not Found or offline, fall back to labeled dev mock
    }

    // Return cleanly labeled development mock data
    return getDevelopmentMockDashboardData(currency);
  },
};
