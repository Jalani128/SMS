import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { StudyMaterial, IStudyMaterial, MaterialStatus } from '../models/StudyMaterial.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { Subject } from '../models/Subject.model.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { SubjectAssignment } from '../models/SubjectAssignment.model.js';
import {
  createStudyMaterialSchema,
  updateStudyMaterialSchema,
  queryStudyMaterialSchema,
} from '../validations/studyMaterial.validation.js';
import {
  uploadStudyMaterialAsset,
  deleteMaterialStorageAsset,
} from '../utils/materialUpload.util.js';
import { verifyTeacherAuthorization } from '../utils/homework.util.js';
import { logger } from '../utils/logger.js';

// Helper to extract context
const getContext = (req: Request) => {
  const schoolIdStr = (req.schoolId || req.user?.schoolId) as string | undefined;
  const userIdStr = req.user?.userId;

  return {
    schoolId: schoolIdStr ? new Types.ObjectId(schoolIdStr) : undefined,
    userId: userIdStr ? new Types.ObjectId(userIdStr) : undefined,
    role: req.user?.role,
  };
};

// ============================================================================
// 1. List Study Materials (Role-Aware & Filtered)
// ============================================================================
export const listStudyMaterials = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    if (!schoolId) {
      res.status(401).json({ success: false, message: 'School context required' });
      return;
    }

    const queryParsed = queryStudyMaterialSchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({ success: false, message: queryParsed.error.issues[0]?.message || 'Invalid query' });
      return;
    }

    const {
      academicSessionId,
      classId,
      sectionId,
      subjectId,
      category,
      status,
      search,
      page = 1,
      limit = 20,
    } = queryParsed.data;

    const filter: any = { schoolId };

    if (academicSessionId) filter.academicSessionId = new Types.ObjectId(academicSessionId);
    if (classId) filter.classId = new Types.ObjectId(classId);
    if (sectionId) filter.sectionId = new Types.ObjectId(sectionId);
    if (subjectId) filter.subjectId = new Types.ObjectId(subjectId);
    if (category) filter.category = category;

    // Role-based visibility
    if (role === 'student' && userId) {
      filter.status = 'published';
      // Find student's active enrollment
      const studentProfile = await Student.findOne({ schoolId, userId });
      if (studentProfile) {
        const enrollment = await Enrollment.findOne({
          schoolId,
          studentId: studentProfile._id,
          status: 'enrolled',
        });
        if (enrollment) {
          filter.classId = enrollment.classId;
          // Material applies to whole class or specific section
          filter.$or = [
            { sectionId: enrollment.sectionId },
            { sectionId: { $exists: false } },
            { sectionId: null },
          ];
        }
      }
    } else if (role === 'parent' && userId) {
      filter.status = 'published';
      // If studentId passed in query, verify ward linkage
      const wardId = req.query.studentId as string | undefined;
      if (wardId && Types.ObjectId.isValid(wardId)) {
        const parentProfile = await Parent.findOne({ schoolId, userId });
        const isWard = parentProfile?.children?.some((c) => c.studentProfileId.toString() === wardId);
        if (isWard) {
          const enrollment = await Enrollment.findOne({
            schoolId,
            studentId: new Types.ObjectId(wardId),
            status: 'enrolled',
          });
          if (enrollment) {
            filter.classId = enrollment.classId;
            filter.$or = [
              { sectionId: enrollment.sectionId },
              { sectionId: { $exists: false } },
              { sectionId: null },
            ];
          }
        }
      }
    } else if (role === 'teacher') {
      if (status) {
        filter.status = status;
      } else {
        filter.status = { $ne: 'archived' };
      }
    } else {
      // Admin / Super Admin
      if (status) {
        filter.status = status;
      } else {
        filter.status = { $ne: 'archived' };
      }
    }

    if (search) {
      const s = search.trim();
      filter.$or = [
        { title: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
        { tags: { $in: [new RegExp(s, 'i')] } },
      ];
    }

    const skip = (page - 1) * limit;

    const [materials, total] = await Promise.all([
      StudyMaterial.find(filter)
        .populate('academicSessionId', 'name isCurrent')
        .populate('classId', 'name code')
        .populate('sectionId', 'name')
        .populate('subjectId', 'name code')
        .populate('uploadedBy', 'name firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StudyMaterial.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: materials,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    logger.error(`Error in listStudyMaterials: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error listing study materials' });
  }
};

