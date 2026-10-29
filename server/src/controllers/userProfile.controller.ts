import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { UserProfileService } from '../services/userProfile.service.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  avatarUploadSchema,
} from '../validations/userProfile.validation.js';
import { setAuthCookie, clearAuthCookie } from '../middlewares/auth.middleware.js';

export const getProfile = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const profile = await UserProfileService.getProfile(req.user.userId, req.user.schoolId);
  return ApiResponse.success(res, profile, 'Profile retrieved successfully.');
};

export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const validatedData = updateProfileSchema.parse(req.body);
  const clientContext = {
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser',
  };

  const updatedProfile = await UserProfileService.updateProfile(
    req.user.userId,
    validatedData,
    clientContext
  );

  return ApiResponse.success(res, updatedProfile, 'Profile updated successfully.');
};

export const uploadAvatar = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const validatedFile = avatarUploadSchema.parse(req.body);
  const clientContext = {
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser',
  };

  const result = await UserProfileService.uploadAvatar(
    req.user.userId,
    validatedFile,
    clientContext
  );

  return ApiResponse.success(res, result, 'Avatar uploaded and updated successfully.');
};

export const deleteAvatar = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const clientContext = {
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser',
  };

  const result = await UserProfileService.deleteAvatar(req.user.userId, clientContext);
  return ApiResponse.success(res, result, 'Avatar removed successfully.');
};

export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const validatedInput = changePasswordSchema.parse(req.body);
  const clientContext = {
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser',
  };

  const result = await UserProfileService.changePassword(
    req.user.userId,
    validatedInput,
    clientContext
  );

  // Set fresh HttpOnly cookie for active session
  setAuthCookie(res, result.tokens.accessToken);

  return ApiResponse.success(res, result, result.message);
};

export const logoutOtherSessions = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const clientContext = {
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser',
  };

  const result = await UserProfileService.logoutOtherSessions(req.user.userId, clientContext);

  // Refresh active cookie with new token
  setAuthCookie(res, result.tokens.accessToken);

  return ApiResponse.success(res, result, result.message);
};

export const logoutAllSessions = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const clientContext = {
    ip: req.ip || req.socket.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent']?.slice(0, 300) || 'Unknown Browser',
  };

  const result = await UserProfileService.logoutAllSessions(req.user.userId, clientContext);

  // Clear cookie completely
  clearAuthCookie(res);

  return ApiResponse.success(res, result, result.message);
};

export const getSecurityInfo = async (req: Request, res: Response): Promise<Response> => {
  if (!req.user?.userId) {
    throw ApiError.unauthorized('Authentication required.');
  }

  const security = await UserProfileService.getSecurityInfo(req.user.userId);
  return ApiResponse.success(res, security, 'Security information retrieved successfully.');
};
