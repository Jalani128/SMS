import crypto from 'crypto';
import { Types } from 'mongoose';
import { Teacher } from '../models/Teacher.model.js';
import { User } from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
export const generateEmployeeId = async (schoolId) => {
    const year = new Date().getFullYear();
    const count = await Teacher.countDocuments({ schoolId });
    let candidate = `TCH-${year}-${String(count + 1).padStart(4, '0')}`;
    let exists = await Teacher.findOne({ schoolId, employeeId: candidate });
    let offset = 1;
    while (exists) {
        candidate = `TCH-${year}-${String(count + 1 + offset).padStart(4, '0')}`;
        exists = await Teacher.findOne({ schoolId, employeeId: candidate });
        offset++;
    }
    return candidate;
};
/**
 * GET /api/v1/teachers
 * List teachers with server-side pagination, search, and department/status filtering
 */
export const getTeachers = async (req, res, next) => {
    try {
        const schoolId = req.schoolId;
        if (!schoolId) {
            return next(ApiError.forbidden('School tenant context required'));
        }
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;
        const query = { schoolId };
        if (req.query.status)
            query.status = req.query.status;
        if (req.query.department)
            query.department = req.query.department;
        if (req.query.designation)
            query.designation = req.query.designation;
        const search = req.query.search?.trim();
        if (search) {
            const matchingUsers = await User.find({
                schoolId,
                role: 'teacher',
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { firstName: { $regex: search, $options: 'i' } },
                    { lastName: { $regex: search, $options: 'i' } },
                ],
            }).select('_id');
            const userIds = matchingUsers.map((u) => u._id);
            query.$or = [
                { employeeId: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { designation: { $regex: search, $options: 'i' } },
                { userId: { $in: userIds } },
            ];
        }
        const [teachers, total] = await Promise.all([
            Teacher.find(query)
                .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Teacher.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        ApiResponse.success(res, {
            teachers,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        }, 'Teachers retrieved successfully');
    }
    catch (error) {
        next(error);
    }
};
/**
 * GET /api/v1/teachers/:id
 * Retrieve teacher profile
 */
export const getTeacherById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const teacher = await Teacher.findOne({ _id: id, schoolId })
            .populate('userId', 'name firstName lastName email phone avatarUrl isActive createdAt')
            .populate('assignedClassIds', 'name code')
            .populate('assignedSubjectIds', 'name code');
        if (!teacher) {
            return next(ApiError.notFound('Teacher not found'));
        }
        ApiResponse.success(res, teacher, 'Teacher profile retrieved');
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /api/v1/teachers
 * Create teacher account and profile
 */
export const createTeacher = async (req, res, next) => {
    let createdUser = null;
    try {
        const schoolId = req.schoolId;
        if (!schoolId) {
            return next(ApiError.forbidden('School tenant context required'));
        }
        const { firstName, lastName, email, phone, avatarUrl, employeeId: customEmployeeId, department, designation = 'Faculty', qualification, specializations, joiningDate, experienceYears = 0, bio, adminNotes, status = 'active', } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        // 1. Check duplicate email in this school
        const existingUser = await User.findOne({ schoolId, email: normalizedEmail });
        if (existingUser) {
            return next(ApiError.conflict(`A user with email '${normalizedEmail}' already exists in this school.`));
        }
        // 2. Validate or generate employeeId
        let employeeId = customEmployeeId?.trim().toUpperCase();
        if (employeeId) {
            const existingEmp = await Teacher.findOne({ schoolId, employeeId });
            if (existingEmp) {
                return next(ApiError.conflict(`Employee ID '${employeeId}' is already in use at this school.`));
            }
        }
        else {
            employeeId = await generateEmployeeId(schoolId);
        }
        // 3. Create User account with server-assigned 'teacher' role and high-entropy initial hash
        const randomSecret = crypto.randomBytes(32).toString('hex');
        const initialPasswordHash = await User.hashPassword(randomSecret);
        createdUser = await User.create({
            name: `${firstName} ${lastName}`.trim(),
            firstName,
            lastName,
            email: normalizedEmail,
            phone,
            avatarUrl,
            role: 'teacher',
            schoolId: new Types.ObjectId(schoolId),
            isActive: true,
            emailVerified: false,
            passwordHash: initialPasswordHash,
        });
        // 4. Create Teacher Profile
        const teacher = await Teacher.create({
            userId: createdUser._id,
            schoolId: new Types.ObjectId(schoolId),
            employeeId,
            department,
            designation,
            qualification,
            specializations: Array.isArray(specializations) ? specializations : [],
            joiningDate: joiningDate || new Date(),
            experienceYears,
            bio,
            adminNotes,
            status,
        });
        const populatedTeacher = await Teacher.findById(teacher._id).populate('userId', 'name firstName lastName email phone avatarUrl isActive');
        ApiResponse.created(res, populatedTeacher, 'Teacher profile created successfully');
    }
    catch (error) {
        if (createdUser && createdUser._id) {
            await User.findByIdAndDelete(createdUser._id).catch(() => { });
        }
        next(error);
    }
};
/**
 * PATCH /api/v1/teachers/:id
 * Update teacher credentials and academic qualifications
 */
export const updateTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const teacher = await Teacher.findOne({ _id: id, schoolId });
        if (!teacher) {
            return next(ApiError.notFound('Teacher not found'));
        }
        const { firstName, lastName, email, phone, avatarUrl, department, designation, qualification, specializations, experienceYears, bio, adminNotes, status, } = req.body;
        if (firstName || lastName || email || phone || avatarUrl !== undefined) {
            const user = await User.findById(teacher.userId);
            if (user) {
                if (email && email.toLowerCase().trim() !== user.email) {
                    const emailExists = await User.findOne({
                        schoolId,
                        email: email.toLowerCase().trim(),
                        _id: { $ne: user._id },
                    });
                    if (emailExists) {
                        return next(ApiError.conflict('Email is already registered to another user in this school'));
                    }
                    user.email = email.toLowerCase().trim();
                }
                if (firstName)
                    user.firstName = firstName;
                if (lastName)
                    user.lastName = lastName;
                if (firstName || lastName) {
                    user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                }
                if (phone !== undefined)
                    user.phone = phone;
                if (avatarUrl !== undefined)
                    user.avatarUrl = avatarUrl;
                await user.save();
            }
        }
        if (department !== undefined)
            teacher.department = department;
        if (designation !== undefined)
            teacher.designation = designation;
        if (qualification !== undefined)
            teacher.qualification = qualification;
        if (specializations !== undefined)
            teacher.specializations = specializations;
        if (experienceYears !== undefined)
            teacher.experienceYears = experienceYears;
        if (bio !== undefined)
            teacher.bio = bio;
        if (adminNotes !== undefined)
            teacher.adminNotes = adminNotes;
        if (status !== undefined)
            teacher.status = status;
        await teacher.save();
        const updated = await Teacher.findById(teacher._id).populate('userId', 'name firstName lastName email phone avatarUrl isActive');
        ApiResponse.success(res, updated, 'Teacher profile updated successfully');
    }
    catch (error) {
        next(error);
    }
};
/**
 * PATCH /api/v1/teachers/:id/archive
 * Soft-archive teacher profile
 */
export const archiveTeacher = async (req, res, next) => {
    try {
        const { id } = req.params;
        const schoolId = req.schoolId;
        const { reason, status = 'resigned' } = req.body;
        const teacher = await Teacher.findOne({ _id: id, schoolId });
        if (!teacher) {
            return next(ApiError.notFound('Teacher not found'));
        }
        teacher.status = status;
        const archiveTimestamp = new Date().toISOString();
        const note = `[Archived on ${archiveTimestamp} by ${req.user?.userId}]: ${reason || 'Staff status update'}`;
        teacher.adminNotes = teacher.adminNotes ? `${teacher.adminNotes}\n${note}` : note;
        await teacher.save();
        if (teacher.userId) {
            await User.findByIdAndUpdate(teacher.userId, { isActive: false });
        }
        ApiResponse.success(res, {
            teacherId: teacher._id,
            status: teacher.status,
            archivedAt: archiveTimestamp,
        }, 'Teacher profile archived successfully. Historical teaching records preserved.');
    }
    catch (error) {
        next(error);
    }
};
