import { apiClient } from '../lib/api';
import {
  NotificationItem,
  NotificationPreferences,
  NotificationQueryFilters,
  NotificationListResponse,
} from '../types/notification';

export const notificationService = {
  /**
   * Retrieves paginated notifications for current authenticated user
   */
  async getNotifications(params?: NotificationQueryFilters): Promise<NotificationListResponse> {
    const res = await apiClient.get<{
      success: boolean;
      data: NotificationItem[];
      meta?: { pagination?: any };
    }>('/notifications', { params });

    return {
      notifications: res.data.data || [],
      pagination: res.data.meta?.pagination || {
        page: 1,
        limit: 20,
        total: (res.data.data || []).length,
        pages: 1,
      },
    };
  },

  /**
   * Retrieves unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ success: boolean; data: { unreadCount: number } }>(
      '/notifications/unread-count'
    );
    return res.data.data?.unreadCount || 0;
  },

  /**
   * Marks a single notification as read
   */
  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<{ success: boolean; data: NotificationItem }>(
      `/notifications/${id}/read`
    );
    return res.data.data;
  },

  /**
   * Marks all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const res = await apiClient.patch<{ success: boolean; data: { modifiedCount: number } }>(
      '/notifications/read-all'
    );
    return res.data.data?.modifiedCount || 0;
  },

  /**
   * Retrieves user notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const res = await apiClient.get<{ success: boolean; data: NotificationPreferences }>(
      '/notification-preferences'
    );
    return res.data.data;
  },

  /**
   * Updates user notification preferences
   */
  async updatePreferences(
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const res = await apiClient.patch<{ success: boolean; data: NotificationPreferences }>(
      '/notification-preferences',
      updates
    );
    return res.data.data;
  },
};
