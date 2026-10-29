import { apiClient } from '../lib/api';
import {
  UserProfileResponse,
  UpdateProfilePayload,
  ChangePasswordPayload,
  AvatarUploadPayload,
  SecurityMetadata,
} from '../types/profile';

export const profileService = {
  /**
   * Retrieves the current authenticated user's complete profile.
   */
  async getProfile(): Promise<UserProfileResponse> {
    const res = await apiClient.get<{ success: boolean; data: UserProfileResponse }>(
      '/users/me/profile'
    );
    return res.data.data;
  },

  /**
   * Updates allowed profile fields for the authenticated user.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfileResponse> {
    const res = await apiClient.patch<{ success: boolean; data: UserProfileResponse }>(
      '/users/me/profile',
      payload
    );
    return res.data.data;
  },

  /**
   * Uploads and sets a new avatar photo.
   */
  async uploadAvatar(payload: AvatarUploadPayload): Promise<{ avatarUrl: string; storageKey: string }> {
    const res = await apiClient.post<{
      success: boolean;
      data: { avatarUrl: string; storageKey: string };
    }>('/users/me/avatar', payload);
    return res.data.data;
  },

  /**
   * Deletes the current profile avatar photo.
   */
  async deleteAvatar(): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>('/users/me/avatar');
    return res.data;
  },

  /**
   * Changes the user's password and revokes all other sessions.
   */
  async changePassword(
    payload: ChangePasswordPayload
  ): Promise<{ message: string; tokens?: { accessToken: string; refreshToken: string } }> {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { tokens?: { accessToken: string; refreshToken: string } };
    }>('/auth/change-password', payload);

    if (res.data.data?.tokens?.accessToken) {
      localStorage.setItem('edumanage_token', res.data.data.tokens.accessToken);
    }

    return { message: res.data.message, tokens: res.data.data?.tokens };
  },

  /**
   * Fetches account security metadata (login history, session info).
   */
  async getSecurityInfo(): Promise<SecurityMetadata> {
    const res = await apiClient.get<{ success: boolean; data: SecurityMetadata }>(
      '/users/me/security'
    );
    return res.data.data;
  },

  /**
   * Invalidates all other sessions while keeping the current session active.
   */
  async logoutOtherSessions(): Promise<{ message: string }> {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      data: { tokens?: { accessToken: string; refreshToken: string } };
    }>('/users/me/logout-other-sessions');

    if (res.data.data?.tokens?.accessToken) {
      localStorage.setItem('edumanage_token', res.data.data.tokens.accessToken);
    }

    return { message: res.data.message };
  },

  /**
   * Invalidates all sessions across all devices.
   */
  async logoutAllSessions(): Promise<{ message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      '/users/me/logout-all-sessions'
    );
    localStorage.removeItem('edumanage_token');
    return { message: res.data.message };
  },
};
