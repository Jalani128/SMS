import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';
  schoolId?: string;
  name?: string;
  tokenVersion?: number;
}

export const signAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: (env.JWT_EXPIRES_IN || '15m') as any,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const signRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const options: VerifyOptions = {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.verify(token, env.JWT_SECRET, options) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const options: VerifyOptions = {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };
  return jwt.verify(token, env.JWT_REFRESH_SECRET, options) as TokenPayload;
};
