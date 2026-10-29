import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Parent, IParent } from '../models/Parent.model.js';
import { Student } from '../models/Student.model.js';
import { User, IUser } from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * GET /api/v1/parents
 * List parents with server-side pagination, search, and status filtering
 */
export const getParents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return next(ApiError.forbidden('School tenant context required'));
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { schoolId };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const search = (req.query.search as string)?.trim();
    if (search) {
      const matchingUsers = await User.find({
        schoolId,
        role: 'parent',
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { occupation: { $regex: search, $options: 'i' } },
        { alternatePhone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }

    const [parents, total] = await Promise.all([
      Parent.find(query)
        .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
        .populate({
          path: 'children.studentProfileId',
          select: 'admissionNumber rollNumber currentClassId currentSectionId',
          populate: [
            { path: 'userId', select: 'name avatarUrl' },
            { path: 'currentClassId', select: 'name code' },
            { path: 'currentSectionId', select: 'name code' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Parent.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    ApiResponse.success(
      res,
      {
        parents,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      'Parents retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/parents/:id
 * Retrieve single parent details with linked children
 */
export const getParentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const parent = await Parent.findOne({ _id: id, schoolId })
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive createdAt')
      .populate({
        path: 'children.studentProfileId',
        select: 'admissionNumber rollNumber currentClassId currentSectionId status',
        populate: [
          { path: 'userId', select: 'name avatarUrl' },
          { path: 'currentClassId', select: 'name code' },
          { path: 'currentSectionId', select: 'name code' },
        ],
      });

    if (!parent) {
      return next(ApiError.notFound('Parent not found'));
    }

    ApiResponse.success(res, parent, 'Parent profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/parents
 * Create parent user account and guardian profile
 */
export const createParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let createdUser: IUser | null = null;

  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return next(ApiError.forbidden('School tenant context required'));
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      avatarUrl,
      occupation,
      alternatePhone,
      address,
      emergencyContact,
      status = 'active',
      adminNotes,
      children = [],
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check duplicate email in this school
    const existingUser = await User.findOne({ schoolId, email: normalizedEmail });
    if (existingUser) {
      return next(ApiError.conflict(`A user with email '${normalizedEmail}' already exists in this school.`));
    }

    // 2. Validate linked children belong to this school
    const validatedChildren: any[] = [];
    for (const child of children) {
      const student = await Student.findOne({ _id: child.studentProfileId, schoolId });
      if (!student) {
        return next(
          ApiError.badRequest(`Linked student profile '${child.studentProfileId}' does not belong to this school`)
        );
      }
      validatedChildren.push({
        studentProfileId: student._id,
        relationship: child.relationship || 'guardian',
        isPrimary: child.isPrimary ?? false,
      });
    }

    // 3. Create User account with server-assigned 'parent' role
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const initialPasswordHash = await (User as any).hashPassword(randomSecret);

    createdUser = await User.create({
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      avatarUrl,
      role: 'parent',
      schoolId: new Types.ObjectId(schoolId),
      isActive: true,
      emailVerified: false,
      passwordHash: initialPasswordHash,
    });

    // 4. Create Parent Profile
    const parent = await Parent.create({
      userId: createdUser._id,
      schoolId: new Types.ObjectId(schoolId),
      occupation,
      alternatePhone,
      address,
      emergencyContact,
      status,
      adminNotes,
      children: validatedChildren,
    });

    // 5. Update linked Students' guardians lists bi-directionally
    for (const link of validatedChildren) {
      await Student.updateOne(
        {
          _id: link.studentProfileId,
          schoolId,
          'guardians.parentProfileId': { $ne: parent._id },
        },
        {
          $push: {
            guardians: {
              parentProfileId: parent._id,
              userId: createdUser._id,
              relationship: link.relationship,
              isPrimary: link.isPrimary,
              canPickup: true,
            },
          },
        }
      );
    }

    const populatedParent = await Parent.findById(parent._id)
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
      .populate({
        path: 'children.studentProfileId',
        select: 'admissionNumber rollNumber',
        populate: { path: 'userId', select: 'name' },
      });

    ApiResponse.created(res, populatedParent, 'Parent profile created successfully');
  } catch (error) {
    if (createdUser && createdUser._id) {
      await User.findByIdAndDelete(createdUser._id).catch(() => {});
    }
    next(error);
  }
};

/**
 * PATCH /api/v1/parents/:id
 * Update parent profile information
 */
export const updateParent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const parent = await Parent.findOne({ _id: id, schoolId });
    if (!parent) {
      return next(ApiError.notFound('Parent not found'));
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      avatarUrl,
      occupation,
      alternatePhone,
      address,
      emergencyContact,
      status,
      adminNotes,
    } = req.body;

    if (firstName || lastName || email || phone || avatarUrl !== undefined) {
      const user = await User.findById(parent.userId);
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
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (firstName || lastName) {
          user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
        if (phone !== undefined) user.phone = phone;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
        await user.save();
      }
    }

    if (occupation !== undefined) parent.occupation = occupation;
    if (alternatePhone !== undefined) parent.alternatePhone = alternatePhone;
    if (address !== undefined) parent.address = address;
    if (emergencyContact !== undefined) parent.emergencyContact = emergencyContact;
    if (status !== undefined) parent.status = status;
    if (adminNotes !== undefined) parent.adminNotes = adminNotes;

    await parent.save();

    const updated = await Parent.findById(parent._id)
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
      .populate({
        path: 'children.studentProfileId',
        select: 'admissionNumber rollNumber',
        populate: { path: 'userId', select: 'name' },
      });

    ApiResponse.success(res, updated, 'Parent profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/parents/:id/children
 * Link or unlink student wards bi-directionally
 * Supports both full sync of `children: [...]` and granular `{ action: 'add' | 'remove' }`
 */
export const updateParentChildren = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const parent = await Parent.findOne({ _id: id, schoolId });
    if (!parent) {
      return next(ApiError.notFound('Parent not found'));
    }

    const { action = 'sync', children, studentProfileId, relationship = 'guardian', isPrimary = false } = req.body;

    if (action === 'add') {
      if (!studentProfileId) {
        return next(ApiError.badRequest('studentProfileId is required to add child link'));
      }
      const student = await Student.findOne({ _id: studentProfileId, schoolId });
      if (!student) {
        return next(ApiError.badRequest('Referenced student does not exist in this school'));
      }

      // Check if already linked
      const alreadyLinked = parent.children.some(
        (c) => c.studentProfileId.toString() === studentProfileId.toString()
      );
      if (alreadyLinked) {
        return next(ApiError.conflict('Student is already linked to this parent profile'));
      }

      parent.children.push({
        studentProfileId: student._id,
        relationship,
        isPrimary,
      });
      await parent.save();

      // Add to Student.guardians
      const guardianAlreadyExists = student.guardians.some(
        (g) => g.parentProfileId.toString() === parent._id.toString()
      );
      if (!guardianAlreadyExists) {
        student.guardians.push({
          parentProfileId: parent._id,
          userId: parent.userId,
          relationship,
          isPrimary,
          canPickup: true,
        });
        await student.save();
      }
    } else if (action === 'remove') {
      if (!studentProfileId) {
        return next(ApiError.badRequest('studentProfileId is required to remove child link'));
      }

      // Remove from Parent.children without deleting historical student records
      parent.children = parent.children.filter(
        (c) => c.studentProfileId.toString() !== studentProfileId.toString()
      );
      await parent.save();

      // Remove from Student.guardians
      await Student.updateOne(
        { _id: studentProfileId, schoolId },
        {
          $pull: {
            guardians: { parentProfileId: parent._id },
          },
        }
      );
    } else {
      // Full sync of children array
      if (!Array.isArray(children)) {
        return next(ApiError.badRequest('children array is required for sync action'));
      }

      // 1. Validate all children exist in the same school
      const newLinks: any[] = [];
      const seenStudentIds = new Set<string>();

      for (const link of children) {
        const studentIdStr = link.studentProfileId.toString();
        if (seenStudentIds.has(studentIdStr)) {
          return next(ApiError.conflict(`Duplicate student reference '${studentIdStr}' in child list`));
        }
        seenStudentIds.add(studentIdStr);

        const student = await Student.findOne({ _id: link.studentProfileId, schoolId });
        if (!student) {
          return next(
            ApiError.badRequest(`Student '${link.studentProfileId}' does not belong to this school partition`)
          );
        }
        newLinks.push({
          studentProfileId: student._id,
          relationship: link.relationship || 'guardian',
          isPrimary: link.isPrimary ?? false,
        });
      }

      // 2. Identify removed children and remove parent from their guardians list
      const oldStudentIds = parent.children.map((c) => c.studentProfileId.toString());
      const newStudentIdStrs = newLinks.map((c) => c.studentProfileId.toString());
      const removedStudentIds = oldStudentIds.filter((id) => !newStudentIdStrs.includes(id));

      for (const removedId of removedStudentIds) {
        await Student.updateOne(
          { _id: removedId, schoolId },
          { $pull: { guardians: { parentProfileId: parent._id } } }
        );
      }

      // 3. Set parent.children to newLinks
      parent.children = newLinks;
      await parent.save();

      // 4. Update guardians on newly linked students
      for (const link of newLinks) {
        await Student.updateOne(
          {
            _id: link.studentProfileId,
            schoolId,
            'guardians.parentProfileId': { $ne: parent._id },
          },
          {
            $push: {
              guardians: {
                parentProfileId: parent._id,
                userId: parent.userId,
                relationship: link.relationship,
                isPrimary: link.isPrimary,
                canPickup: true,
              },
            },
          }
        );
      }
    }

    const updated = await Parent.findById(parent._id)
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
      .populate({
        path: 'children.studentProfileId',
        select: 'admissionNumber rollNumber currentClassId currentSectionId',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'currentClassId', select: 'name code' },
          { path: 'currentSectionId', select: 'name code' },
        ],
      });

    ApiResponse.success(res, updated, 'Parent-child relationships synchronized successfully');
  } catch (error) {
    next(error);
  }
};
