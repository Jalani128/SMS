import { OnboardingService } from '../services/onboarding.service.js';
import { saveStepSchema, previewImportSchema, confirmImportSchema, } from '../validations/onboarding.validation.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
// Express async handler wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
/**
 * GET /api/onboarding/status
 * Retrieves onboarding progress and live readiness breakdown
 */
export const getOnboardingStatus = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OnboardingService.getOnboardingStatus(schoolId);
    return ApiResponse.success(res, result, 'Onboarding status retrieved successfully');
});
/**
 * PUT /api/onboarding/step
 * Saves partial setup progress for a specific wizard step
 */
export const saveOnboardingStep = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = saveStepSchema.parse(req.body);
    const result = await OnboardingService.saveOnboardingStep(schoolId, userId, validated.step, validated.data);
    return ApiResponse.success(res, result, `Step ${validated.step} progress saved successfully`);
});
/**
 * POST /api/onboarding/complete
 * Verifies all mandatory requirements and marks onboarding completed
 */
export const completeOnboarding = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const result = await OnboardingService.completeOnboarding(schoolId, userId);
    return ApiResponse.success(res, result, 'School onboarding completed successfully!');
});
/**
 * GET /api/onboarding/templates/:type
 * Downloads pre-formatted CSV template for Teachers, Students, or Parents
 */
export const getTemplate = asyncHandler(async (req, res) => {
    const { type } = req.params;
    if (type !== 'teachers' && type !== 'students' && type !== 'parents') {
        throw ApiError.badRequest('Invalid template type. Must be teachers, students, or parents.');
    }
    const csvContent = OnboardingService.generateCsvTemplate(type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="edumanage_${type}_template.csv"`);
    return res.status(200).send(csvContent);
});
/**
 * POST /api/onboarding/import/preview
 * Stage A: Parses and validates uploaded CSV text, returning preview and row-level errors
 */
export const previewImport = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = previewImportSchema.parse(req.body);
    const result = await OnboardingService.previewImport(schoolId, userId, validated.importType, validated.csvContent, validated.filename);
    return ApiResponse.success(res, result, 'CSV import validated successfully');
});
/**
 * POST /api/onboarding/import/confirm
 * Stage B: Confirms and commits validated import batch
 */
export const confirmImport = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    const userId = req.user?.userId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const validated = confirmImportSchema.parse(req.body);
    const result = await OnboardingService.confirmImport(schoolId, userId, validated.batchId, validated.importType);
    return ApiResponse.success(res, result, 'Data import completed successfully');
});
/**
 * GET /api/onboarding/import/history
 * Retrieves past data import jobs and results
 */
export const getImportHistory = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await OnboardingService.getImportHistory(schoolId, page, limit);
    return ApiResponse.success(res, result, 'Import history retrieved successfully');
});
/**
 * GET /api/onboarding/import/errors/:batchId
 * Downloads sanitized CSV error report for a rejected/partial batch
 */
export const downloadErrorReport = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId)
        throw ApiError.unauthorized('School context required.');
    const batchId = String(req.params.batchId);
    const csvReport = await OnboardingService.generateErrorReportCsv(batchId, schoolId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="import_errors_${batchId}.csv"`);
    return res.status(200).send(csvReport);
});
