/**
 * ============================================================================
 * EDU-MANAGE PHASE 1 UI PREVIEW DATA (MOCK DATASET)
 * ============================================================================
 * 
 * NOTICE:
 * All data in this file is strictly for UI mockup, presentation, and frontend
 * layout preview purposes during Phase 1.
 * 
 * In Phase 2, this mock data will be replaced with real MongoDB Mongoose queries
 * fetched via the authenticated API service layer with multi-tenant schoolId scoping.
 * ============================================================================
 */

export interface SchoolInfoPreview {
  id: string;
  name: string;
  code: string;
  academicYear: string;
  currency: string;
  logo: string;
  address: string;
}

export const PREVIEW_SCHOOL: SchoolInfoPreview = {
  id: 'school_demo_greenwood_001',
  name: 'Greenwood International Academy',
  code: 'GIA-2026',
  academicYear: '2026 - 2027 (Term 1)',
  currency: 'USD',
  logo: '🏫',
  address: '450 Innovation Parkway, Silicon Valley, CA',
};

export interface AdminStatMetric {
  title: string;
  value: string;
  numericValue: number;
  change: string;
  isPositive: boolean;
  description: string;
  iconName: 'users' | 'graduation-cap' | 'dollar-sign' | 'calendar-check' | 'book-open';
}

export const ADMIN_ANALYTICS_CARDS: AdminStatMetric[] = [
  {
    title: 'Total Students',
    value: '1,420',
    numericValue: 1420,
    change: '+5.2%',
    isPositive: true,
    description: 'vs. previous academic term',
    iconName: 'graduation-cap',
  },
  {
    title: 'Total Faculty & Staff',
    value: '84',
    numericValue: 84,
    change: '+2.4%',
    isPositive: true,
    description: 'Active teaching members',
    iconName: 'users',
  },
  {
    title: 'Total Fees Collected',
    value: '$284,500',
    numericValue: 284500,
    change: '+12.8%',
    isPositive: true,
    description: '89.4% collection target achieved',
    iconName: 'dollar-sign',
  },
  {
    title: 'Average Attendance',
    value: '94.8%',
    numericValue: 94.8,
    change: '+1.1%',
    isPositive: true,
    description: 'Last 30 school days',
    iconName: 'calendar-check',
  },
  {
    title: 'Active Classrooms',
    value: '42',
    numericValue: 42,
    change: '0%',
    isPositive: true,
    description: 'Across Grades 1 to 12',
    iconName: 'book-open',
  },
];

export const ATTENDANCE_CHART_DATA = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  datasets: [
    {
      label: 'This Week (%)',
      data: [95.2, 94.8, 96.1, 93.9, 94.2],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: 'Last Week Average (%)',
      data: [93.5, 93.8, 94.0, 92.5, 93.1],
      borderColor: 'rgb(156, 163, 175)',
      borderDash: [5, 5],
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
    },
  ],
};

export const FEE_COLLECTION_CHART_DATA = {
  labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  datasets: [
    {
      label: 'Collected ($)',
      data: [42000, 48500, 52000, 39000, 58000, 45000],
      backgroundColor: 'rgba(16, 185, 129, 0.85)',
      borderRadius: 6,
    },
    {
      label: 'Projected Target ($)',
      data: [45000, 50000, 50000, 42000, 60000, 50000],
      backgroundColor: 'rgba(229, 231, 235, 0.8)',
      borderRadius: 6,
    },
  ],
};

export const STUDENT_STATISTICS_BREAKDOWN = {
  labels: ['Primary (Grades 1-5)', 'Middle (Grades 6-8)', 'Secondary (Grades 9-10)', 'Senior High (Grades 11-12)'],
  datasets: [
    {
      data: [480, 360, 320, 260],
      backgroundColor: [
        'rgba(59, 130, 246, 0.85)',
        'rgba(16, 185, 129, 0.85)',
        'rgba(245, 158, 11, 0.85)',
        'rgba(139, 92, 246, 0.85)',
      ],
      borderWidth: 1,
      borderColor: '#ffffff',
    },
  ],
};

