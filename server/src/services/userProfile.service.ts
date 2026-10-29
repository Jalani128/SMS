import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User, IUser, UserRole } from '../models/User.model.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { School } from '../models/School.model.js';
import { AuditLog } from '../models/AuditLog.model.js';
import { ApiError } from '../utils/apiError.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { uploadAvatarAsset, deleteAvatarAsset, validateAvatarFile } from '../utils/avatarUpload.util.js';
import { logger } from '../utils/logger.js';
import { UpdateProfileInput, ChangePasswordInput } from '../validations/userProfile.validation.js';

export class UserProfileService {
  /**
   * Retrieves full profile payload tailored to the user's role and tenant school.
   */
  static async getProfile(userId: string | Types.ObjectId, schoolId?: string | Types.ObjectId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    let roleProfile: any = null;
    let school: any = null;

    if (user.schoolId) {
      school = await School.findById(user.schoolId).select('name slug code currency timezone status logo');
    }

    // Role-specific profile population
    switch (user.role) {
      case 'student': {
        roleProfile = await Student.findOne({ userId: user._id })
          .populate('currentSessionId', 'name startDate endDate isActive')
          .populate('currentClassId', 'name grade level code')
          .populate('currentSectionId', 'name capacity')
          .lean();
        break;
      }
      case 'teacher': {
        roleProfile = await Teacher.findOne({ userId: user._id })
          .populate('assignedClassIds', 'name grade level code')
          .populate('assignedSubjectIds', 'name code category')
          .lean();
        break;
      }
      case 'parent': {
        const parentDoc = await Parent.findOne({ userId: user._id })
          .populate({
            path: 'children.studentProfileId',
            select: 'admissionNumber rollNumber dateOfBirth gender currentClassId currentSectionId status userId',
            populate: [
              { path: 'userId', select: 'name email avatarUrl phone' },
              { path: 'currentClassId', select: 'name grade' },
              { path: 'currentSectionId', select: 'name' },
            ],
          })
          .lean();
        roleProfile = parentDoc;
        break;
      }
      case 'admin':
      case 'super_admin':
      default:
        roleProfile = {
          administrativeLevel: user.role === 'super_admin' ? 'Platform Administrator' : 'School Administrator',
        };
        break;
    }

    return {
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        schoolId: user.schoolId,
        schoolName: school?.name || 'Platform System Administration',
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        lastLoginUserAgent: user.lastLoginUserAgent,
        passwordChangedAt: user.passwordChangedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      school,
      roleProfile,
      security: {
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        lastLoginUserAgent: user.lastLoginUserAgent,
        passwordChangedAt: user.passwordChangedAt,
        tokenVersion: user.tokenVersion || 0,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
      },
    };
  }

