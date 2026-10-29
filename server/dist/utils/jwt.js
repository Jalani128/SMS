import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export const signAccessToken = (payload) => {
    const options = {
        expiresIn: (env.JWT_EXPIRES_IN || '15m'),
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    };
    return jwt.sign(payload, env.JWT_SECRET, options);
};
export const signRefreshToken = (payload) => {
    const options = {
        expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '7d'),
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};
export const verifyAccessToken = (token) => {
    const options = {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    };
    return jwt.verify(token, env.JWT_SECRET, options);
};
export const verifyRefreshToken = (token) => {
    const options = {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    };
    return jwt.verify(token, env.JWT_REFRESH_SECRET, options);
};
