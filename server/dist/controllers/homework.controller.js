import { Types } from 'mongoose';
import { Homework } from '../models/Homework.model.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.model.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { Subject } from '../models/Subject.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { createHomeworkSchema, updateHomeworkSchema, archiveHomeworkSchema, createSubmissionSchema, gradeSubmissionSchema, releaseGradeSchema, returnSubmissionSchema, queryHomeworkSchema, } from '../validations/homework.validation.js';
import { calculateLateStatus, computeAssignmentCompletion, verifyTeacherAuthorization, triggerHomeworkNotification, } from '../utils/homework.util.js';
import { uploadHomeworkAttachment } from '../utils/homeworkUpload.util.js';
import { logger } from '../utils/logger.js';
// Helper to extract schoolId and userId
const getContext = (req) => {
    const schoolIdStr = (req.schoolId || req.user?.schoolId);
    const userIdStr = req.user?.userId;
    return {
        schoolId: schoolIdStr ? new Types.ObjectId(schoolIdStr) : undefined,
        userId: userIdStr ? new Types.ObjectId(userIdStr) : undefined,
        role: req.user?.role,
    };
};
// ============================================================================
// 1. List Homework Assignments (Role-Aware)
// ============================================================================
export const listHomework = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const queryParsed = queryHomeworkSchema.safeParse(req.query);
        if (!queryParsed.success) {
            res.status(400).json({ success: false, message: queryParsed.error.issues[0]?.message || 'Invalid query' });
            return;
        }
        const { page, limit, classId, sectionId, subjectId, teacherId, status, assignmentType, search } = queryParsed.data;
        const filter = { schoolId, isDeleted: false };
        // --- Role-based isolation rules ---
        if (role === 'student') {
            const student = await Student.findOne({ userId, schoolId });
            if (!student) {
                res.status(404).json({ success: false, message: 'Student profile not found' });
                return;
            }
            // Enforce: student only sees PUBLISHED assignments for their enrolled class & section
            // Drafts NEVER appear in student views!
            filter.status = 'published';
            if (student.currentClassId)
                filter.classId = student.currentClassId;
            if (student.currentSectionId)
                filter.sectionId = student.currentSectionId;
        }
        else if (role === 'parent') {
            const parent = await Parent.findOne({ userId, schoolId });
            if (!parent) {
                res.status(404).json({ success: false, message: 'Parent profile not found' });
                return;
            }
            const wardIdParam = req.query.wardId;
            filter.status = 'published';
            if (wardIdParam) {
                const isWard = parent.children.some((c) => c.studentProfileId.toString() === wardIdParam);
                if (!isWard) {
                    res.status(403).json({ success: false, message: 'Forbidden: Ward not linked to parent profile' });
                    return;
                }
                const wardStudent = await Student.findOne({ _id: new Types.ObjectId(wardIdParam), schoolId });
                if (wardStudent) {
                    if (wardStudent.currentClassId)
                        filter.classId = wardStudent.currentClassId;
                    if (wardStudent.currentSectionId)
                        filter.sectionId = wardStudent.currentSectionId;
                }
            }
        }
        else if (role === 'teacher') {
            const teacher = await Teacher.findOne({ userId, schoolId });
            if (teacher && !classId && !teacherId) {
                filter.teacherId = teacher._id;
            }
            if (status && status !== 'all') {
                filter.status = status;
            }
        }
        else {
            // Admin / Super Admin
            if (status && status !== 'all') {
                filter.status = status;
            }
        }
        // Apply explicit query filters
        if (classId)
            filter.classId = new Types.ObjectId(classId);
        if (sectionId)
            filter.sectionId = new Types.ObjectId(sectionId);
        if (subjectId)
            filter.subjectId = new Types.ObjectId(subjectId);
        if (teacherId)
            filter.teacherId = new Types.ObjectId(teacherId);
        if (assignmentType && assignmentType !== 'all')
            filter.assignmentType = assignmentType;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { instructions: { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (page - 1) * limit;
        const [homeworkList, total] = await Promise.all([
            Homework.find(filter)
                .populate('classId', 'name stage')
                .populate('sectionId', 'name roomNumber')
                .populate('subjectId', 'name code')
                .populate({
                path: 'teacherId',
                select: 'employeeId userId',
                populate: { path: 'userId', select: 'name email' },
            })
                .populate('academicSessionId', 'name isCurrent')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Homework.countDocuments(filter),
        ]);
        // For students, attach their personal submission status to each assignment
        let enrichedList = homeworkList;
        if (role === 'student' && userId) {
            const student = await Student.findOne({ userId, schoolId });
            if (student) {
                const studentSubmissions = await AssignmentSubmission.find({
                    schoolId,
                    studentId: student._id,
                    homeworkId: { $in: homeworkList.map((h) => h._id) },
                }).lean();
                const subMap = new Map(studentSubmissions.map((s) => [s.homeworkId.toString(), s]));
                enrichedList = homeworkList.map((h) => {
                    const sub = subMap.get(h._id.toString());
                    return {
                        ...h,
                        studentSubmission: sub
                            ? {
                                _id: sub._id,
                                status: sub.status,
                                submittedAt: sub.submittedAt,
                                isLate: sub.isLate,
                                marksObtained: sub.isGradeReleased ? sub.marksObtained : undefined,
                                teacherFeedback: sub.isGradeReleased ? sub.teacherFeedback : undefined,
                                isGradeReleased: sub.isGradeReleased,
                            }
                            : null,
                    };
                });
            }
        }
        res.status(200).json({
            success: true,
            data: enrichedList,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        logger.error('[ListHomework] Error listing homework assignments:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve homework list' });
    }
};
// ============================================================================
// 2. Get Homework Details By ID
// ============================================================================
export const getHomeworkById = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID format' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false })
            .populate('classId', 'name stage')
            .populate('sectionId', 'name roomNumber')
            .populate('subjectId', 'name code')
            .populate({
            path: 'teacherId',
            select: 'employeeId userId',
            populate: { path: 'userId', select: 'name email' },
        })
            .populate('academicSessionId', 'name isCurrent');
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        // Role-based visibility check
        if (role === 'student') {
            if (homework.status === 'draft') {
                res.status(404).json({ success: false, message: 'Assignment is not available' });
                return;
            }
            const student = await Student.findOne({ userId, schoolId });
            if (!student) {
                res.status(404).json({ success: false, message: 'Student profile not found' });
                return;
            }
            // Check student enrollment in the target cohort
            if (student.currentClassId &&
                student.currentClassId.toString() !== homework.classId._id.toString()) {
                res.status(403).json({ success: false, message: 'Forbidden: You are not enrolled in this class' });
                return;
            }
            // Fetch student's own submission
            const submission = await AssignmentSubmission.findOne({
                schoolId,
                homeworkId: homework._id,
                studentId: student._id,
            }).lean();
            res.status(200).json({
                success: true,
                data: {
                    ...homework.toObject(),
                    studentSubmission: submission
                        ? {
                            ...submission,
                            marksObtained: submission.isGradeReleased ? submission.marksObtained : undefined,
                            teacherFeedback: submission.isGradeReleased ? submission.teacherFeedback : undefined,
                        }
                        : null,
                },
            });
            return;
        }
        res.status(200).json({ success: true, data: homework });
    }
    catch (err) {
        logger.error('[GetHomeworkById] Error fetching homework details:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve assignment' });
    }
};
// ============================================================================
// 3. Create Homework Assignment
// ============================================================================
export const createHomework = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const validation = createHomeworkSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: validation.error.issues[0]?.message || 'Invalid assignment payload',
                errors: validation.error.issues,
            });
            return;
        }
        const data = validation.data;
        // Cross-entity tenant validation: Class, Section, Subject, Session must belong to school
        const [classDoc, sectionDoc, subjectDoc, sessionDoc] = await Promise.all([
            Class.findOne({ _id: new Types.ObjectId(data.classId), schoolId, isDeleted: false }),
            Section.findOne({ _id: new Types.ObjectId(data.sectionId), schoolId, isDeleted: false }),
            Subject.findOne({ _id: new Types.ObjectId(data.subjectId), schoolId, isDeleted: false }),
            AcademicSession.findOne({ _id: new Types.ObjectId(data.academicSessionId), schoolId, isDeleted: false }),
        ]);
        if (!classDoc || !sectionDoc || !subjectDoc || !sessionDoc) {
            res.status(400).json({
                success: false,
                message: 'Invalid reference: Class, Section, Subject, or Academic Session does not exist in this school',
            });
            return;
        }
        // Determine and verify teacher authorization
        let teacherId;
        if (role === 'teacher') {
            const teacher = await Teacher.findOne({ userId, schoolId });
            if (!teacher) {
                res.status(404).json({ success: false, message: 'Teacher profile not found' });
                return;
            }
            teacherId = teacher._id;
            // Verify teacher authorization for this class/section and subject
            const isAuthorized = await verifyTeacherAuthorization(schoolId, teacherId, new Types.ObjectId(data.classId), new Types.ObjectId(data.sectionId), new Types.ObjectId(data.subjectId));
            if (!isAuthorized) {
                res.status(403).json({
                    success: false,
                    message: 'Forbidden: You are not authorized to create assignments for this class, section, and subject',
                });
                return;
            }
        }
        else {
            // Admin / Super Admin
            if (data.teacherId) {
                const teacher = await Teacher.findOne({ _id: new Types.ObjectId(data.teacherId), schoolId });
                if (!teacher) {
                    res.status(400).json({ success: false, message: 'Specified teacher profile does not exist in this school' });
                    return;
                }
                teacherId = teacher._id;
            }
            else {
                const teacher = await Teacher.findOne({ schoolId, status: 'active' });
                if (!teacher) {
                    res.status(400).json({ success: false, message: 'A teacherId must be provided' });
                    return;
                }
                teacherId = teacher._id;
            }
        }
        const assignedDate = data.assignedDate ? new Date(data.assignedDate) : new Date();
        const publishDate = data.status === 'published' ? (data.publishDate ? new Date(data.publishDate) : new Date()) : undefined;
        const homework = await Homework.create({
            schoolId,
            academicSessionId: new Types.ObjectId(data.academicSessionId),
            classId: new Types.ObjectId(data.classId),
            sectionId: new Types.ObjectId(data.sectionId),
            subjectId: new Types.ObjectId(data.subjectId),
            teacherId,
            title: data.title,
            description: data.description,
            instructions: data.instructions,
            assignmentType: data.assignmentType,
            assignedDate,
            publishDate,
            dueDate: new Date(data.dueDate),
            maxMarks: data.maxMarks,
            isGraded: data.isGraded,
            attachments: data.attachments || [],
            resourceLinks: data.resourceLinks || [],
            submissionSettings: {
                allowLateSubmission: data.submissionSettings?.allowLateSubmission ?? true,
                latePenaltyPercent: data.submissionSettings?.latePenaltyPercent ?? 0,
                allowResubmission: data.submissionSettings?.allowResubmission ?? false,
                maxSubmissions: data.submissionSettings?.maxSubmissions ?? 3,
                cutoffDate: data.submissionSettings?.cutoffDate ? new Date(data.submissionSettings.cutoffDate) : undefined,
            },
            status: data.status,
            version: 1,
        });
        // If published immediately, dispatch non-blocking notifications to enrolled students
        if (homework.status === 'published') {
            const enrollments = await Enrollment.find({
                schoolId,
                classId: new Types.ObjectId(data.classId),
                sectionId: new Types.ObjectId(data.sectionId),
                academicSessionId: new Types.ObjectId(data.academicSessionId),
                status: 'enrolled',
            }).populate('studentId', 'userId');
            for (const enr of enrollments) {
                const studentUserId = enr.studentId?.userId;
                if (studentUserId) {
                    triggerHomeworkNotification(schoolId, studentUserId, `New Assignment: ${homework.title}`, `A new ${homework.assignmentType} has been assigned for ${subjectDoc.name}. Due on ${new Date(homework.dueDate).toLocaleDateString()}.`, homework._id, 'normal');
                }
            }
        }
        const populated = await Homework.findById(homework._id)
            .populate('classId', 'name')
            .populate('sectionId', 'name')
            .populate('subjectId', 'name code')
            .populate({
            path: 'teacherId',
            select: 'employeeId userId',
            populate: { path: 'userId', select: 'name' },
        });
        res.status(201).json({
            success: true,
            message: `Assignment "${homework.title}" created successfully as ${homework.status}`,
            data: populated,
        });
    }
    catch (err) {
        logger.error('[CreateHomework] Error creating homework:', err);
        res.status(500).json({ success: false, message: 'Failed to create assignment' });
    }
};
// ============================================================================
// 4. Update Homework Assignment
// ============================================================================
export const updateHomework = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const validation = updateHomeworkSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid payload' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        // Role verification: only assigned teacher or admin can update
        if (role === 'teacher') {
            const teacher = await Teacher.findOne({ userId, schoolId });
            if (!teacher || homework.teacherId.toString() !== teacher._id.toString()) {
                res.status(403).json({ success: false, message: 'Forbidden: You did not author this assignment' });
                return;
            }
        }
        // Check if existing submissions exist
        const submissionsCount = await AssignmentSubmission.countDocuments({
            schoolId,
            homeworkId: homework._id,
            isDeleted: false,
        });
        const data = validation.data;
        // Published assignments safeguard: cannot reduce maxMarks below highest existing mark
        if (submissionsCount > 0 && data.maxMarks !== undefined && data.maxMarks < homework.maxMarks) {
            const highestSubmission = await AssignmentSubmission.findOne({
                schoolId,
                homeworkId: homework._id,
                isDeleted: false,
            }).sort({ marksObtained: -1 });
            if (highestSubmission?.marksObtained && data.maxMarks < highestSubmission.marksObtained) {
                res.status(400).json({
                    success: false,
                    message: `Cannot reduce maximum marks to ${data.maxMarks}; a student has already obtained ${highestSubmission.marksObtained} marks`,
                });
                return;
            }
        }
        // Apply updates
        if (data.title)
            homework.title = data.title;
        if (data.description !== undefined)
            homework.description = data.description;
        if (data.instructions)
            homework.instructions = data.instructions;
        if (data.dueDate)
            homework.dueDate = new Date(data.dueDate);
        if (data.maxMarks !== undefined)
            homework.maxMarks = data.maxMarks;
        if (data.isGraded !== undefined)
            homework.isGraded = data.isGraded;
        if (data.assignmentType)
            homework.assignmentType = data.assignmentType;
        if (data.attachments)
            homework.attachments = data.attachments;
        if (data.resourceLinks)
            homework.resourceLinks = data.resourceLinks;
        if (data.submissionSettings) {
            homework.submissionSettings = {
                ...homework.submissionSettings,
                ...data.submissionSettings,
                cutoffDate: data.submissionSettings.cutoffDate
                    ? new Date(data.submissionSettings.cutoffDate)
                    : homework.submissionSettings.cutoffDate,
            };
        }
        if (data.status)
            homework.status = data.status;
        homework.version = (homework.version || 1) + 1;
        await homework.save();
        res.status(200).json({
            success: true,
            message: 'Assignment updated successfully',
            data: homework,
        });
    }
    catch (err) {
        logger.error('[UpdateHomework] Error updating homework:', err);
        res.status(500).json({ success: false, message: 'Failed to update assignment' });
    }
};
// ============================================================================
// 5. Publish Homework Assignment
// ============================================================================
export const publishHomework = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        if (homework.status === 'published') {
            res.status(400).json({ success: false, message: 'Assignment is already published' });
            return;
        }
        homework.status = 'published';
        homework.publishDate = new Date();
        await homework.save();
        // Notify enrolled students
        const enrollments = await Enrollment.find({
            schoolId,
            classId: homework.classId,
            sectionId: homework.sectionId,
            academicSessionId: homework.academicSessionId,
            status: 'enrolled',
        }).populate('studentId', 'userId');
        for (const enr of enrollments) {
            const studentUserId = enr.studentId?.userId;
            if (studentUserId) {
                triggerHomeworkNotification(schoolId, studentUserId, `Assignment Published: ${homework.title}`, `Your teacher has published ${homework.title}. Due date: ${new Date(homework.dueDate).toLocaleDateString()}`, homework._id, 'high');
            }
        }
        res.status(200).json({
            success: true,
            message: `Assignment "${homework.title}" published successfully`,
            data: homework,
        });
    }
    catch (err) {
        logger.error('[PublishHomework] Error publishing assignment:', err);
        res.status(500).json({ success: false, message: 'Failed to publish assignment' });
    }
};
// ============================================================================
// 6. Archive Homework Assignment (Preserves History)
// ============================================================================
export const archiveHomework = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const validation = archiveHomeworkSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid reason' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        homework.status = 'archived';
        homework.archiveReason = validation.data.archiveReason;
        homework.archivedBy = userId;
        homework.archivedAt = new Date();
        await homework.save();
        res.status(200).json({
            success: true,
            message: `Assignment "${homework.title}" archived successfully. Historical submissions are preserved.`,
            data: homework,
        });
    }
    catch (err) {
        logger.error('[ArchiveHomework] Error archiving assignment:', err);
        res.status(500).json({ success: false, message: 'Failed to archive assignment' });
    }
};
// ============================================================================
// 7. List Submissions / Roster (Role-Aware)
// ============================================================================
export const listSubmissions = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        // Role-specific enforcement
        if (role === 'student') {
            const student = await Student.findOne({ userId, schoolId });
            if (!student) {
                res.status(404).json({ success: false, message: 'Student profile not found' });
                return;
            }
            // Students can ONLY view their own submission
            const submission = await AssignmentSubmission.findOne({
                schoolId,
                homeworkId: homework._id,
                studentId: student._id,
            }).lean();
            res.status(200).json({
                success: true,
                data: submission
                    ? [
                        {
                            ...submission,
                            marksObtained: submission.isGradeReleased ? submission.marksObtained : undefined,
                            teacherFeedback: submission.isGradeReleased ? submission.teacherFeedback : undefined,
                        },
                    ]
                    : [],
            });
            return;
        }
        if (role === 'parent') {
            const parent = await Parent.findOne({ userId, schoolId });
            if (!parent) {
                res.status(404).json({ success: false, message: 'Parent profile not found' });
                return;
            }
            const wardIds = parent.children.map((c) => c.studentProfileId);
            const submissions = await AssignmentSubmission.find({
                schoolId,
                homeworkId: homework._id,
                studentId: { $in: wardIds },
            }).lean();
            const sanitized = submissions.map((s) => ({
                ...s,
                marksObtained: s.isGradeReleased ? s.marksObtained : undefined,
                teacherFeedback: s.isGradeReleased ? s.teacherFeedback : undefined,
            }));
            res.status(200).json({ success: true, data: sanitized });
            return;
        }
        // Teacher & Admin: Return full eligible cohort roster with submission statuses
        const enrollments = await Enrollment.find({
            schoolId,
            classId: homework.classId,
            sectionId: homework.sectionId,
            academicSessionId: homework.academicSessionId,
            status: 'enrolled',
        })
            .populate({
            path: 'studentId',
            select: 'admissionNumber rollNumber userId',
            populate: { path: 'userId', select: 'name email' },
        })
            .sort({ rollNumber: 1 });
        const existingSubmissions = await AssignmentSubmission.find({
            schoolId,
            homeworkId: homework._id,
        })
            .populate('gradedBy', 'name email')
            .lean();
        const submissionMap = new Map(existingSubmissions.map((s) => [s.studentId.toString(), s]));
        const roster = enrollments.map((enr) => {
            const studentObj = enr.studentId;
            const sub = studentObj ? submissionMap.get(studentObj._id.toString()) : null;
            return {
                enrollmentId: enr._id,
                studentId: studentObj?._id,
                studentName: studentObj?.userId?.name || 'Unknown Student',
                studentEmail: studentObj?.userId?.email,
                admissionNumber: studentObj?.admissionNumber,
                rollNumber: enr.rollNumber || studentObj?.rollNumber,
                submission: sub || null,
                status: sub ? sub.status : 'missing',
            };
        });
        res.status(200).json({
            success: true,
            data: roster,
            totalStudents: enrollments.length,
            submittedCount: existingSubmissions.length,
        });
    }
    catch (err) {
        logger.error('[ListSubmissions] Error retrieving submissions:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve submission roster' });
    }
};
// ============================================================================
// 8. Submit Assignment (Student Role Only)
// ============================================================================
export const createSubmission = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const id = req.params.id;
        if (role !== 'student') {
            res.status(403).json({ success: false, message: 'Only students can submit assignments' });
            return;
        }
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const validation = createSubmissionSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid submission' });
            return;
        }
        const student = await Student.findOne({ userId, schoolId });
        if (!student) {
            res.status(404).json({ success: false, message: 'Student profile not found' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        if (homework.status !== 'published') {
            res.status(400).json({
                success: false,
                message: `Cannot submit to assignment in "${homework.status}" state`,
            });
            return;
        }
        // Check enrollment eligibility
        const isEnrolled = await Enrollment.findOne({
            schoolId,
            studentId: student._id,
            classId: homework.classId,
            sectionId: homework.sectionId,
            academicSessionId: homework.academicSessionId,
            status: 'enrolled',
        });
        if (!isEnrolled) {
            res.status(403).json({
                success: false,
                message: 'Forbidden: You are not actively enrolled in this class and section',
            });
            return;
        }
        // Evaluate late policy server-side
        const submittedAt = new Date();
        const lateStatus = calculateLateStatus(homework.dueDate, homework.submissionSettings?.cutoffDate, homework.submissionSettings?.allowLateSubmission ?? true, submittedAt);
        if (!lateStatus.isAcceptable) {
            res.status(400).json({
                success: false,
                message: lateStatus.reason || 'Submission is not accepted after the deadline',
            });
            return;
        }
        // Check existing submission
        const existingSubmission = await AssignmentSubmission.findOne({
            schoolId,
            homeworkId: homework._id,
            studentId: student._id,
        });
        const data = validation.data;
        if (existingSubmission) {
            const canResubmit = existingSubmission.status === 'returned' ||
                homework.submissionSettings?.allowResubmission === true;
            if (!canResubmit) {
                res.status(409).json({
                    success: false,
                    message: 'A submission already exists for this assignment. Resubmission is not permitted unless requested by your teacher.',
                });
                return;
            }
            const maxSubmissions = homework.submissionSettings?.maxSubmissions || 3;
            if (existingSubmission.revisionNumber >= maxSubmissions) {
                res.status(400).json({
                    success: false,
                    message: `Maximum revision limit of ${maxSubmissions} attempts has been reached.`,
                });
                return;
            }
            existingSubmission.history.push({
                revisionNumber: existingSubmission.revisionNumber,
                submittedAt: existingSubmission.submittedAt,
                submissionText: existingSubmission.submissionText,
                attachments: existingSubmission.attachments,
                status: existingSubmission.status,
                marksObtained: existingSubmission.marksObtained,
                teacherFeedback: existingSubmission.teacherFeedback,
            });
            existingSubmission.revisionNumber += 1;
            existingSubmission.submittedAt = submittedAt;
            existingSubmission.submissionText = data.submissionText;
            existingSubmission.attachments = data.attachments;
            existingSubmission.isLate = lateStatus.isLate;
            existingSubmission.status = lateStatus.isLate ? 'late' : 'resubmitted';
            existingSubmission.isGradeReleased = false;
            await existingSubmission.save();
            res.status(200).json({
                success: true,
                message: `Revision #${existingSubmission.revisionNumber} submitted successfully${lateStatus.isLate ? ' (marked Late)' : ''}`,
                data: existingSubmission,
            });
            return;
        }
        // Create fresh initial submission
        const submission = await AssignmentSubmission.create({
            schoolId,
            homeworkId: homework._id,
            studentId: student._id,
            submittedAt,
            submissionText: data.submissionText,
            attachments: data.attachments || [],
            status: lateStatus.isLate ? 'late' : 'submitted',
            isLate: lateStatus.isLate,
            revisionNumber: 1,
            history: [],
            isGradeReleased: false,
        });
        // Notify teacher non-blockingly
        const teacher = await Teacher.findById(homework.teacherId);
        if (teacher?.userId) {
            triggerHomeworkNotification(schoolId, teacher.userId, `New Submission: ${homework.title}`, `Student submitted assignment ${homework.title}${lateStatus.isLate ? ' (Late)' : ''}.`, homework._id, 'normal');
        }
        res.status(201).json({
            success: true,
            message: `Assignment submitted successfully${lateStatus.isLate ? ' (marked Late)' : ''}`,
            data: submission,
        });
    }
    catch (err) {
        logger.error('[CreateSubmission] Error processing submission:', err);
        res.status(500).json({ success: false, message: 'Failed to process submission' });
    }
};
// ============================================================================
// 9. Grade Submission (Teacher / Admin)
// ============================================================================
export const gradeSubmission = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        const submissionId = req.params.submissionId;
        if (!Types.ObjectId.isValid(submissionId)) {
            res.status(400).json({ success: false, message: 'Invalid submission ID' });
            return;
        }
        const validation = gradeSubmissionSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid grade payload' });
            return;
        }
        const submission = await AssignmentSubmission.findOne({
            _id: new Types.ObjectId(submissionId),
            schoolId,
            isDeleted: false,
        });
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }
        const homework = await Homework.findById(submission.homeworkId);
        if (!homework) {
            res.status(404).json({ success: false, message: 'Associated assignment not found' });
            return;
        }
        if (role === 'teacher') {
            const teacher = await Teacher.findOne({ userId, schoolId });
            if (!teacher || homework.teacherId.toString() !== teacher._id.toString()) {
                res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to grade this assignment' });
                return;
            }
        }
        const { marksObtained, teacherFeedback, releaseGrade } = validation.data;
        if (marksObtained > homework.maxMarks) {
            res.status(400).json({
                success: false,
                message: `Marks obtained (${marksObtained}) cannot exceed maximum marks (${homework.maxMarks})`,
            });
            return;
        }
        submission.marksObtained = marksObtained;
        if (teacherFeedback !== undefined)
            submission.teacherFeedback = teacherFeedback;
        submission.gradedBy = userId;
        submission.gradedAt = new Date();
        submission.status = 'graded';
        if (releaseGrade) {
            submission.isGradeReleased = true;
            submission.releasedAt = new Date();
            const student = await Student.findById(submission.studentId);
            if (student?.userId) {
                triggerHomeworkNotification(schoolId, student.userId, `Grade Released: ${homework.title}`, `Your grade for ${homework.title} has been released: ${marksObtained} / ${homework.maxMarks}.`, homework._id, 'high');
            }
        }
        await submission.save();
        res.status(200).json({
            success: true,
            message: `Submission graded successfully${releaseGrade ? ' and grade released to student' : ''}`,
            data: submission,
        });
    }
    catch (err) {
        logger.error('[GradeSubmission] Error grading submission:', err);
        res.status(500).json({ success: false, message: 'Failed to record grade' });
    }
};
// ============================================================================
// 10. Return Submission For Revision (Teacher / Admin)
// ============================================================================
export const returnSubmission = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        const submissionId = req.params.submissionId;
        if (!Types.ObjectId.isValid(submissionId)) {
            res.status(400).json({ success: false, message: 'Invalid submission ID' });
            return;
        }
        const validation = returnSubmissionSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid feedback' });
            return;
        }
        const submission = await AssignmentSubmission.findOne({
            _id: new Types.ObjectId(submissionId),
            schoolId,
            isDeleted: false,
        });
        if (!submission) {
            res.status(404).json({ success: false, message: 'Submission not found' });
            return;
        }
        const homework = await Homework.findById(submission.homeworkId);
        if (!homework) {
            res.status(404).json({ success: false, message: 'Associated assignment not found' });
            return;
        }
        submission.status = 'returned';
        submission.teacherFeedback = validation.data.teacherFeedback;
        submission.gradedBy = userId;
        submission.gradedAt = new Date();
        submission.isGradeReleased = true;
        await submission.save();
        const student = await Student.findById(submission.studentId);
        if (student?.userId) {
            triggerHomeworkNotification(schoolId, student.userId, `Revision Requested: ${homework.title}`, `Your submission for ${homework.title} was returned for revision. Note: ${validation.data.teacherFeedback}`, homework._id, 'high');
        }
        res.status(200).json({
            success: true,
            message: 'Submission returned to student for revision',
            data: submission,
        });
    }
    catch (err) {
        logger.error('[ReturnSubmission] Error returning submission:', err);
        res.status(500).json({ success: false, message: 'Failed to return submission' });
    }
};
// ============================================================================
// 11. Release Grades (Teacher / Admin)
// ============================================================================
export const releaseGrades = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const validation = releaseGradeSchema.safeParse(req.body);
        const filter = {
            schoolId,
            homeworkId: new Types.ObjectId(id),
            status: 'graded',
            isGradeReleased: false,
        };
        if (validation.success && validation.data?.submissionIds && validation.data.submissionIds.length > 0) {
            filter._id = { $in: validation.data.submissionIds.map((sid) => new Types.ObjectId(sid)) };
        }
        const result = await AssignmentSubmission.updateMany(filter, {
            $set: {
                isGradeReleased: true,
                releasedAt: new Date(),
            },
        });
        res.status(200).json({
            success: true,
            message: `Successfully released grades for ${result.modifiedCount} submission(s)`,
            modifiedCount: result.modifiedCount,
        });
    }
    catch (err) {
        logger.error('[ReleaseGrades] Error releasing grades:', err);
        res.status(500).json({ success: false, message: 'Failed to release grades' });
    }
};
// ============================================================================
// 12. Get Assignment Summary & Analytics
// ============================================================================
export const getHomeworkSummary = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid assignment ID' });
            return;
        }
        const homework = await Homework.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!homework) {
            res.status(404).json({ success: false, message: 'Assignment not found' });
            return;
        }
        const stats = await computeAssignmentCompletion(schoolId, homework._id, homework.classId, homework.sectionId, homework.academicSessionId);
        res.status(200).json({
            success: true,
            data: {
                homeworkId: homework._id,
                title: homework.title,
                dueDate: homework.dueDate,
                isOverdue: homework.isOverdue,
                ...stats,
            },
        });
    }
    catch (err) {
        logger.error('[GetHomeworkSummary] Error computing homework summary:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve assignment analytics' });
    }
};
// ============================================================================
// 13. Upload Attachment
// ============================================================================
export const uploadAttachment = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const { name, mimetype, size, base64Data } = req.body;
        if (!name || !mimetype || !size) {
            res.status(400).json({
                success: false,
                message: 'File metadata (name, mimetype, size) is required',
            });
            return;
        }
        const buffer = base64Data ? Buffer.from(base64Data, 'base64') : undefined;
        const attachment = await uploadHomeworkAttachment(schoolId, {
            originalname: name,
            mimetype,
            size: Number(size),
            buffer,
        });
        res.status(200).json({
            success: true,
            message: 'Attachment processed successfully',
            data: attachment,
        });
    }
    catch (err) {
        logger.error('[UploadAttachment] Error uploading attachment:', err);
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to upload attachment',
        });
    }
};
