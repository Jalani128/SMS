import { Types } from 'mongoose';
import { Enrollment } from '../models/Enrollment.model.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.model.js';
import { SubjectAssignment } from '../models/SubjectAssignment.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Notification } from '../models/Notification.model.js';
import { logger } from './logger.js';
/**
 * Evaluates whether a submission is on-time, late, or unacceptable under assignment rules.
 */
export const calculateLateStatus = (dueDate, cutoffDate, allowLate = true, submittedAt = new Date()) => {
    const submitTime = new Date(submittedAt).getTime();
    const dueTime = new Date(dueDate).getTime();
    if (submitTime <= dueTime) {
        return { isLate: false, isAcceptable: true };
    }
    // Submission is past the due date
    if (!allowLate) {
        return {
            isLate: true,
            isAcceptable: false,
            reason: 'Late submissions are not accepted for this assignment.',
        };
    }
    if (cutoffDate) {
        const cutoffTime = new Date(cutoffDate).getTime();
        if (submitTime > cutoffTime) {
            return {
                isLate: true,
                isAcceptable: false,
                reason: 'The final cutoff deadline for late submissions has passed.',
            };
        }
    }
    return { isLate: true, isAcceptable: true };
};
/**
 * Computes assignment completion and submission statistics for an eligible cohort.
 */
export const computeAssignmentCompletion = async (schoolId, homeworkId, classId, sectionId, academicSessionId) => {
    // 1. Count eligible active enrolled students (transferred/dropped students are excluded)
    const eligibleStudents = await Enrollment.countDocuments({
        schoolId,
        classId,
        sectionId,
        academicSessionId,
        status: 'enrolled',
    });
    // 2. Aggregate active submissions for this homework by status
    const submissionCounts = await AssignmentSubmission.aggregate([
        {
            $match: {
                schoolId: new Types.ObjectId(schoolId.toString()),
                homeworkId: new Types.ObjectId(homeworkId.toString()),
            },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);
    let submittedCount = 0;
    let lateCount = 0;
    let gradedCount = 0;
    let returnedCount = 0;
    for (const group of submissionCounts) {
        switch (group._id) {
            case 'submitted':
                submittedCount = group.count;
                break;
            case 'late':
                lateCount = group.count;
                break;
            case 'graded':
                gradedCount = group.count;
                break;
            case 'returned':
                returnedCount = group.count;
                break;
            case 'resubmitted':
                submittedCount += group.count;
                break;
        }
    }
    const totalSubmissions = submittedCount + lateCount + gradedCount + returnedCount;
    const missingCount = Math.max(0, eligibleStudents - totalSubmissions);
    const completionRate = eligibleStudents > 0 ? Math.round((totalSubmissions / eligibleStudents) * 100) : 0;
    return {
        eligibleStudents,
        totalSubmissions,
        submittedCount,
        lateCount,
        gradedCount,
        returnedCount,
        missingCount,
        completionRate,
    };
};
/**
 * Checks whether a teacher is authorized to create/manage homework for a class, section, and subject.
 */
export const verifyTeacherAuthorization = async (schoolId, teacherId, classId, sectionId, subjectId) => {
    // 1. Direct active SubjectAssignment verification
    const assignmentQuery = {
        schoolId,
        teacherId,
        classId,
        status: 'active',
    };
    if (sectionId) {
        assignmentQuery.$or = [{ sectionId }, { sectionId: { $exists: false } }, { sectionId: null }];
    }
    if (subjectId) {
        assignmentQuery.subjectId = subjectId;
    }
    const assignment = await SubjectAssignment.findOne(assignmentQuery);
    if (assignment)
        return true;
    // 2. Fallback check against teacher profile assignedClassIds & assignedSubjectIds
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher)
        return false;
    const teachesClass = teacher.assignedClassIds?.some((c) => c.toString() === classId.toString());
    if (subjectId && teachesClass) {
        const teachesSubject = teacher.assignedSubjectIds?.some((s) => s.toString() === subjectId.toString());
        return !!teachesSubject;
    }
    return !!teachesClass;
};
/**
 * Non-blocking academic event notification dispatch.
 */
export const triggerHomeworkNotification = async (schoolId, recipientUserId, title, content, homeworkId, priority = 'normal') => {
    try {
        await Notification.create({
            schoolId,
            recipientId: recipientUserId,
            category: 'academic',
            title,
            content,
            isRead: false,
            priority,
            resourceType: 'Homework',
            resourceId: homeworkId,
        });
    }
    catch (err) {
        logger.warn('[HomeworkNotification] Non-blocking academic notification dispatch failed:', err);
    }
};