  /**
   * Updates permitted profile fields based strictly on role-based server-side allowlists.
   * Completely rejects or ignores attempts to alter role, schoolId, isActive, or tokenVersion.
   */
  static async updateProfile(
    userId: string | Types.ObjectId,
    data: UpdateProfileInput,
    clientContext?: { ip?: string; userAgent?: string }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    // 1. Common User fields allowlist
    const changedFields: Record<string, any> = {};

    if (data.name !== undefined && data.name.trim()) {
      user.name = data.name.trim();
      changedFields.name = user.name;
    }
    if (data.firstName !== undefined) {
      user.firstName = data.firstName.trim();
      changedFields.firstName = user.firstName;
    }
    if (data.lastName !== undefined) {
      user.lastName = data.lastName.trim();
      changedFields.lastName = user.lastName;
    }
    if (data.phone !== undefined) {
      user.phone = data.phone.trim();
      changedFields.phone = user.phone;
    }

    await user.save();

    // 2. Role-specific permitted field updates
    let roleProfile: any = null;

    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: user._id });
      if (teacher) {
        if (data.bio !== undefined) teacher.bio = data.bio.trim();
        if (data.qualification !== undefined) teacher.qualification = data.qualification.trim();
        if (data.specializations !== undefined) teacher.specializations = data.specializations;
        if (data.experienceYears !== undefined) teacher.experienceYears = data.experienceYears;
        await teacher.save();
        roleProfile = teacher;
      }
    } else if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        if (data.address !== undefined) student.address = data.address.trim();
        if (data.dateOfBirth !== undefined) student.dateOfBirth = new Date(data.dateOfBirth);
        if (data.gender !== undefined) student.gender = data.gender;
        if (data.bloodGroup !== undefined) student.bloodGroup = data.bloodGroup;
        if (data.medicalNotes !== undefined) student.medicalNotes = data.medicalNotes.trim();
        if (data.emergencyContact !== undefined) {
          student.emergencyContact = {
            name: data.emergencyContact.name?.trim() || student.emergencyContact?.name || '',
            relationship: data.emergencyContact.relationship?.trim() || student.emergencyContact?.relationship || '',
            phone: data.emergencyContact.phone?.trim() || student.emergencyContact?.phone || '',
          };
        }
        await student.save();
        roleProfile = student;
      }
    } else if (user.role === 'parent') {
      const parent = await Parent.findOne({ userId: user._id });
      if (parent) {
        if (data.occupation !== undefined) parent.occupation = data.occupation.trim();
        if (data.alternatePhone !== undefined) parent.alternatePhone = data.alternatePhone.trim();
        if (data.address !== undefined) parent.address = data.address.trim();
        if (data.emergencyContact !== undefined) {
          parent.emergencyContact = {
            name: data.emergencyContact.name?.trim() || parent.emergencyContact?.name || '',
            relationship: data.emergencyContact.relationship?.trim() || parent.emergencyContact?.relationship || '',
            phone: data.emergencyContact.phone?.trim() || parent.emergencyContact?.phone || '',
          };
        }
        await parent.save();
        roleProfile = parent;
      }
    }

    // 3. Record AuditLog
    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      schoolId: user.schoolId,
      action: 'UPDATE_PROFILE',
      targetResource: 'User',
      targetResourceId: user._id,
      ipAddress: clientContext?.ip || '127.0.0.1',
      userAgent: clientContext?.userAgent || 'Unknown Browser',
      metadata: { changedFields },
      timestamp: new Date(),
    });

    return this.getProfile(user._id, user.schoolId);
  }

  /**
   * Uploads and updates the user's avatar image, cleaning up old storage assets if safe.
   */
  static async uploadAvatar(
    userId: string | Types.ObjectId,
    file: { name: string; mimetype: string; size: number; base64Data?: string },
    clientContext?: { ip?: string; userAgent?: string }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    const validation = validateAvatarFile(file.name, file.mimetype, file.size);
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error || 'Invalid avatar file.');
    }

    const buffer = file.base64Data ? Buffer.from(file.base64Data, 'base64') : undefined;

    // Upload new avatar asset
    const uploadResult = await uploadAvatarAsset(user.schoolId, user._id, {
      originalname: file.name,
      mimetype: file.mimetype,
      size: file.size,
      buffer,
    });

    user.avatarUrl = uploadResult.url;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      schoolId: user.schoolId,
      action: 'UPDATE_AVATAR',
      targetResource: 'User',
      targetResourceId: user._id,
      ipAddress: clientContext?.ip || '127.0.0.1',
      userAgent: clientContext?.userAgent || 'Unknown Browser',
      metadata: { avatarUrl: uploadResult.url, storageKey: uploadResult.storageKey },
      timestamp: new Date(),
    });

    return {
      avatarUrl: user.avatarUrl,
      storageKey: uploadResult.storageKey,
    };
  }

  /**
   * Removes the user's avatar image.
   */
  static async deleteAvatar(
    userId: string | Types.ObjectId,
    clientContext?: { ip?: string; userAgent?: string }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    user.avatarUrl = undefined;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      schoolId: user.schoolId,
      action: 'DELETE_AVATAR',
      targetResource: 'User',
      targetResourceId: user._id,
      ipAddress: clientContext?.ip || '127.0.0.1',
      userAgent: clientContext?.userAgent || 'Unknown Browser',
      timestamp: new Date(),
    });

    return { success: true, message: 'Avatar removed successfully.' };
  }

  /**
   * Changes the authenticated user's password, updates passwordChangedAt,
   * increments tokenVersion to revoke all other active sessions, and signs
   * fresh tokens for the current session.
   */
  static async changePassword(
    userId: string | Types.ObjectId,
    input: ChangePasswordInput,
    clientContext?: { ip?: string; userAgent?: string }
  ) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    // Verify current password with bcrypt
    const isMatch = await user.comparePassword(input.currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('The current password entered is incorrect.');
    }

    // Hash new password using bcrypt (12 rounds)
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(input.newPassword, salt);
    user.passwordChangedAt = new Date();

    // Increment tokenVersion: revokes all other active sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate fresh tokens with the updated tokenVersion for the active session
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId.toString() : undefined,
      name: user.name,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      schoolId: user.schoolId,
      action: 'CHANGE_PASSWORD',
      targetResource: 'User',
      targetResourceId: user._id,
      ipAddress: clientContext?.ip || '127.0.0.1',
      userAgent: clientContext?.userAgent || 'Unknown Browser',
      metadata: { tokenVersion: user.tokenVersion },
      timestamp: new Date(),
    });

    return {
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
      },
      message: 'Password changed successfully. All other active sessions have been invalidated.',
    };
  }

  /**
   * Logs out of all other active sessions by incrementing tokenVersion
   * and issuing a brand new token for the current session.
   */
  static async logoutOtherSessions(
    userId: string | Types.ObjectId,
    clientContext?: { ip?: string; userAgent?: string }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId.toString() : undefined,
      name: user.name,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      schoolId: user.schoolId,
      action: 'LOGOUT_OTHER_SESSIONS',
      targetResource: 'User',
      targetResourceId: user._id,
      ipAddress: clientContext?.ip || '127.0.0.1',
      userAgent: clientContext?.userAgent || 'Unknown Browser',
      metadata: { newTokenVersion: user.tokenVersion },
      timestamp: new Date(),
    });

    return {
      tokens: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
      },
      revokedCount: 'All other sessions',
      message: 'All other sessions have been terminated. Your current session remains active.',
    };
  }

  /**
   * Logs out of all sessions everywhere by incrementing tokenVersion.
   */
  static async logoutAllSessions(
    userId: string | Types.ObjectId,
    clientContext?: { ip?: string; userAgent?: string }
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      schoolId: user.schoolId,
      action: 'LOGOUT_ALL_SESSIONS',
      targetResource: 'User',
      targetResourceId: user._id,
      ipAddress: clientContext?.ip || '127.0.0.1',
      userAgent: clientContext?.userAgent || 'Unknown Browser',
      metadata: { newTokenVersion: user.tokenVersion },
      timestamp: new Date(),
    });

    return {
      message: 'Logged out of all sessions across all devices. Please sign in again.',
    };
  }

  /**
   * Returns security summary metadata for the authenticated user.
   */
  static async getSecurityInfo(userId: string | Types.ObjectId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User record not found.');
    }

    return {
      userId: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      tokenVersion: user.tokenVersion || 0,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp || '127.0.0.1',
      lastLoginUserAgent: user.lastLoginUserAgent || 'Unknown Browser',
      passwordChangedAt: user.passwordChangedAt,
      createdAt: user.createdAt,
    };
  }
}