export interface ActivityFeedItem {
  id: string;
  type: 'enrollment' | 'fee' | 'attendance' | 'exam' | 'notice';
  title: string;
  description: string;
  timestamp: string;
  badgeText: string;
  badgeVariant: 'success' | 'warning' | 'info' | 'destructive' | 'neutral';
}

export const RECENT_ACTIVITIES: ActivityFeedItem[] = [
  {
    id: 'act-001',
    type: 'enrollment',
    title: 'New Student Admission',
    description: 'Sophia Martinez enrolled in Grade 9-B (Reg #GIA-9042)',
    timestamp: '12 minutes ago',
    badgeText: 'Enrolled',
    badgeVariant: 'success',
  },
  {
    id: 'act-002',
    type: 'fee',
    title: 'Tuition Fee Payment Received',
    description: 'Receipt #RCPT-8821 for $1,250 verified via Stripe gateway',
    timestamp: '45 minutes ago',
    badgeText: 'Paid',
    badgeVariant: 'success',
  },
  {
    id: 'act-003',
    type: 'attendance',
    title: 'Faculty Absence Logged',
    description: 'Mr. David Sterling requested emergency sick leave (Substitute assigned: Ms. Vance)',
    timestamp: '2 hours ago',
    badgeText: 'Substitute Active',
    badgeVariant: 'warning',
  },
  {
    id: 'act-004',
    type: 'exam',
    title: 'Term 1 Midterm Scores Published',
    description: 'Mathematics Department uploaded verified scorecards for Grade 10',
    timestamp: '4 hours ago',
    badgeText: 'Academic',
    badgeVariant: 'info',
  },
  {
    id: 'act-005',
    type: 'notice',
    title: 'Campus Notice Dispatched',
    description: 'Parent-Teacher Conference schedule announced for Friday, Oct 24th',
    timestamp: 'Yesterday at 4:30 PM',
    badgeText: 'Published',
    badgeVariant: 'neutral',
  },
];

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: 'system' | 'academic' | 'finance' | 'alert';
}

export const PREVIEW_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Fee Due Reminder Dispatched',
    message: 'Automated SMS reminders sent to 48 parents with pending balances.',
    time: '15m ago',
    read: false,
    category: 'finance',
  },
  {
    id: 'notif-2',
    title: 'New Exam Timetable Approved',
    message: 'Final Examination schedule for Grades 9-12 has been locked.',
    time: '1h ago',
    read: false,
    category: 'academic',
  },
  {
    id: 'notif-3',
    title: 'Daily Attendance Report Ready',
    message: 'Campus-wide attendance logged at 95.2% today.',
    time: '3h ago',
    read: true,
    category: 'system',
  },
];

export const DEMO_USERS = {
  super_admin: {
    id: 'usr_super_admin_000',
    email: 'superadmin@edumanage.example.com',
    name: 'Super Admin',
    role: 'super_admin' as const,
    schoolId: 'school_demo_greenwood_001',
    schoolName: 'Platform Central Administration',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    phone: '+1 (555) 000-0000',
  },
  admin: {
    id: 'usr_admin_001',
    email: 'admin@greenwood.edu',
    name: 'Dr. Arthur Vance',
    role: 'admin' as const,
    schoolId: 'school_demo_greenwood_001',
    schoolName: 'Greenwood International Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    phone: '+1 (555) 392-1049',
  },
  teacher: {
    id: 'usr_teacher_002',
    email: 'clara.oswald@greenwood.edu',
    name: 'Prof. Clara Oswald',
    role: 'teacher' as const,
    schoolId: 'school_demo_greenwood_001',
    schoolName: 'Greenwood International Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    phone: '+1 (555) 782-9901',
  },
  student: {
    id: 'usr_student_003',
    email: 'liam.chen@student.greenwood.edu',
    name: 'Liam Chen',
    role: 'student' as const,
    schoolId: 'school_demo_greenwood_001',
    schoolName: 'Greenwood International Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
    phone: '+1 (555) 234-8877',
  },
  parent: {
    id: 'usr_parent_004',
    email: 'sarah.chen@parent.example.com',
    name: 'Sarah Chen (Parent of Liam)',
    role: 'parent' as const,
    schoolId: 'school_demo_greenwood_001',
    schoolName: 'Greenwood International Academy',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    phone: '+1 (555) 449-0112',
  },
};
