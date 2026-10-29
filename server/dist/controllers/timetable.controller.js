import { Types } from 'mongoose';
import { Timetable } from '../models/Timetable.model.js';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { Subject } from '../models/Subject.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Student } from '../models/Student.model.js';
import { Parent } from '../models/Parent.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { createTimetableSlotSchema, updateTimetableSlotSchema, copyDaySchema, duplicateTimetableSchema, queryTimetableSchema, } from '../validations/timetable.validation.js';
import { checkTimetableConflicts, isValidTimeRange, } from '../utils/timetableConflict.util.js';
import { verifyTeacherAuthorization } from '../utils/homework.util.js';
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
const WEEKDAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];
// Helper to determine today's DayOfWeek
export const getDayOfWeekString = (date = new Date()) => {
    const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday...
    const map = {
        0: 'sunday',
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
    };
    return map[dayIndex] || 'monday';
};
// ============================================================================
// 1. List Timetable Entries (Role-Aware)
// ============================================================================
export const listTimetable = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const queryParsed = queryTimetableSchema.safeParse(req.query);
        if (!queryParsed.success) {
            res.status(400).json({ success: false, message: queryParsed.error.issues[0]?.message || 'Invalid query' });
            return;
        }
        const { academicSessionId, classId, sectionId, teacherId, dayOfWeek, room, status } = queryParsed.data;
        const filter = { schoolId, isDeleted: false };
        // Status filter
        if (status && status !== 'all') {
            filter.status = status;
        }
        else if (!status) {
            filter.status = 'active'; // Default active slots
        }
        // Role-based restrictions
        if (role === 'student') {
            const student = await Student.findOne({ userId, schoolId });
            if (!student) {
                res.status(404).json({ success: false, message: 'Student profile not found' });
                return;
            }
            // Automatically filter by student's enrolled section
            if (student.currentSectionId) {
                filter.sectionId = student.currentSectionId;
            }
            if (student.currentClassId) {
                filter.classId = student.currentClassId;
            }
        }
        else if (role === 'parent') {
            const parent = await Parent.findOne({ userId, schoolId });
            if (!parent) {
                res.status(404).json({ success: false, message: 'Parent profile not found' });
                return;
            }
            const wardIdParam = req.query.wardId;
            if (wardIdParam) {
                const isLinked = parent.children.some((c) => c.studentProfileId.toString() === wardIdParam);
                if (!isLinked) {
                    res.status(403).json({ success: false, message: 'Forbidden: Ward not linked to parent profile' });
                    return;
                }
                const wardStudent = await Student.findOne({ _id: new Types.ObjectId(wardIdParam), schoolId });
                if (wardStudent?.currentSectionId) {
                    filter.sectionId = wardStudent.currentSectionId;
                }
            }
        }
        else if (role === 'teacher') {
            const teacher = await Teacher.findOne({ userId, schoolId });
            // If teacher does not explicitly provide class/section filter, show their schedule
            if (teacher && !sectionId && !classId && !teacherId) {
                filter.teacherId = teacher._id;
            }
        }
        // Explicit parameters
        if (academicSessionId)
            filter.academicSessionId = new Types.ObjectId(academicSessionId);
        if (classId)
            filter.classId = new Types.ObjectId(classId);
        if (sectionId)
            filter.sectionId = new Types.ObjectId(sectionId);
        if (teacherId)
            filter.teacherId = new Types.ObjectId(teacherId);
        if (dayOfWeek && dayOfWeek !== 'all')
            filter.dayOfWeek = dayOfWeek;
        if (room)
            filter.room = { $regex: new RegExp(`^${room.trim()}$`, 'i') };
        const slots = await Timetable.find(filter)
            .populate('classId', 'name stage')
            .populate('sectionId', 'name roomNumber')
            .populate('subjectId', 'name code')
            .populate({
            path: 'teacherId',
            select: 'employeeId userId',
            populate: { path: 'userId', select: 'name email' },
        })
            .populate('academicSessionId', 'name isCurrent')
            .sort({ dayOfWeek: 1, periodNumber: 1, startTime: 1 })
            .lean();
        // Grouping by day of week for convenient schedule matrix display
        const groupedByDay = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
        };
        for (const slot of slots) {
            if (groupedByDay[slot.dayOfWeek]) {
                groupedByDay[slot.dayOfWeek].push(slot);
            }
        }
        res.status(200).json({
            success: true,
            data: slots,
            groupedByDay,
            totalSlots: slots.length,
        });
    }
    catch (err) {
        logger.error('[ListTimetable] Error listing timetable:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve timetable' });
    }
};
// ============================================================================
// 2. Get Timetable Slot Details
// ============================================================================
export const getTimetableById = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid slot ID format' });
            return;
        }
        const slot = await Timetable.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false })
            .populate('classId', 'name stage')
            .populate('sectionId', 'name roomNumber')
            .populate('subjectId', 'name code')
            .populate({
            path: 'teacherId',
            select: 'employeeId userId',
            populate: { path: 'userId', select: 'name email' },
        })
            .populate('academicSessionId', 'name isCurrent');
        if (!slot) {
            res.status(404).json({ success: false, message: 'Timetable entry not found' });
            return;
        }
        res.status(200).json({ success: true, data: slot });
    }
    catch (err) {
        logger.error('[GetTimetableById] Error fetching slot details:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve slot details' });
    }
};
// ============================================================================
// 3. Create Timetable Entry (Server-Side Conflict Checks)
// ============================================================================
export const createTimetableSlot = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const validation = createTimetableSlotSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                success: false,
                message: validation.error.issues[0]?.message || 'Invalid slot definition',
                errors: validation.error.issues,
            });
            return;
        }
        const data = validation.data;
        // Cross-entity validation: Class, Section, Session must belong to this school
        const [classDoc, sectionDoc, sessionDoc] = await Promise.all([
            Class.findOne({ _id: new Types.ObjectId(data.classId), schoolId, isDeleted: false }),
            Section.findOne({ _id: new Types.ObjectId(data.sectionId), schoolId, isDeleted: false }),
            AcademicSession.findOne({ _id: new Types.ObjectId(data.academicSessionId), schoolId, isDeleted: false }),
        ]);
        if (!classDoc || !sectionDoc || !sessionDoc) {
            res.status(400).json({
                success: false,
                message: 'Invalid reference: Class, Section, or Academic Session does not exist in this school',
            });
            return;
        }
        // Verify section belongs to class
        if (sectionDoc.classId.toString() !== classDoc._id.toString()) {
            res.status(400).json({
                success: false,
                message: `Section "${sectionDoc.name}" does not belong to Class "${classDoc.name}"`,
            });
            return;
        }
        let subjectObjectId;
        let teacherObjectId;
        // If instructional period (not a break), validate subject and teacher
        if (data.entryType !== 'break' && data.entryType !== 'assembly') {
            if (!data.subjectId || !data.teacherId) {
                res.status(400).json({
                    success: false,
                    message: 'Subject and teacher are required for instructional periods',
                });
                return;
            }
            subjectObjectId = new Types.ObjectId(data.subjectId);
            teacherObjectId = new Types.ObjectId(data.teacherId);
            const [subjectDoc, teacherDoc] = await Promise.all([
                Subject.findOne({ _id: subjectObjectId, schoolId, isDeleted: false }),
                Teacher.findOne({ _id: teacherObjectId, schoolId, isDeleted: false }),
            ]);
            if (!subjectDoc || !teacherDoc) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid reference: Subject or Teacher does not exist in this school',
                });
                return;
            }
            // Check teacher authorization for this class/section and subject
            const isAuthorized = await verifyTeacherAuthorization(schoolId, teacherObjectId, classDoc._id, sectionDoc._id, subjectObjectId);
            if (!isAuthorized) {
                res.status(403).json({
                    success: false,
                    message: `Teacher ${teacherDoc.employeeId} is not assigned to teach ${subjectDoc.name} in ${classDoc.name} - ${sectionDoc.name}`,
                });
                return;
            }
        }
        // Server-side Conflict Detection (Teacher, Section, Room)
        const conflictResult = await checkTimetableConflicts({
            schoolId,
            academicSessionId: sessionDoc._id,
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            teacherId: teacherObjectId,
            sectionId: sectionDoc._id,
            room: data.room,
        });
        if (conflictResult.hasConflict) {
            res.status(409).json({
                success: false,
                conflictType: conflictResult.conflictType,
                message: conflictResult.message,
                conflictingSlot: conflictResult.conflictingSlot,
            });
            return;
        }
        // Create Timetable Slot
        const slot = await Timetable.create({
            schoolId,
            academicSessionId: sessionDoc._id,
            classId: classDoc._id,
            sectionId: sectionDoc._id,
            subjectId: subjectObjectId,
            teacherId: teacherObjectId,
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            room: data.room.trim(),
            periodNumber: data.periodNumber,
            entryType: data.entryType,
            notes: data.notes,
            status: data.status,
            createdBy: userId,
        });
        const populated = await Timetable.findById(slot._id)
            .populate('classId', 'name')
            .populate('sectionId', 'name')
            .populate('subjectId', 'name code')
            .populate({
            path: 'teacherId',
            select: 'employeeId userId',
            populate: { path: 'userId', select: 'name email' },
        });
        res.status(201).json({
            success: true,
            message: `Period ${slot.periodNumber} (${slot.dayOfWeek}) created successfully`,
            data: populated,
        });
    }
    catch (err) {
        logger.error('[CreateTimetableSlot] Error creating slot:', err);
        res.status(500).json({ success: false, message: 'Failed to create timetable slot' });
    }
};
// ============================================================================
// 4. Update Timetable Entry (Revalidates Conflicts, Excludes Self)
// ============================================================================
export const updateTimetableSlot = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid slot ID' });
            return;
        }
        const validation = updateTimetableSlotSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid update payload' });
            return;
        }
        const slot = await Timetable.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!slot) {
            res.status(404).json({ success: false, message: 'Timetable slot not found' });
            return;
        }
        const data = validation.data;
        const dayOfWeek = data.dayOfWeek || slot.dayOfWeek;
        const startTime = data.startTime || slot.startTime;
        const endTime = data.endTime || slot.endTime;
        const room = data.room || slot.room;
        const teacherId = data.teacherId !== undefined
            ? data.teacherId
                ? new Types.ObjectId(data.teacherId)
                : undefined
            : slot.teacherId;
        if (!isValidTimeRange(startTime, endTime)) {
            res.status(400).json({ success: false, message: 'End time must be after start time' });
            return;
        }
        // Run conflict detection excluding current slot
        const conflictResult = await checkTimetableConflicts({
            schoolId: slot.schoolId,
            academicSessionId: slot.academicSessionId,
            dayOfWeek,
            startTime,
            endTime,
            teacherId,
            sectionId: slot.sectionId,
            room,
            excludeSlotId: slot._id,
        });
        if (conflictResult.hasConflict) {
            res.status(409).json({
                success: false,
                conflictType: conflictResult.conflictType,
                message: conflictResult.message,
                conflictingSlot: conflictResult.conflictingSlot,
            });
            return;
        }
        // Apply updates
        if (data.subjectId !== undefined) {
            slot.subjectId = data.subjectId ? new Types.ObjectId(data.subjectId) : undefined;
        }
        if (data.teacherId !== undefined) {
            slot.teacherId = data.teacherId ? new Types.ObjectId(data.teacherId) : undefined;
        }
        if (data.dayOfWeek)
            slot.dayOfWeek = data.dayOfWeek;
        if (data.startTime)
            slot.startTime = data.startTime;
        if (data.endTime)
            slot.endTime = data.endTime;
        if (data.room)
            slot.room = data.room.trim();
        if (data.periodNumber)
            slot.periodNumber = data.periodNumber;
        if (data.entryType)
            slot.entryType = data.entryType;
        if (data.notes !== undefined)
            slot.notes = data.notes;
        if (data.status)
            slot.status = data.status;
        await slot.save();
        res.status(200).json({
            success: true,
            message: 'Timetable slot updated successfully',
            data: slot,
        });
    }
    catch (err) {
        logger.error('[UpdateTimetableSlot] Error updating slot:', err);
        res.status(500).json({ success: false, message: 'Failed to update timetable slot' });
    }
};
// ============================================================================
// 5. Archive Timetable Entry
// ============================================================================
export const archiveTimetableSlot = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid slot ID' });
            return;
        }
        const slot = await Timetable.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!slot) {
            res.status(404).json({ success: false, message: 'Timetable slot not found' });
            return;
        }
        slot.status = 'archived';
        await slot.save();
        res.status(200).json({
            success: true,
            message: `Period slot archived successfully`,
            data: slot,
        });
    }
    catch (err) {
        logger.error('[ArchiveTimetableSlot] Error archiving slot:', err);
        res.status(500).json({ success: false, message: 'Failed to archive timetable slot' });
    }
};
// ============================================================================
// 6. Delete Timetable Entry (Soft Delete)
// ============================================================================
export const deleteTimetableSlot = async (req, res) => {
    try {
        const { schoolId } = getContext(req);
        const id = req.params.id;
        if (!Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid slot ID' });
            return;
        }
        const slot = await Timetable.findOne({ _id: new Types.ObjectId(id), schoolId, isDeleted: false });
        if (!slot) {
            res.status(404).json({ success: false, message: 'Timetable slot not found' });
            return;
        }
        await slot.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Timetable slot deleted successfully',
        });
    }
    catch (err) {
        logger.error('[DeleteTimetableSlot] Error deleting slot:', err);
        res.status(500).json({ success: false, message: 'Failed to delete timetable slot' });
    }
};
// ============================================================================
// 7. Today's Lessons & Next Upcoming Lesson
// ============================================================================
export const getTodaySchedule = async (req, res) => {
    try {
        const { schoolId, userId, role } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const todayDayOfWeek = getDayOfWeekString();
        const filter = {
            schoolId,
            dayOfWeek: todayDayOfWeek,
            status: 'active',
            isDeleted: false,
        };
        if (role === 'student') {
            const student = await Student.findOne({ userId, schoolId });
            if (student?.currentSectionId) {
                filter.sectionId = student.currentSectionId;
            }
        }
        else if (role === 'teacher') {
            const teacher = await Teacher.findOne({ userId, schoolId });
            if (teacher) {
                filter.teacherId = teacher._id;
            }
        }
        else {
            // Optional query filters for Admin
            const { sectionId, teacherId } = req.query;
            if (sectionId)
                filter.sectionId = new Types.ObjectId(sectionId);
            if (teacherId)
                filter.teacherId = new Types.ObjectId(teacherId);
        }
        const slots = await Timetable.find(filter)
            .populate('classId', 'name')
            .populate('sectionId', 'name')
            .populate('subjectId', 'name code')
            .populate({
            path: 'teacherId',
            select: 'employeeId userId',
            populate: { path: 'userId', select: 'name' },
        })
            .sort({ startTime: 1 });
        // Current time in HH:mm
        const now = new Date();
        const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        let currentLesson = null;
        let nextLesson = null;
        for (const s of slots) {
            if (s.startTime <= currentHHmm && currentHHmm < s.endTime) {
                currentLesson = s;
            }
            else if (s.startTime > currentHHmm && !nextLesson) {
                nextLesson = s;
            }
        }
        res.status(200).json({
            success: true,
            dayOfWeek: todayDayOfWeek,
            currentTime: currentHHmm,
            slots,
            currentLesson,
            nextLesson,
        });
    }
    catch (err) {
        logger.error('[GetTodaySchedule] Error getting today schedule:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve today schedule' });
    }
};
// ============================================================================
// 8. Copy Day Schedule (With Conflict Pre-Check & Reporting)
// ============================================================================
export const copyDaySchedule = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const validation = copyDaySchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid copy parameters' });
            return;
        }
        const { academicSessionId, sectionId, sourceDay, targetDay, overwriteExisting, previewOnly } = validation.data;
        // Fetch source slots
        const sourceSlots = await Timetable.find({
            schoolId,
            academicSessionId: new Types.ObjectId(academicSessionId),
            sectionId: new Types.ObjectId(sectionId),
            dayOfWeek: sourceDay,
            status: 'active',
            isDeleted: false,
        }).sort({ startTime: 1 });
        if (sourceSlots.length === 0) {
            res.status(404).json({
                success: false,
                message: `No active timetable slots found for ${sourceDay} to copy`,
            });
            return;
        }
        // Existing target slots
        const existingTargetSlots = await Timetable.find({
            schoolId,
            academicSessionId: new Types.ObjectId(academicSessionId),
            sectionId: new Types.ObjectId(sectionId),
            dayOfWeek: targetDay,
            status: 'active',
            isDeleted: false,
        });
        const conflicts = [];
        const validSlotsToCopy = [];
        // Prevalidate every slot on the target day against conflict rules
        for (const slot of sourceSlots) {
            const conflictResult = await checkTimetableConflicts({
                schoolId,
                academicSessionId: new Types.ObjectId(academicSessionId),
                dayOfWeek: targetDay,
                startTime: slot.startTime,
                endTime: slot.endTime,
                teacherId: slot.teacherId,
                sectionId: slot.sectionId,
                room: slot.room,
                // If overwrite is selected, ignore existing target slots for this section
                excludeSlotId: overwriteExisting ? undefined : undefined,
            });
            if (conflictResult.hasConflict) {
                conflicts.push({
                    sourcePeriodNumber: slot.periodNumber,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    room: slot.room,
                    conflictType: conflictResult.conflictType,
                    conflictReason: conflictResult.message,
                });
            }
            else {
                validSlotsToCopy.push(slot);
            }
        }
        // If previewOnly is requested, return summary
        if (previewOnly) {
            res.status(200).json({
                success: true,
                preview: true,
                sourceCount: sourceSlots.length,
                eligibleToCopy: validSlotsToCopy.length,
                conflictsCount: conflicts.length,
                conflicts,
            });
            return;
        }
        // If conflicts exist and overwrite is not approved, block execution
        if (conflicts.length > 0 && !overwriteExisting) {
            res.status(409).json({
                success: false,
                message: `Copy day blocked: ${conflicts.length} conflict(s) detected on ${targetDay}`,
                conflicts,
            });
            return;
        }
        // If overwrite is confirmed, archive existing slots for target day
        if (overwriteExisting && existingTargetSlots.length > 0) {
            await Timetable.updateMany({
                _id: { $in: existingTargetSlots.map((s) => s._id) },
            }, {
                $set: { status: 'archived' },
            });
        }
        // Execute copying of valid slots
        const newSlots = validSlotsToCopy.map((s) => ({
            schoolId,
            academicSessionId: s.academicSessionId,
            classId: s.classId,
            sectionId: s.sectionId,
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            dayOfWeek: targetDay,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            periodNumber: s.periodNumber,
            entryType: s.entryType,
            notes: s.notes,
            status: 'active',
            createdBy: userId,
        }));
        const created = await Timetable.insertMany(newSlots);
        res.status(200).json({
            success: true,
            message: `Successfully copied ${created.length} period(s) from ${sourceDay} to ${targetDay}`,
            copiedCount: created.length,
            skippedConflictsCount: conflicts.length,
            conflicts,
        });
    }
    catch (err) {
        logger.error('[CopyDaySchedule] Error copying day schedule:', err);
        res.status(500).json({ success: false, message: 'Failed to copy day schedule' });
    }
};
// ============================================================================
// 9. Duplicate Timetable to Another Section
// ============================================================================
export const duplicateTimetable = async (req, res) => {
    try {
        const { schoolId, userId } = getContext(req);
        if (!schoolId) {
            res.status(401).json({ success: false, message: 'School context required' });
            return;
        }
        const validation = duplicateTimetableSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({ success: false, message: validation.error.issues[0]?.message || 'Invalid parameters' });
            return;
        }
        const { academicSessionId, sourceSectionId, targetSectionId, targetClassId, previewOnly } = validation.data;
        const sourceSlots = await Timetable.find({
            schoolId,
            academicSessionId: new Types.ObjectId(academicSessionId),
            sectionId: new Types.ObjectId(sourceSectionId),
            status: 'active',
            isDeleted: false,
        }).sort({ dayOfWeek: 1, startTime: 1 });
        if (sourceSlots.length === 0) {
            res.status(404).json({ success: false, message: 'No active timetable slots found in source section' });
            return;
        }
        const conflicts = [];
        const validSlots = [];
        for (const slot of sourceSlots) {
            const conflictResult = await checkTimetableConflicts({
                schoolId,
                academicSessionId: new Types.ObjectId(academicSessionId),
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
                teacherId: slot.teacherId,
                sectionId: new Types.ObjectId(targetSectionId),
                room: slot.room,
            });
            if (conflictResult.hasConflict) {
                conflicts.push({
                    dayOfWeek: slot.dayOfWeek,
                    periodNumber: slot.periodNumber,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    conflictType: conflictResult.conflictType,
                    conflictReason: conflictResult.message,
                });
            }
            else {
                validSlots.push(slot);
            }
        }
        if (previewOnly) {
            res.status(200).json({
                success: true,
                preview: true,
                totalSourceSlots: sourceSlots.length,
                eligibleSlots: validSlots.length,
                conflictsCount: conflicts.length,
                conflicts,
            });
            return;
        }
        if (conflicts.length > 0) {
            res.status(409).json({
                success: false,
                message: `Duplicate timetable blocked: ${conflicts.length} conflict(s) detected in target section`,
                conflicts,
            });
            return;
        }
        const toInsert = validSlots.map((s) => ({
            schoolId,
            academicSessionId: s.academicSessionId,
            classId: new Types.ObjectId(targetClassId),
            sectionId: new Types.ObjectId(targetSectionId),
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            periodNumber: s.periodNumber,
            entryType: s.entryType,
            notes: s.notes,
            status: 'active',
            createdBy: userId,
        }));
        const result = await Timetable.insertMany(toInsert);
        res.status(200).json({
            success: true,
            message: `Successfully duplicated ${result.length} periods to target section`,
            duplicatedCount: result.length,
        });
    }
    catch (err) {
        logger.error('[DuplicateTimetable] Error duplicating timetable:', err);
        res.status(500).json({ success: false, message: 'Failed to duplicate timetable' });
    }
};
// ============================================================================
// 10. Quick Accessors (Class, Section, Teacher)
// ============================================================================
export const getClassTimetable = async (req, res) => {
    req.query.classId = req.params.classId;
    return listTimetable(req, res);
};
export const getSectionTimetable = async (req, res) => {
    req.query.sectionId = req.params.sectionId;
    return listTimetable(req, res);
};
export const getTeacherTimetable = async (req, res) => {
    req.query.teacherId = req.params.teacherId;
    return listTimetable(req, res);
};
