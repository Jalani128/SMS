import { TokenPayload } from '../utils/jwt.js';
import { ISchool } from '../models/School.model.js';
import { IUser } from '../models/User.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      currentUser?: IUser;
      school?: ISchool;
      schoolId?: string;
      id?: string;
      requestId?: string;
      correlationId?: string;
    }
  }
}

export {};
