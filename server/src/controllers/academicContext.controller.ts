import { Request, Response, NextFunction } from 'express';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * GET /api/v1/academic-context
 * Returns current classes, sections, and active academic sessions for the tenant school
 */
export const getAcademicContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return next(ApiError.forbidden('School tenant context required'));
    }

    const [classes, sections, sessions] = await Promise.all([
      Class.find({ schoolId, status: 'active' }).sort({ order: 1, name: 1 }).lean(),
      Section.find({ schoolId, status: 'active' }).sort({ name: 1 }).lean(),
      AcademicSession.find({ schoolId }).sort({ isCurrent: -1, startDate: -1 }).lean(),
    ]);

    ApiResponse.success(
      res,
      {
        classes,
        sections,
        sessions,
        currentSession: sessions.find((s) => s.isCurrent) || sessions[0] || null,
      },
      'Academic context retrieved'
    );
  } catch (error) {
    next(error);
  }
};
