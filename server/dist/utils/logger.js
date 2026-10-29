import { AsyncLocalStorage } from 'node:async_hooks';
export const logContextStorage = new AsyncLocalStorage();
export const runWithLogContext = (context, fn) => {
    return logContextStorage.run(context, fn);
};
export const getLogContext = () => {
    return logContextStorage.getStore() || {};
};
const SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'hashedotp',
    'otp',
    'token',
    'accesstoken',
    'refreshtoken',
    'jwt_secret',
    'cookie_secret',
    'authorization',
    'cookie',
    'apikey',
    'ai_api_key',
    'smtp_pass',
    'cloudinary_api_secret',
    'cardnumber',
    'cvv',
    'ssn',
    'nationalid',
    'bankaccount',
    'secretanswer',
    'mongodb_uri',
    'connectionstring',
]);
/**
 * Sanitizes sensitive strings such as MongoDB credentials and raw Bearer tokens.
 */
export const sanitizeString = (str) => {
    return str
        .replace(/mongodb(\+srv)?:\/\/([^/\s]+)@/gi, 'mongodb$1://***:***@')
        .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer ***REDACTED***');
};
/**
 * Recursively redacts sensitive credentials and personal authentication tokens from log metadata.
 */
export const redactSensitiveData = (data) => {
    if (typeof data === 'string') {
        return sanitizeString(data);
    }
    if (!data || typeof data !== 'object')
        return data;
    if (Array.isArray(data))
        return data.map(redactSensitiveData);
    const sanitized = {};
    for (const [key, val] of Object.entries(data)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            sanitized[key] = '***REDACTED***';
        }
        else if (typeof val === 'string') {
            sanitized[key] = sanitizeString(val);
        }
        else if (typeof val === 'object' && val !== null) {
            sanitized[key] = redactSensitiveData(val);
        }
        else {
            sanitized[key] = val;
        }
    }
    return sanitized;
};
const outputLog = (level, message, meta) => {
    const context = getLogContext();
    const sanitizedMeta = meta.map(redactSensitiveData);
    const isProduction = process.env.NODE_ENV === 'production' ||
        process.env.NODE_ENV === 'staging' ||
        process.env.LOG_FORMAT === 'json';
    if (isProduction) {
        const logObj = {
            timestamp: new Date().toISOString(),
            level,
            message: sanitizeString(message),
            ...(context.correlationId && { correlationId: context.correlationId }),
            ...(context.schoolId && { schoolId: context.schoolId }),
            ...(context.userId && { userId: context.userId }),
        };
        if (sanitizedMeta.length === 1 && typeof sanitizedMeta[0] === 'object' && sanitizedMeta[0] !== null) {
            Object.assign(logObj, sanitizedMeta[0]);
        }
        else if (sanitizedMeta.length > 0) {
            logObj.meta = sanitizedMeta;
        }
        const jsonStr = JSON.stringify(logObj);
        if (level === 'error')
            console.error(jsonStr);
        else if (level === 'warn')
            console.warn(jsonStr);
        else
            console.log(jsonStr);
    }
    else {
        const corrTag = context.correlationId ? ` [${context.correlationId}]` : '';
        const prefix = `[${level.toUpperCase()}] [${new Date().toISOString()}]${corrTag} ${sanitizeString(message)}`;
        if (level === 'error')
            console.error(prefix, ...sanitizedMeta);
        else if (level === 'warn')
            console.warn(prefix, ...sanitizedMeta);
        else if (level === 'debug') {
            if (process.env.NODE_ENV !== 'production')
                console.debug(prefix, ...sanitizedMeta);
        }
        else {
            console.log(prefix, ...sanitizedMeta);
        }
    }
};
export const logger = {
    info: (message, ...meta) => outputLog('info', message, meta),
    warn: (message, ...meta) => outputLog('warn', message, meta),
    error: (message, ...meta) => outputLog('error', message, meta),
    debug: (message, ...meta) => outputLog('debug', message, meta),
};
