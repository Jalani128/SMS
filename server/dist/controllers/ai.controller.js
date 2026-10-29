import { AIService } from '../services/ai.service.js';
import { ApiError } from '../utils/apiError.js';
import { chatSchema, homeworkHelpSchema, quizGeneratorSchema, reportCardCommentSchema, feeReminderSchema, noticeGeneratorSchema, schoolInsightsSchema, } from '../validations/ai.validation.js';
import { User } from '../models/User.model.js';
// Helper to extract verified user and school context
const getVerifiedContext = async (req) => {
    const schoolId = req.schoolId || req.user?.schoolId;
    if (!schoolId) {
        throw ApiError.unauthorized('School tenant context is required.');
    }
    let user = req.currentUser;
    if (!user && req.user?.userId) {
        user = (await User.findById(req.user.userId)) || undefined;
    }
    if (!user) {
        throw ApiError.unauthorized('Authenticated user profile not found.');
    }
    return { schoolId, user };
};
/**
 * 1. AI Chat Copilot
 * POST /api/ai/chat
 */
export const chatHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = chatSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid chat payload.');
        }
        const result = await AIService.chat({
            user,
            schoolId,
            message: parsed.data.message,
            history: parsed.data.history,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 2. Student Homework Helper
 * POST /api/ai/homework-help
 */
export const homeworkHelpHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = homeworkHelpSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid homework helper payload.');
        }
        const result = await AIService.homeworkHelp({
            user,
            schoolId,
            question: parsed.data.question,
            subjectId: parsed.data.subjectId,
            topic: parsed.data.topic,
            studyMaterialId: parsed.data.studyMaterialId,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 3. AI Quiz Generator
 * POST /api/ai/quiz-generator
 */
export const quizGeneratorHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = quizGeneratorSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid quiz generator payload.');
        }
        const result = await AIService.generateQuiz({
            user,
            schoolId,
            subjectId: parsed.data.subjectId,
            classId: parsed.data.classId,
            sectionId: parsed.data.sectionId,
            topic: parsed.data.topic,
            questionCount: parsed.data.questionCount,
            difficulty: parsed.data.difficulty,
            questionType: parsed.data.questionType,
            marksPerQuestion: parsed.data.marksPerQuestion,
            studyMaterialId: parsed.data.studyMaterialId,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 4. AI Report-Card Comment Generator
 * POST /api/ai/report-card-comment
 */
export const reportCardCommentHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = reportCardCommentSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid report card comment payload.');
        }
        const result = await AIService.generateReportCardComment({
            user,
            schoolId,
            studentId: parsed.data.studentId,
            subjectId: parsed.data.subjectId,
            academicSessionId: parsed.data.academicSessionId,
            strengths: parsed.data.strengths,
            areasForImprovement: parsed.data.areasForImprovement,
            tone: parsed.data.tone,
            length: parsed.data.length,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 5. AI Fee-Reminder Generator
 * POST /api/ai/fee-reminder
 */
export const feeReminderHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = feeReminderSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid fee reminder payload.');
        }
        const result = await AIService.generateFeeReminder({
            user,
            schoolId,
            invoiceId: parsed.data.invoiceId,
            tone: parsed.data.tone,
            additionalInstructions: parsed.data.additionalInstructions,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 6. AI Notice Generator
 * POST /api/ai/notice-generator
 */
export const noticeGeneratorHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = noticeGeneratorSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid notice generator payload.');
        }
        const result = await AIService.generateNotice({
            user,
            schoolId,
            title: parsed.data.title,
            eventType: parsed.data.eventType,
            targetAudience: parsed.data.targetAudience,
            date: parsed.data.date,
            location: parsed.data.location,
            instructions: parsed.data.instructions,
            tone: parsed.data.tone,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
/**
 * 7. AI School Insights
 * POST /api/ai/school-insights
 */
export const schoolInsightsHandler = async (req, res, next) => {
    try {
        const { schoolId, user } = await getVerifiedContext(req);
        const parsed = schoolInsightsSchema.safeParse(req.body);
        if (!parsed.success) {
            throw ApiError.badRequest(parsed.error.issues[0]?.message || 'Invalid school insights payload.');
        }
        const result = await AIService.getSchoolInsights({
            user,
            schoolId,
            insightType: parsed.data.insightType,
            classId: parsed.data.classId,
            academicSessionId: parsed.data.academicSessionId,
        });
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (err) {
        next(err);
    }
};
