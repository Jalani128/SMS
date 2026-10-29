import { Request, Response, NextFunction } from 'express';
import { SchoolSettingsService } from '../services/schoolSettings.service.js';
import {
  updateProfileSchema,
  updateBrandingSchema,
  updateRegionalSchema,
  holidaySchema,
  updateAcademicSettingsSchema,
  updateAttendancePolicySchema,
  updateFeePolicySchema,
  updateNotificationSettingsSchema,
  updateGradingScaleSchema,
} from '../validations/schoolSettings.validation.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

// Express async handler wrapper
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/school-settings
 * Retrieves centralized settings for the authenticated school
 */
export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  if (!schoolId) {
    throw ApiError.unauthorized('School context required.');
  }

  const settings = await SchoolSettingsService.getOrCreateSettings(schoolId);
  return ApiResponse.success(res, settings, 'School settings retrieved successfully');
});

/**
 * PATCH /api/school-settings/profile
 * Updates institutional profile and official contact information
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateProfileSchema.parse(req.body);
  const settings = await SchoolSettingsService.updateProfile(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'School profile updated successfully');
});

/**
 * PATCH /api/school-settings/branding
 * Updates logo, colors, and report card/email letterheads
 */
export const updateBranding = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateBrandingSchema.parse(req.body);
  const settings = await SchoolSettingsService.updateBranding(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'School branding updated successfully');
});

/**
 * PATCH /api/school-settings/regional
 * Updates timezone, date/time formatting, and currency
 */
export const updateRegional = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateRegionalSchema.parse(req.body);
  const settings = await SchoolSettingsService.updateRegional(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'Regional settings updated successfully');
});

/**
 * PATCH /api/school-settings/academic
 * Updates active academic session, working days, and terms
 */
export const updateAcademic = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateAcademicSettingsSchema.parse(req.body);
  const settings = await SchoolSettingsService.updateAcademic(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'Academic settings updated successfully');
});

/**
 * GET /api/school-settings/academic-calendar
 * Retrieves calendar sessions, terms, holidays, and working days
 */
export const getAcademicCalendar = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const calendar = await SchoolSettingsService.getAcademicCalendar(schoolId);
  return ApiResponse.success(res, calendar, 'Academic calendar retrieved successfully');
});

/**
 * POST /api/school-settings/academic-calendar/holidays
 * Adds a holiday to the school calendar
 */
export const addHoliday = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = holidaySchema.parse(req.body);
  const settings = await SchoolSettingsService.addHoliday(schoolId, validated, userId);

  return ApiResponse.created(res, settings, 'Holiday added to calendar');
});

/**
 * PATCH /api/school-settings/academic-calendar/holidays/:id
 * Updates an existing holiday
 */
export const updateHoliday = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  const holidayId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = holidaySchema.parse(req.body);
  const settings = await SchoolSettingsService.updateHoliday(schoolId, holidayId, validated, userId);

  return ApiResponse.success(res, settings, 'Holiday updated successfully');
});

/**
 * DELETE /api/school-settings/academic-calendar/holidays/:id
 * Removes a holiday from the calendar
 */
export const deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  const holidayId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const settings = await SchoolSettingsService.deleteHoliday(schoolId, holidayId, userId);
  return ApiResponse.success(res, settings, 'Holiday removed from calendar');
});

/**
 * PATCH /api/school-settings/attendance
 * Updates school-wide attendance rules and alert thresholds
 */
export const updateAttendancePolicy = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateAttendancePolicySchema.parse(req.body);
  const settings = await SchoolSettingsService.updateAttendancePolicy(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'Attendance policy updated successfully');
});

/**
 * PATCH /api/school-settings/fees
 * Updates invoice defaults, reminder schedules, and payment instructions
 */
export const updateFeePolicy = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateFeePolicySchema.parse(req.body);
  const settings = await SchoolSettingsService.updateFeePolicy(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'Fee policy updated successfully');
});

/**
 * PATCH /api/school-settings/notifications
 * Updates institutional notification defaults and quiet hours
 */
export const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateNotificationSettingsSchema.parse(req.body);
  const settings = await SchoolSettingsService.updateNotificationSettings(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, settings, 'Notification settings updated successfully');
});

/**
 * GET /api/school-settings/grading
 * Retrieves default grading scale for the school
 */
export const getGradingPolicy = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const scale = await SchoolSettingsService.getGradingPolicy(schoolId);
  return ApiResponse.success(res, scale, 'Grading scale retrieved successfully');
});

/**
 * PATCH /api/school-settings/grading
 * Updates grading scale boundaries (applies prospectively)
 */
export const updateGradingPolicy = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId || (req.user as any)?.schoolId;
  const userId = (req.user as any)?.userId;
  if (!schoolId) throw ApiError.unauthorized('School context required.');

  const validated = updateGradingScaleSchema.parse(req.body);
  const scale = await SchoolSettingsService.updateGradingPolicy(
    schoolId,
    validated,
    userId,
    req.ip,
    req.get('user-agent')
  );

  return ApiResponse.success(res, scale, 'Grading scale updated successfully');
});
