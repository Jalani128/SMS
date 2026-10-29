import { Types } from 'mongoose';
import { AcademicSession, Class, Section, Subject, SubjectAssignment, Enrollment, Student, Teacher, } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
// ============================================================================
// 1. ACADEMIC SESSIONS
// ============================================================================
export const getSessions = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.status)
            query.status = req.query.status;
        const search = req.query.search?.trim();
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }
        const [sessions, total] = await Promise.all([
            AcademicSession.find(query).sort({ isCurrent: -1, startDate: -1 }).skip(skip).limit(limit).lean(),
            AcademicSession.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            sessions,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        }, 'Academic sessions retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
export const getSessionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const session = await AcademicSession.findOne({ _id: id, schoolId });
        if (!session)
            return next(ApiError.notFound('Academic session not found'));
        ApiResponse.success(res, session, 'Academic session retrieved');
    }
    catch (error) {
        next(error);
    }
};
export const createSession = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const { name, code, startDate, endDate, isCurrent, status, terms } = req.body;
        // Check duplicate name or code in school
        const existing = await AcademicSession.findOne({
            schoolId,
            $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
        });
        if (existing) {
            return next(ApiError.conflict(`A session with this name or code already exists in this school.`));
        }
        // If marked isCurrent, deactivate all other sessions for this school
        if (isCurrent) {
            await AcademicSession.updateMany({ schoolId }, { $set: { isCurrent: false } });
        }
        const session = await AcademicSession.create({
            schoolId: new Types.ObjectId(schoolId),
            name: name.trim(),
            code: code.trim().toUpperCase(),
            startDate,
            endDate,
            isCurrent: !!isCurrent,
            status: isCurrent ? 'active' : status || 'upcoming',
            terms: terms || [],
        });
        ApiResponse.created(res, session, 'Academic session created successfully');
    }
    catch (error) {
        next(error);
    }
};
export const updateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const session = await AcademicSession.findOne({ _id: id, schoolId });
        if (!session)
            return next(ApiError.notFound('Academic session not found'));
        const { name, code, startDate, endDate, status, terms } = req.body;
        if (name || code) {
            const conflict = await AcademicSession.findOne({
                schoolId,
                _id: { $ne: session._id },
                $or: [
                    ...(name ? [{ name: name.trim() }] : []),
                    ...(code ? [{ code: code.trim().toUpperCase() }] : []),
                ],
            });
            if (conflict) {
                return next(ApiError.conflict('Another session with this name or code already exists'));
            }
        }
        if (name)
            session.name = name.trim();
        if (code)
            session.code = code.trim().toUpperCase();
        if (startDate)
            session.startDate = startDate;
        if (endDate)
            session.endDate = endDate;
        if (status)
            session.status = status;
        if (terms)
            session.terms = terms;
        await session.save();
        ApiResponse.success(res, session, 'Academic session updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const activateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const session = await AcademicSession.findOne({ _id: id, schoolId });
        if (!session)
            return next(ApiError.notFound('Academic session not found'));
        // Deactivate all other sessions in the school atomically
        await AcademicSession.updateMany({ schoolId, _id: { $ne: session._id } }, { $set: { isCurrent: false } });
        // Set target session as current and active
        session.isCurrent = true;
        session.status = 'active';
        await session.save();
        ApiResponse.success(res, session, `Academic session "${session.name}" activated as the single current active session for the school.`);
    }
    catch (error) {
        next(error);
    }
};
export const archiveSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const session = await AcademicSession.findOne({ _id: id, schoolId });
        if (!session)
            return next(ApiError.notFound('Academic session not found'));
        session.status = 'archived';
        session.isCurrent = false;
        await session.save();
        ApiResponse.success(res, session, 'Academic session archived successfully');
    }
    catch (error) {
        next(error);
    }
};
// ============================================================================
// 2. CLASSES
// ============================================================================
export const getClasses = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.status)
            query.status = req.query.status;
        const search = req.query.search?.trim();
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }
        const [classesList, total] = await Promise.all([
            Class.find(query).sort({ order: 1, name: 1 }).skip(skip).limit(limit).lean(),
            Class.countDocuments(query),
        ]);
        // Attach dynamic section count and enrollment count per class
        const enhancedClasses = await Promise.all(classesList.map(async (cls) => {
            const [sectionCount, studentCount] = await Promise.all([
                Section.countDocuments({ schoolId, classId: cls._id, status: 'active' }),
                Student.countDocuments({ schoolId, currentClassId: cls._id, status: 'active' }),
            ]);
            return {
                ...cls,
                sectionCount,
                studentCount,
            };
        }));
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            classes: enhancedClasses,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        }, 'Classes retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
export const getClassById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const classDoc = await Class.findOne({ _id: id, schoolId });
        if (!classDoc)
            return next(ApiError.notFound('Class not found'));
        const [sections, assignments] = await Promise.all([
            Section.find({ schoolId, classId: classDoc._id })
                .populate('classTeacherId', 'employeeId userId')
                .populate({ path: 'classTeacherId', populate: { path: 'userId', select: 'name email' } })
                .sort({ name: 1 }),
            SubjectAssignment.find({ schoolId, classId: classDoc._id, status: 'active' })
                .populate('subjectId', 'name code department type')
                .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } }),
        ]);
        const result = classDoc.toObject();
        result.sections = sections;
        result.subjectAssignments = assignments;
        ApiResponse.success(res, result, 'Class details retrieved');
    }
    catch (error) {
        next(error);
    }
};
export const createClass = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const { name, code, order = 0, description, academicSessionId, status = 'active' } = req.body;
        const existing = await Class.findOne({
            schoolId,
            $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
        });
        if (existing) {
            return next(ApiError.conflict(`A class with this name or code already exists in this school.`));
        }
        const newClass = await Class.create({
            schoolId: new Types.ObjectId(schoolId),
            academicSessionId: academicSessionId ? new Types.ObjectId(academicSessionId) : undefined,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            order,
            description,
            status,
        });
        ApiResponse.created(res, newClass, 'Class created successfully');
    }
    catch (error) {
        next(error);
    }
};
export const updateClass = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const classDoc = await Class.findOne({ _id: id, schoolId });
        if (!classDoc)
            return next(ApiError.notFound('Class not found'));
        const { name, code, order, description, status } = req.body;
        if (name || code) {
            const conflict = await Class.findOne({
                schoolId,
                _id: { $ne: classDoc._id },
                $or: [
                    ...(name ? [{ name: name.trim() }] : []),
                    ...(code ? [{ code: code.trim().toUpperCase() }] : []),
                ],
            });
            if (conflict) {
                return next(ApiError.conflict('Another class with this name or code already exists'));
            }
        }
        if (name)
            classDoc.name = name.trim();
        if (code)
            classDoc.code = code.trim().toUpperCase();
        if (order !== undefined)
            classDoc.order = order;
        if (description !== undefined)
            classDoc.description = description;
        if (status)
            classDoc.status = status;
        await classDoc.save();
        ApiResponse.success(res, classDoc, 'Class updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const archiveClass = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const classDoc = await Class.findOne({ _id: id, schoolId });
        if (!classDoc)
            return next(ApiError.notFound('Class not found'));
        classDoc.status = 'inactive';
        await classDoc.save();
        // Also deactivate child sections
        await Section.updateMany({ schoolId, classId: classDoc._id }, { $set: { status: 'inactive' } });
        ApiResponse.success(res, classDoc, 'Class archived successfully. Historical enrollments preserved.');
    }
    catch (error) {
        next(error);
    }
};
// ============================================================================
// 3. SECTIONS
// ============================================================================
export const getSections = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.classId)
            query.classId = req.query.classId;
        if (req.query.status)
            query.status = req.query.status;
        const search = req.query.search?.trim();
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { roomNumber: { $regex: search, $options: 'i' } },
            ];
        }
        const [sectionsList, total] = await Promise.all([
            Section.find(query)
                .populate('classId', 'name code order')
                .populate({ path: 'classTeacherId', populate: { path: 'userId', select: 'name email phone' } })
                .sort({ classId: 1, name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Section.countDocuments(query),
        ]);
        // Attach active enrollment counts per section
        const enhancedSections = await Promise.all(sectionsList.map(async (sec) => {
            const enrolledCount = await Enrollment.countDocuments({
                schoolId,
                sectionId: sec._id,
                status: 'enrolled',
            });
            return {
                ...sec,
                enrolledCount,
                isFull: enrolledCount >= sec.capacity,
                availableSeats: Math.max(0, sec.capacity - enrolledCount),
            };
        }));
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            sections: enhancedSections,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        }, 'Sections retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
export const getSectionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const section = await Section.findOne({ _id: id, schoolId })
            .populate('classId', 'name code')
            .populate({ path: 'classTeacherId', populate: { path: 'userId', select: 'name email phone' } });
        if (!section)
            return next(ApiError.notFound('Section not found'));
        const enrolledStudents = await Enrollment.find({
            schoolId,
            sectionId: section._id,
            status: 'enrolled',
        })
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email phone avatarUrl' } })
            .sort({ rollNumber: 1 });
        const result = section.toObject();
        result.enrolledCount = enrolledStudents.length;
        result.enrolledStudents = enrolledStudents;
        result.isFull = enrolledStudents.length >= section.capacity;
        ApiResponse.success(res, result, 'Section details retrieved');
    }
    catch (error) {
        next(error);
    }
};
export const createSection = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const { classId, name, code, capacity = 35, classTeacherId, roomNumber, academicSessionId, status = 'active' } = req.body;
        // Verify parent class belongs to same school and is active
        const parentClass = await Class.findOne({ _id: classId, schoolId, status: 'active' });
        if (!parentClass) {
            return next(ApiError.badRequest('Referenced active Class not found in this school'));
        }
        // Verify teacher if supplied
        if (classTeacherId) {
            const teacher = await Teacher.findOne({ _id: classTeacherId, schoolId, status: 'active' });
            if (!teacher) {
                return next(ApiError.badRequest('Referenced active Class Teacher not found in this school'));
            }
        }
        // Check unique section code and name within this class
        const conflict = await Section.findOne({
            schoolId,
            classId,
            $or: [{ code: code.trim().toUpperCase() }, { name: name.trim() }],
        });
        if (conflict) {
            return next(ApiError.conflict(`A section with name "${name}" or code "${code}" already exists in ${parentClass.name}`));
        }
        const section = await Section.create({
            schoolId: new Types.ObjectId(schoolId),
            classId: new Types.ObjectId(classId),
            academicSessionId: academicSessionId ? new Types.ObjectId(academicSessionId) : undefined,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            capacity,
            classTeacherId: classTeacherId ? new Types.ObjectId(classTeacherId) : undefined,
            roomNumber,
            status,
        });
        const populated = await Section.findById(section._id)
            .populate('classId', 'name code')
            .populate({ path: 'classTeacherId', populate: { path: 'userId', select: 'name email' } });
        ApiResponse.created(res, populated, 'Section created successfully');
    }
    catch (error) {
        next(error);
    }
};
export const updateSection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const section = await Section.findOne({ _id: id, schoolId });
        if (!section)
            return next(ApiError.notFound('Section not found'));
        const { name, code, capacity, classTeacherId, roomNumber, status } = req.body;
        if (name || code) {
            const conflict = await Section.findOne({
                schoolId,
                classId: section.classId,
                _id: { $ne: section._id },
                $or: [
                    ...(name ? [{ name: name.trim() }] : []),
                    ...(code ? [{ code: code.trim().toUpperCase() }] : []),
                ],
            });
            if (conflict) {
                return next(ApiError.conflict('Another section in this class has this name or code'));
            }
        }
        // Capacity validation: cannot reduce capacity below currently enrolled students
        if (capacity !== undefined) {
            const enrolledCount = await Enrollment.countDocuments({
                schoolId,
                sectionId: section._id,
                status: 'enrolled',
            });
            if (capacity < enrolledCount) {
                return next(ApiError.badRequest(`Cannot set capacity to ${capacity}. Section currently has ${enrolledCount} actively enrolled students.`));
            }
            section.capacity = capacity;
        }
        if (classTeacherId !== undefined) {
            if (classTeacherId) {
                const teacher = await Teacher.findOne({ _id: classTeacherId, schoolId, status: 'active' });
                if (!teacher)
                    return next(ApiError.badRequest('Teacher not found or inactive'));
                section.classTeacherId = new Types.ObjectId(classTeacherId);
            }
            else {
                section.classTeacherId = undefined;
            }
        }
        if (name)
            section.name = name.trim();
        if (code)
            section.code = code.trim().toUpperCase();
        if (roomNumber !== undefined)
            section.roomNumber = roomNumber;
        if (status)
            section.status = status;
        await section.save();
        const populated = await Section.findById(section._id)
            .populate('classId', 'name code')
            .populate({ path: 'classTeacherId', populate: { path: 'userId', select: 'name email' } });
        ApiResponse.success(res, populated, 'Section updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const archiveSection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const section = await Section.findOne({ _id: id, schoolId });
        if (!section)
            return next(ApiError.notFound('Section not found'));
        section.status = 'inactive';
        await section.save();
        ApiResponse.success(res, section, 'Section archived successfully');
    }
    catch (error) {
        next(error);
    }
};
// ============================================================================
// 4. SUBJECTS
// ============================================================================
export const getSubjects = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.department)
            query.department = req.query.department;
        if (req.query.type)
            query.type = req.query.type;
        if (req.query.status)
            query.status = req.query.status;
        const search = req.query.search?.trim();
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
            ];
        }
        const [subjects, total] = await Promise.all([
            Subject.find(query).sort({ department: 1, name: 1 }).skip(skip).limit(limit).lean(),
            Subject.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            subjects,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        }, 'Subjects retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
export const getSubjectById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const subject = await Subject.findOne({ _id: id, schoolId });
        if (!subject)
            return next(ApiError.notFound('Subject not found'));
        ApiResponse.success(res, subject, 'Subject retrieved');
    }
    catch (error) {
        next(error);
    }
};
export const createSubject = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const { name, code, type = 'core', department, creditHours = 1, description, status = 'active' } = req.body;
        const existing = await Subject.findOne({ schoolId, code: code.trim().toUpperCase() });
        if (existing) {
            return next(ApiError.conflict(`Subject code "${code}" already exists in this school.`));
        }
        const subject = await Subject.create({
            schoolId: new Types.ObjectId(schoolId),
            name: name.trim(),
            code: code.trim().toUpperCase(),
            type,
            department: department.trim(),
            creditHours,
            description,
            status,
        });
        ApiResponse.created(res, subject, 'Subject created successfully');
    }
    catch (error) {
        next(error);
    }
};
export const updateSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const subject = await Subject.findOne({ _id: id, schoolId });
        if (!subject)
            return next(ApiError.notFound('Subject not found'));
        const { name, code, type, department, creditHours, description, status } = req.body;
        if (code && code.trim().toUpperCase() !== subject.code) {
            const conflict = await Subject.findOne({
                schoolId,
                _id: { $ne: subject._id },
                code: code.trim().toUpperCase(),
            });
            if (conflict) {
                return next(ApiError.conflict(`Subject code "${code}" is already in use by another subject`));
            }
            subject.code = code.trim().toUpperCase();
        }
        if (name)
            subject.name = name.trim();
        if (type)
            subject.type = type;
        if (department)
            subject.department = department.trim();
        if (creditHours !== undefined)
            subject.creditHours = creditHours;
        if (description !== undefined)
            subject.description = description;
        if (status)
            subject.status = status;
        await subject.save();
        ApiResponse.success(res, subject, 'Subject updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const archiveSubject = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const subject = await Subject.findOne({ _id: id, schoolId });
        if (!subject)
            return next(ApiError.notFound('Subject not found'));
        subject.status = 'inactive';
        await subject.save();
        ApiResponse.success(res, subject, 'Subject archived successfully');
    }
    catch (error) {
        next(error);
    }
};
// ============================================================================
// 5. SUBJECT & TEACHER ASSIGNMENTS
// ============================================================================
export const getSubjectAssignments = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.academicSessionId)
            query.academicSessionId = req.query.academicSessionId;
        if (req.query.classId)
            query.classId = req.query.classId;
        if (req.query.sectionId)
            query.sectionId = req.query.sectionId;
        if (req.query.subjectId)
            query.subjectId = req.query.subjectId;
        if (req.query.teacherId)
            query.teacherId = req.query.teacherId;
        if (req.query.status)
            query.status = req.query.status;
        // If teacher role calls this, restrict to their own teacherId
        if (req.user?.role === 'teacher') {
            const teacherProfile = await Teacher.findOne({ userId: req.user.userId, schoolId });
            if (!teacherProfile)
                return next(ApiError.forbidden('Teacher profile not found'));
            query.teacherId = teacherProfile._id;
        }
        const [assignments, total] = await Promise.all([
            SubjectAssignment.find(query)
                .populate('academicSessionId', 'name code isCurrent')
                .populate('classId', 'name code')
                .populate('sectionId', 'name code')
                .populate('subjectId', 'name code department type')
                .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email phone' } })
                .sort({ classId: 1, subjectId: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SubjectAssignment.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            assignments,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        }, 'Subject assignments retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
export const createSubjectAssignment = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const { academicSessionId, classId, sectionId, subjectId, teacherId, periodsPerWeek = 5, status = 'active' } = req.body;
        // Cross-school reference validation and active status verification
        const [sess, cls, sub, tch] = await Promise.all([
            AcademicSession.findOne({ _id: academicSessionId, schoolId }),
            Class.findOne({ _id: classId, schoolId, status: 'active' }),
            Subject.findOne({ _id: subjectId, schoolId, status: 'active' }),
            Teacher.findOne({ _id: teacherId, schoolId, status: 'active' }),
        ]);
        if (!sess)
            return next(ApiError.badRequest('Referenced Academic Session does not exist in this school'));
        if (!cls)
            return next(ApiError.badRequest('Referenced active Class not found in this school'));
        if (!sub)
            return next(ApiError.badRequest('Referenced active Subject not found in this school'));
        if (!tch)
            return next(ApiError.badRequest('Referenced Teacher is not active in this school'));
        if (sectionId) {
            const sec = await Section.findOne({ _id: sectionId, schoolId, classId, status: 'active' });
            if (!sec)
                return next(ApiError.badRequest('Referenced Section does not belong to this class or is inactive'));
        }
        // Check duplicate active combination
        const existing = await SubjectAssignment.findOne({
            schoolId,
            academicSessionId,
            classId,
            sectionId: sectionId || undefined,
            subjectId,
            status: 'active',
        });
        if (existing) {
            return next(ApiError.conflict('An active assignment for this subject in this class/section and session already exists.'));
        }
        const assignment = await SubjectAssignment.create({
            schoolId: new Types.ObjectId(schoolId),
            academicSessionId: new Types.ObjectId(academicSessionId),
            classId: new Types.ObjectId(classId),
            sectionId: sectionId ? new Types.ObjectId(sectionId) : undefined,
            subjectId: new Types.ObjectId(subjectId),
            teacherId: new Types.ObjectId(teacherId),
            periodsPerWeek,
            status,
        });
        const populated = await SubjectAssignment.findById(assignment._id)
            .populate('academicSessionId', 'name code')
            .populate('classId', 'name code')
            .populate('sectionId', 'name code')
            .populate('subjectId', 'name code department')
            .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } });
        ApiResponse.created(res, populated, 'Teacher assigned to subject successfully');
    }
    catch (error) {
        next(error);
    }
};
export const updateSubjectAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const assignment = await SubjectAssignment.findOne({ _id: id, schoolId });
        if (!assignment)
            return next(ApiError.notFound('Subject assignment not found'));
        const { teacherId, periodsPerWeek, status } = req.body;
        if (teacherId) {
            const tch = await Teacher.findOne({ _id: teacherId, schoolId, status: 'active' });
            if (!tch)
                return next(ApiError.badRequest('Referenced teacher not found or inactive'));
            assignment.teacherId = new Types.ObjectId(teacherId);
        }
        if (periodsPerWeek !== undefined)
            assignment.periodsPerWeek = periodsPerWeek;
        if (status)
            assignment.status = status;
        await assignment.save();
        const populated = await SubjectAssignment.findById(assignment._id)
            .populate('academicSessionId', 'name code')
            .populate('classId', 'name code')
            .populate('sectionId', 'name code')
            .populate('subjectId', 'name code department')
            .populate({ path: 'teacherId', populate: { path: 'userId', select: 'name email' } });
        ApiResponse.success(res, populated, 'Subject assignment updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const archiveSubjectAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const assignment = await SubjectAssignment.findOne({ _id: id, schoolId });
        if (!assignment)
            return next(ApiError.notFound('Subject assignment not found'));
        assignment.status = 'archived';
        await assignment.save();
        ApiResponse.success(res, assignment, 'Subject assignment archived successfully');
    }
    catch (error) {
        next(error);
    }
};
// ============================================================================
// 6. STUDENT ENROLLMENT & TRANSFERS
// ============================================================================
export const getEnrollments = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.academicSessionId)
            query.academicSessionId = req.query.academicSessionId;
        if (req.query.classId)
            query.classId = req.query.classId;
        if (req.query.sectionId)
            query.sectionId = req.query.sectionId;
        if (req.query.status)
            query.status = req.query.status;
        const search = req.query.search?.trim();
        if (search) {
            const matchedStudents = await Student.find({
                schoolId,
                $or: [
                    { admissionNumber: { $regex: search, $options: 'i' } },
                    { rollNumber: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');
            const userMatches = await Student.find({ schoolId })
                .populate({
                path: 'userId',
                match: { name: { $regex: search, $options: 'i' } },
                select: '_id',
            })
                .select('_id userId');
            const studentIdsFromUsers = userMatches.filter((s) => s.userId).map((s) => s._id);
            const studentIds = [
                ...matchedStudents.map((s) => s._id),
                ...studentIdsFromUsers,
            ];
            query.studentId = { $in: studentIds };
        }
        const [enrollments, total] = await Promise.all([
            Enrollment.find(query)
                .populate({
                path: 'studentId',
                select: 'admissionNumber rollNumber status',
                populate: { path: 'userId', select: 'name email phone avatarUrl' },
            })
                .populate('classId', 'name code order')
                .populate('sectionId', 'name code capacity roomNumber')
                .populate('academicSessionId', 'name code isCurrent')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Enrollment.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            enrollments,
            pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
        }, 'Enrollments retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
export const createEnrollment = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const { studentId, academicSessionId, classId, sectionId, rollNumber, remarks } = req.body;
        // Verify all references belong to same school and are active
        const [student, session, cls, section] = await Promise.all([
            Student.findOne({ _id: studentId, schoolId }),
            AcademicSession.findOne({ _id: academicSessionId, schoolId }),
            Class.findOne({ _id: classId, schoolId, status: 'active' }),
            Section.findOne({ _id: sectionId, schoolId, classId, status: 'active' }),
        ]);
        if (!student)
            return next(ApiError.badRequest('Student not found in this school'));
        if (!session)
            return next(ApiError.badRequest('Academic Session not found in this school'));
        if (!cls)
            return next(ApiError.badRequest('Class not found or inactive'));
        if (!section)
            return next(ApiError.badRequest('Section not found in this class or inactive'));
        // Capacity enforcement
        const currentEnrollments = await Enrollment.countDocuments({
            schoolId,
            sectionId,
            academicSessionId,
            status: 'enrolled',
        });
        if (currentEnrollments >= section.capacity) {
            return next(ApiError.conflict(`Section "${section.name}" is at maximum capacity (${currentEnrollments}/${section.capacity} students). Cannot enroll.`));
        }
        // Check duplicate enrollment in same session
        const existingEnrollment = await Enrollment.findOne({
            schoolId,
            studentId,
            academicSessionId,
            status: 'enrolled',
        });
        if (existingEnrollment) {
            return next(ApiError.conflict(`Student is already actively enrolled in this academic session. Use transfer to reassign class or section.`));
        }
        const enrollment = await Enrollment.create({
            schoolId: new Types.ObjectId(schoolId),
            studentId: new Types.ObjectId(studentId),
            academicSessionId: new Types.ObjectId(academicSessionId),
            classId: new Types.ObjectId(classId),
            sectionId: new Types.ObjectId(sectionId),
            rollNumber,
            remarks,
            enrollmentDate: new Date(),
            status: 'enrolled',
        });
        // Update active student pointers
        student.currentSessionId = new Types.ObjectId(academicSessionId);
        student.currentClassId = new Types.ObjectId(classId);
        student.currentSectionId = new Types.ObjectId(sectionId);
        if (rollNumber)
            student.rollNumber = rollNumber;
        await student.save();
        const populated = await Enrollment.findById(enrollment._id)
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
            .populate('classId', 'name code')
            .populate('sectionId', 'name code capacity')
            .populate('academicSessionId', 'name code isCurrent');
        ApiResponse.created(res, populated, 'Student successfully enrolled in session');
    }
    catch (error) {
        next(error);
    }
};
export const transferStudent = async (req, res, next) => {
    try {
        const { id } = req.params; // enrollment ID
        const schoolId = req.schoolId;
        const { targetClassId, targetSectionId, targetRollNumber, reason } = req.body;
        const currentEnrollment = await Enrollment.findOne({ _id: id, schoolId });
        if (!currentEnrollment)
            return next(ApiError.notFound('Enrollment record not found'));
        if (currentEnrollment.status !== 'enrolled') {
            return next(ApiError.badRequest(`Cannot transfer an enrollment with status "${currentEnrollment.status}"`));
        }
        // Verify target class and section
        const [targetClass, targetSection] = await Promise.all([
            Class.findOne({ _id: targetClassId, schoolId, status: 'active' }),
            Section.findOne({ _id: targetSectionId, schoolId, classId: targetClassId, status: 'active' }),
        ]);
        if (!targetClass)
            return next(ApiError.badRequest('Target class not found or inactive'));
        if (!targetSection)
            return next(ApiError.badRequest('Target section not found in class or inactive'));
        // Check target section capacity
        const currentInTarget = await Enrollment.countDocuments({
            schoolId,
            sectionId: targetSectionId,
            academicSessionId: currentEnrollment.academicSessionId,
            status: 'enrolled',
        });
        if (currentInTarget >= targetSection.capacity) {
            return next(ApiError.conflict(`Target section "${targetSection.name}" is at full capacity (${currentInTarget}/${targetSection.capacity} students).`));
        }
        // Sequenced atomic multi-write with compensation
        const previousStatus = currentEnrollment.status;
        currentEnrollment.status = 'transferred';
        currentEnrollment.remarks = currentEnrollment.remarks
            ? `${currentEnrollment.remarks} | Transferred: ${reason}`
            : `Transferred: ${reason}`;
        await currentEnrollment.save();
        let newEnrollment;
        try {
            newEnrollment = await Enrollment.create({
                schoolId: new Types.ObjectId(schoolId),
                studentId: currentEnrollment.studentId,
                academicSessionId: currentEnrollment.academicSessionId,
                classId: new Types.ObjectId(targetClassId),
                sectionId: new Types.ObjectId(targetSectionId),
                rollNumber: targetRollNumber || currentEnrollment.rollNumber,
                remarks: `Transferred from previous section. Reason: ${reason}`,
                enrollmentDate: new Date(),
                status: 'enrolled',
            });
            // Update student active pointers
            await Student.findByIdAndUpdate(currentEnrollment.studentId, {
                currentClassId: new Types.ObjectId(targetClassId),
                currentSectionId: new Types.ObjectId(targetSectionId),
                rollNumber: targetRollNumber || currentEnrollment.rollNumber,
            });
        }
        catch (writeErr) {
            // Compensating rollback
            currentEnrollment.status = previousStatus;
            await currentEnrollment.save();
            throw writeErr;
        }
        const populated = await Enrollment.findById(newEnrollment._id)
            .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
            .populate('classId', 'name code')
            .populate('sectionId', 'name code capacity')
            .populate('academicSessionId', 'name code');
        ApiResponse.created(res, populated, `Student transferred to ${targetClass.name} - ${targetSection.name}. Historical enrollment preserved.`);
    }
    catch (error) {
        next(error);
    }
};
export const getStudentEnrollmentHistory = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const schoolId = req.schoolId;
        const student = await Student.findOne({ _id: studentId, schoolId }).populate('userId', 'name email');
        if (!student)
            return next(ApiError.notFound('Student not found'));
        // Authorization: Students and parents may read only their own record
        if (req.user?.role === 'student' && student.userId._id.toString() !== req.user.userId) {
            return next(ApiError.forbidden('Students may view only their own enrollment history'));
        }
        const history = await Enrollment.find({ schoolId, studentId: student._id })
            .populate('classId', 'name code')
            .populate('sectionId', 'name code roomNumber')
            .populate('academicSessionId', 'name code startDate endDate isCurrent')
            .sort({ enrollmentDate: -1 });
        ApiResponse.success(res, { student, history }, 'Student enrollment history retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
// ============================================================================
// 7. ACADEMIC SUMMARY (FOR DASHBOARD & METRICS)
// ============================================================================
export const getAcademicSummary = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId)
            return next(ApiError.forbidden('School tenant context required'));
        const [activeSession, activeClassesCount, activeSectionsCount, activeSubjectsCount, assignedTeachersCount] = await Promise.all([
            AcademicSession.findOne({ schoolId, isCurrent: true }).lean(),
            Class.countDocuments({ schoolId, status: 'active' }),
            Section.countDocuments({ schoolId, status: 'active' }),
            Subject.countDocuments({ schoolId, status: 'active' }),
            SubjectAssignment.distinct('teacherId', { schoolId, status: 'active' }),
        ]);
        let currentSessionEnrollmentsCount = 0;
        if (activeSession) {
            currentSessionEnrollmentsCount = await Enrollment.countDocuments({
                schoolId,
                academicSessionId: activeSession._id,
                status: 'enrolled',
            });
        }
        ApiResponse.success(res, {
            activeSession: activeSession
                ? {
                    _id: activeSession._id,
                    name: activeSession.name,
                    code: activeSession.code,
                    startDate: activeSession.startDate,
                    endDate: activeSession.endDate,
                    status: activeSession.status,
                }
                : null,
            activeClassesCount,
            activeSectionsCount,
            activeSubjectsCount,
            currentSessionEnrollmentsCount,
            assignedTeachersCount: assignedTeachersCount.length,
        }, 'Academic summary metrics retrieved');
    }
    catch (error) {
        next(error);
    }
};
