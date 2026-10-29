import { AsyncLocalStorage } from 'node:async_hooks';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  correlationId?: string;
  schoolId?: string;
  userId?: string;
}

export const logContextStorage = new AsyncLocalStorage<LogContext>();

export const runWithLogContext = <T>(context: LogContext, fn: () => T): T => {
  return logContextStorage.run(context, fn);
};

export const getLogContext = (): LogContext => {
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
export const sanitizeString = (str: string): string => {
  return str
    .replace(/mongodb(\+srv)?:\/\/([^/\s]+)@/gi, 'mongodb$1://***:***@')
    .replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer ***REDACTED***');
};

/**
 * Recursively redacts sensitive credentials and personal authentication tokens from log metadata.
 */
export const redactSensitiveData = (data: unknown): unknown => {
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redactSensitiveData);

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof val === 'string') {
      sanitized[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = redactSensitiveData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
};

const outputLog = (level: LogLevel, message: string, meta: unknown[]) => {
  const context = getLogContext();
  const sanitizedMeta = meta.map(redactSensitiveData);
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'staging' ||
    process.env.LOG_FORMAT === 'json';

  if (isProduction) {
    const logObj: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizeString(message),
      ...(context.correlationId && { correlationId: context.correlationId }),
      ...(context.schoolId && { schoolId: context.schoolId }),
      ...(context.userId && { userId: context.userId }),
    };

    if (sanitizedMeta.length === 1 && typeof sanitizedMeta[0] === 'object' && sanitizedMeta[0] !== null) {
      Object.assign(logObj, sanitizedMeta[0]);
    } else if (sanitizedMeta.length > 0) {
      logObj.meta = sanitizedMeta;
    }

    const jsonStr = JSON.stringify(logObj);
    if (level === 'error') console.error(jsonStr);
    else if (level === 'warn') console.warn(jsonStr);
    else console.log(jsonStr);
  } else {
    const corrTag = context.correlationId ? ` [${context.correlationId}]` : '';
    const prefix = `[${level.toUpperCase()}] [${new Date().toISOString()}]${corrTag} ${sanitizeString(message)}`;

    if (level === 'error') console.error(prefix, ...sanitizedMeta);
    else if (level === 'warn') console.warn(prefix, ...sanitizedMeta);
    else if (level === 'debug') {
      if (process.env.NODE_ENV !== 'production') console.debug(prefix, ...sanitizedMeta);
    } else {
      console.log(prefix, ...sanitizedMeta);
    }
  }
};

export const logger = {
  info: (message: string, ...meta: unknown[]) => outputLog('info', message, meta),
  warn: (message: string, ...meta: unknown[]) => outputLog('warn', message, meta),
  error: (message: string, ...meta: unknown[]) => outputLog('error', message, meta),
  debug: (message: string, ...meta: unknown[]) => outputLog('debug', message, meta),
};
