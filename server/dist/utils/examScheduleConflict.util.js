import { ExamSubject } from '../models/ExamSubject.model.js';
/**
 * Validates 24-hour time string in HH:mm format
 */
export const isValid24HourTime = (time) => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
};
/**
 * Validates that startTime is strictly before endTime
 */
export const isValidTimeRange = (startTime, endTime) => {
    if (!isValid24HourTime(startTime) || !isValid24HourTime(endTime))
        return false;
    return startTime < endTime;
};
/**
 * Half-open interval mathematical overlap check:
 * Two intervals [startA, endA) and [startB, endB) overlap iff:
 * startA < endB && startB < endA
 *
 * This guarantees adjacent slots (e.g. 09:00-10:00 and 10:00-11:00) DO NOT collide.
 */
export const isTimeIntervalOverlapping = (startA, endA, startB, endB) => {
    return startA < endB && startB < endA;
};
/**
 * Checks if candidate exam schedule conflicts with any active schedule for the same date:
 * 1. Same class / section has another exam during overlapping time window
 * 2. Same teacher / examiner is assigned to another exam at overlapping time
 * 3. Same room is occupied by another exam at overlapping time
 */
export const checkExamScheduleConflicts = async (params) => {
    const { schoolId, academicSessionId, classId, sectionId, examDate, startTime, endTime, teacherId, room, excludeExamSubjectId, } = params;
    if (!isValidTimeRange(startTime, endTime)) {
        return {
            hasConflict: true,
            message: `Invalid time range: startTime (${startTime}) must be strictly earlier than endTime (${endTime})`,
        };
    }
    // Normalize date window for the entire day (00:00:00.000 to 23:59:59.999 UTC/Local)
    const dayStart = new Date(examDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(examDate);
    dayEnd.setHours(23, 59, 59, 999);
    const query = {
        schoolId,
        academicSessionId,
        examDate: { $gte: dayStart, $lte: dayEnd },
        status: { $ne: 'cancelled' },
    };
    if (excludeExamSubjectId) {
        query._id = { $ne: excludeExamSubjectId };
    }
    // Find all scheduled exam subjects for that day
    const existingSchedules = await ExamSubject.find(query).lean();
    for (const existing of existingSchedules) {
        // Check half-open time overlap
        if (!isTimeIntervalOverlapping(startTime, endTime, existing.startTime, existing.endTime)) {
            continue;
        }
        const confData = {
            id: existing._id.toString(),
            subjectId: existing.subjectId.toString(),
            examId: existing.examId.toString(),
            startTime: existing.startTime,
            endTime: existing.endTime,
            room: existing.room,
        };
        // 1. Check Class / Section collision
        const sameClass = existing.classId.toString() === classId.toString();
        const sameSection = !sectionId || !existing.sectionId || existing.sectionId.toString() === sectionId.toString();
        if (sameClass && sameSection) {
            return {
                hasConflict: true,
                conflictType: 'class_cohort',
                message: `Class schedule conflict: Class/Section already has an exam scheduled from ${existing.startTime} to ${existing.endTime}`,
                conflictingSubject: confData,
            };
        }
        // 2. Check Teacher collision (if teacher specified)
        if (teacherId &&
            existing.teacherId &&
            existing.teacherId.toString() === teacherId.toString()) {
            return {
                hasConflict: true,
                conflictType: 'teacher_collision',
                message: `Teacher schedule conflict: Assigned examiner/teacher is already scheduled from ${existing.startTime} to ${existing.endTime}`,
                conflictingSubject: confData,
            };
        }
        // 3. Check Room collision (if room specified)
        if (room &&
            existing.room &&
            existing.room.trim().toLowerCase() === room.trim().toLowerCase()) {
            return {
                hasConflict: true,
                conflictType: 'room_collision',
                message: `Room conflict: Room "${room}" is already reserved for an exam from ${existing.startTime} to ${existing.endTime}`,
                conflictingSubject: confData,
            };
        }
    }
    return { hasConflict: false };
};
