export type NotificationCategory =
  | 'academic'
  | 'finance'
  | 'attendance'
  | 'homework'
  | 'exams'
  | 'system'
  | 'notice'
  | 'announcement';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationItem {
  _id: string;
  id?: string;
  schoolId: string;
  recipientId: string;
  category: NotificationCategory;
  title: string;
  content: string;
  channels: string[];
  isRead: boolean;
  readAt?: string | null;
  priority: NotificationPriority;
  resourceType?: string;
  resourceId?: string;
  actionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelPreferences {
  academic: boolean;
  finance: boolean;
  attendance: boolean;
  homework: boolean;
  exams: boolean;
  announcements: boolean;
}

export interface NotificationPreferences {
  _id?: string;
  schoolId?: string;
  userId?: string;
  inApp: ChannelPreferences;
  email: ChannelPreferences;
}

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  category?: NotificationCategory;
  isRead?: boolean;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