// ============================================================================
// 2. Get Single Study Material Details
// ============================================================================
export const getStudyMaterialById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid School and Material ID required' });
      return;
    }

    const material = await StudyMaterial.findOne({ _id: id, schoolId })
      .populate('academicSessionId', 'name isCurrent')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('subjectId', 'name code')
      .populate('uploadedBy', 'name firstName lastName email');

    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    // Role checks: student/parent cannot view unpublished materials
    if ((role === 'student' || role === 'parent') && material.status !== 'published') {
      res.status(403).json({ success: false, message: 'This study material is not published yet' });
      return;
    }

    // Student enrollment authorization check
    if (role === 'student' && userId) {
      const studentProfile = await Student.findOne({ schoolId, userId });
      if (studentProfile) {
        const enrollment = await Enrollment.findOne({
          schoolId,
          studentId: studentProfile._id,
          classId: material.classId,
          status: 'enrolled',
        });
        if (!enrollment) {
          res.status(403).json({ success: false, message: 'Access denied: You are not enrolled in this class' });
          return;
        }
      }
    }

    res.json({
      success: true,
      data: material,
    });
  } catch (err: any) {
    logger.error(`Error in getStudyMaterialById: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error getting study material' });
  }
};

// ============================================================================
// 3. Create Study Material (Admin or Authorized Teacher)
// ============================================================================
export const createStudyMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    if (!schoolId || !userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const parsed = createStudyMaterialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const {
      title,
      description,
      academicSessionId,
      classId,
      sectionId,
      subjectId,
      category,
      tags,
      externalUrl,
      status,
    } = parsed.data;

    // Verify session, class, subject belong to school
    const [session, cls, sub] = await Promise.all([
      AcademicSession.findOne({ _id: academicSessionId, schoolId }),
      Class.findOne({ _id: classId, schoolId }),
      Subject.findOne({ _id: subjectId, schoolId }),
    ]);

    if (!session || !cls || !sub) {
      res.status(400).json({
        success: false,
        message: 'Invalid academic session, class, or subject for this school',
      });
      return;
    }

    if (sectionId) {
      const sec = await Section.findOne({ _id: sectionId, classId, schoolId });
      if (!sec) {
        res.status(400).json({ success: false, message: 'Section not found for the given class' });
        return;
      }
    }

    // Teacher authorization check: ensure teacher is assigned to this class and subject
    if (role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ schoolId, userId });
      if (!teacherProfile) {
        res.status(403).json({ success: false, message: 'Teacher profile not found' });
        return;
      }

      const isAuthorized = await verifyTeacherAuthorization(
        schoolId,
        teacherProfile._id,
        new Types.ObjectId(classId),
        sectionId ? new Types.ObjectId(sectionId) : undefined,
        new Types.ObjectId(subjectId)
      );

      if (!isAuthorized) {
        res.status(403).json({
          success: false,
          message: 'You are not authorized to create study materials for this class and subject.',
        });
        return;
      }
    }

    // Process file upload if file provided in request (via multer or base64/buffer)
    let fileMeta: any = {};
    if ((req as any).file) {
      const uploadedFile = (req as any).file;
      const uploaded = await uploadStudyMaterialAsset(schoolId, uploadedFile);
      fileMeta = {
        fileUrl: uploaded.url,
        originalFileName: uploaded.originalFileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        storageKey: uploaded.storageKey,
        attachments: [
          {
            name: uploaded.originalFileName,
            url: uploaded.url,
            fileType: uploaded.mimeType,
            sizeBytes: uploaded.fileSize,
            storageKey: uploaded.storageKey,
          },
        ],
      };
    } else if (req.body.fileUrl) {
      // Direct fileUrl payload support
      fileMeta = {
        fileUrl: req.body.fileUrl,
        originalFileName: req.body.originalFileName || title,
        mimeType: req.body.mimeType || 'application/pdf',
        fileSize: req.body.fileSize || 1024,
      };
    }

    const material = await StudyMaterial.create({
      schoolId,
      academicSessionId,
      classId,
      sectionId: sectionId ? new Types.ObjectId(sectionId) : undefined,
      subjectId,
      uploadedBy: userId,
      title: title.trim(),
      description,
      category,
      tags: tags || [],
      externalUrl: externalUrl || undefined,
      status: status || 'published',
      publishedAt: status === 'draft' ? undefined : new Date(),
      ...fileMeta,
    });

    res.status(201).json({
      success: true,
      message: 'Study material created successfully',
      data: material,
    });
  } catch (err: any) {
    logger.error(`Error in createStudyMaterial: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error creating study material' });
  }
};

