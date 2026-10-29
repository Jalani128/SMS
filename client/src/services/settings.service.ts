import { apiClient } from '../lib/api';
import {
  SchoolSettingsData,
  SchoolProfileSettings,
  SchoolBrandingSettings,
  SchoolRegionalSettings,
  SchoolAcademicSettings,
  SchoolAttendanceSettings,
  SchoolFeeSettings,
  SchoolNotificationSettings,
  AcademicHoliday,
  GradingScaleData,
} from '../types/settings';

export const settingsService = {
  /**
   * Retrieves centralized settings for the current school
   */
  async getSettings(): Promise<SchoolSettingsData> {
    const res = await apiClient.get<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings'
    );
    return res.data.data;
  },

  /**
   * Updates school profile & contact details
   */
  async updateProfile(data: Partial<SchoolProfileSettings>): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/profile',
      data
    );
    return res.data.data;
  },

  /**
   * Updates school logo, colors, and letterheads
   */
  async updateBranding(data: Partial<SchoolBrandingSettings>): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/branding',
      data
    );
    return res.data.data;
  },

  /**
   * Updates regional and localization formatting
   */
  async updateRegional(data: Partial<SchoolRegionalSettings>): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/regional',
      data
    );
    return res.data.data;
  },

  /**
   * Updates academic session & working days
   */
  async updateAcademic(data: Partial<SchoolAcademicSettings>): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/academic',
      data
    );
    return res.data.data;
  },

  /**
   * Retrieves academic calendar view
   */
  async getAcademicCalendar(): Promise<any> {
    const res = await apiClient.get<{ success: boolean; data: any }>(
      '/school-settings/academic-calendar'
    );
    return res.data.data;
  },

  /**
   * Adds an academic holiday to the calendar
   */
  async addHoliday(holiday: Omit<AcademicHoliday, '_id'>): Promise<SchoolSettingsData> {
    const res = await apiClient.post<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/academic-calendar/holidays',
      holiday
    );
    return res.data.data;
  },

  /**
   * Deletes an academic holiday from the calendar
   */
  async deleteHoliday(id: string): Promise<SchoolSettingsData> {
    const res = await apiClient.delete<{ success: boolean; data: SchoolSettingsData }>(
      `/school-settings/academic-calendar/holidays/${id}`
    );
    return res.data.data;
  },

  /**
   * Updates school-wide attendance policies
   */
  async updateAttendancePolicy(
    data: Partial<SchoolAttendanceSettings>
  ): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/attendance',
      data
    );
    return res.data.data;
  },

  /**
   * Updates fee & invoice parameters
   */
  async updateFeePolicy(data: Partial<SchoolFeeSettings>): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/fees',
      data
    );
    return res.data.data;
  },

  /**
   * Updates notification defaults
   */
  async updateNotificationSettings(
    data: Partial<SchoolNotificationSettings>
  ): Promise<SchoolSettingsData> {
    const res = await apiClient.patch<{ success: boolean; data: SchoolSettingsData }>(
      '/school-settings/notifications',
      data
    );
    return res.data.data;
  },

  /**
   * Retrieves default grading scale
   */
  async getGradingPolicy(): Promise<GradingScaleData> {
    const res = await apiClient.get<{ success: boolean; data: GradingScaleData }>(
      '/school-settings/grading'
    );
    return res.data.data;
  },

  /**
   * Updates grading scale boundaries
   */
  async updateGradingPolicy(data: Partial<GradingScaleData>): Promise<GradingScaleData> {
    const res = await apiClient.patch<{ success: boolean; data: GradingScaleData }>(
      '/school-settings/grading',
      data
    );
    return res.data.data;
  },
};
