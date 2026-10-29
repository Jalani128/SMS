import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface ServerConfig {
  PORT: number;
  NODE_ENV: string;
  API_PREFIX: string;
  CLIENT_URL: string;
  ALLOWED_ORIGINS: string[];
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  COOKIE_SECRET: string;
  DEFAULT_DEMO_SCHOOL_ID: string;
  DEFAULT_DEMO_SCHOOL_NAME: string;
  AUTO_ACTIVATE_SCHOOLS: boolean;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM_EMAIL: string;
  SMTP_FROM_NAME: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  SOCKET_CORS_ORIGIN: string;
  AI_PROVIDER: string;
  AI_API_KEY: string;
  AI_MODEL: string;
  AI_TIMEOUT_MS: number;
  AI_MAX_TOKENS: number;
}

const getValidatedSecret = (key: string, devFallback: string, minLength = 32): string => {
  const secret = process.env[key];
  const isEnforcedEnv = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  if (!secret) {
    if (isEnforcedEnv) {
      throw new Error(`FATAL: ${key} environment variable must be configured in ${process.env.NODE_ENV}!`);
    }
    return devFallback;
  }
  if (secret.length < minLength && isEnforcedEnv) {
    throw new Error(`FATAL: ${key} must be at least ${minLength} characters in ${process.env.NODE_ENV}!`);
  }
  return secret;
};

export const assertDatabaseIsolation = (uri: string, nodeEnv: string): void => {
  if (nodeEnv === 'staging') {
    const lower = (uri || '').toLowerCase();
    if (lower.includes('production') || lower.includes('_prod') || lower.includes('edumanage_production')) {
      throw new Error('FATAL SAFETY VIOLATION: Staging environment cannot connect to a production database target!');
    }
  }
};

const resolveAllowedOrigins = (): string[] => {
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim();
  if (clientUrl && !origins.includes(clientUrl)) {
    origins.push(clientUrl);
  }

  return origins;
};

export const env: ServerConfig = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ALLOWED_ORIGINS: resolveAllowedOrigins(),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/edumanage_db',
  JWT_SECRET: getValidatedSecret(
    'JWT_SECRET',
    'dev_insecure_jwt_secret_change_in_production_minimum_32_characters'
  ),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m', // Short-lived access tokens
  JWT_REFRESH_SECRET: getValidatedSecret(
    'JWT_REFRESH_SECRET',
    'dev_insecure_jwt_refresh_secret_change_in_prod_32char'
  ),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  JWT_ISSUER: process.env.JWT_ISSUER || 'edumanage-sms-api',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'edumanage-sms-client',
  COOKIE_SECRET: getValidatedSecret(
    'COOKIE_SECRET',
    'dev_cookie_signing_secret_min_32_chars_long'
  ),
  DEFAULT_DEMO_SCHOOL_ID: process.env.DEFAULT_DEMO_SCHOOL_ID || 'school_demo_greenwood_001',
  DEFAULT_DEMO_SCHOOL_NAME: process.env.DEFAULT_DEMO_SCHOOL_NAME || 'Greenwood International Academy',
  AUTO_ACTIVATE_SCHOOLS:
    process.env.AUTO_ACTIVATE_SCHOOLS !== undefined
      ? process.env.AUTO_ACTIVATE_SCHOOLS === 'true'
      : process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '2525', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'no-reply@edumanage.example.com',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'EduManage Notifications',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
  AI_PROVIDER: process.env.AI_PROVIDER || 'gemini',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'gemini-1.5-flash',
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || '30000', 10),
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
};

// Validate database target isolation to prevent staging from connecting to production
assertDatabaseIsolation(env.MONGODB_URI, env.NODE_ENV);