// ============================================================================
// 4. Update Study Material
// ============================================================================
export const updateStudyMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !userId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid IDs required' });
      return;
    }

    const parsed = updateStudyMaterialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const material = await StudyMaterial.findOne({ _id: id, schoolId });
    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    // Teacher authorization: can only edit materials they uploaded or for authorized classes
    if (role === 'teacher') {
      if (material.uploadedBy.toString() !== userId.toString()) {
        res.status(403).json({
          success: false,
          message: 'You can only edit study materials that you uploaded.',
        });
        return;
      }
    }

    // If new file attached, cleanup old Cloudinary asset
    if ((req as any).file) {
      if (material.storageKey) {
        await deleteMaterialStorageAsset(material.storageKey);
      }
      const uploaded = await uploadStudyMaterialAsset(schoolId, (req as any).file);
      material.fileUrl = uploaded.url;
      material.originalFileName = uploaded.originalFileName;
      material.mimeType = uploaded.mimeType;
      material.fileSize = uploaded.fileSize;
      material.storageKey = uploaded.storageKey;
    }

    Object.assign(material, parsed.data);
    await material.save();

    res.json({
      success: true,
      message: 'Study material updated successfully',
      data: material,
    });
  } catch (err: any) {
    logger.error(`Error in updateStudyMaterial: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error updating study material' });
  }
};

// ============================================================================
// 5. Publish Study Material
// ============================================================================
export const publishStudyMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid ID required' });
      return;
    }

    const material = await StudyMaterial.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status: 'published', publishedAt: new Date() } },
      { new: true }
    );

    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Study material published successfully',
      data: material,
    });
  } catch (err: any) {
    logger.error(`Error in publishStudyMaterial: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error publishing material' });
  }
};

// ============================================================================
// 6. Archive Study Material
// ============================================================================
export const archiveStudyMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid ID required' });
      return;
    }

    const material = await StudyMaterial.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status: 'archived' } },
      { new: true }
    );

    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Study material archived successfully',
      data: material,
    });
  } catch (err: any) {
    logger.error(`Error in archiveStudyMaterial: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error archiving material' });
  }
};

// ============================================================================
// 7. Delete Study Material (with Asset Cleanup)
// ============================================================================
export const deleteStudyMaterial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid ID required' });
      return;
    }

    const material = await StudyMaterial.findOne({ _id: id, schoolId });
    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    // Teacher check
    if (role === 'teacher' && material.uploadedBy.toString() !== userId?.toString()) {
      res.status(403).json({ success: false, message: 'You can only delete your own study materials.' });
      return;
    }

    // Clean up Cloudinary asset if present
    if (material.storageKey) {
      await deleteMaterialStorageAsset(material.storageKey);
    }

    await material.deleteOne();

    res.json({
      success: true,
      message: 'Study material and associated storage asset deleted successfully',
    });
  } catch (err: any) {
    logger.error(`Error in deleteStudyMaterial: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error deleting study material' });
  }
};

// ============================================================================
// 8. Upload Study Material File
// ============================================================================
export const uploadMaterialFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    if (!schoolId) {
      res.status(401).json({ success: false, message: 'School context required' });
      return;
    }

    const { name, mimetype, size, base64Data } = req.body;

    if (!name || !mimetype || size === undefined) {
      res.status(400).json({
        success: false,
        message: 'File metadata (name, mimetype, size) is required',
      });
      return;
    }

    const buffer = base64Data ? Buffer.from(base64Data, 'base64') : undefined;

    const uploaded = await uploadStudyMaterialAsset(schoolId, {
      originalname: name,
      mimetype,
      size: Number(size),
      buffer,
    });

    res.status(200).json({
      success: true,
      message: 'Study material file uploaded successfully',
      data: uploaded,
    });
  } catch (err: any) {
    logger.error('[UploadMaterialFile] Error uploading study material file:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to upload study material file',
    });
  }
};

