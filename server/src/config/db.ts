import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { dbObservability } from '../utils/dbObservability.js';

/**
 * Sanitizes a MongoDB connection string or error message so credentials are never exposed in logs.
 */
export const sanitizeMongoUri = (uriOrMessage: string): string => {
  return uriOrMessage.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/i, 'mongodb$1://***:***@');
};

export const connectDB = async (): Promise<boolean> => {
  try {
    // Initialize observability listeners
    dbObservability.init();

    mongoose.set('strictQuery', true);

    // Mongoose 8.x compatible connection options with optimal pooling & timeout safeguards
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      autoIndex: env.NODE_ENV !== 'production', // Build indexes in dev, disable in high-scale prod
    });

    const host = mongoose.connection.host || 'connected-cluster';
    const port = mongoose.connection.port ? `:${mongoose.connection.port}` : '';
    const dbName = mongoose.connection.name || '';
    logger.info(`[Database] MongoDB connected successfully to ${host}${port}/${dbName}`);
    return true;
  } catch (error: any) {
    // Disable Mongoose command buffering when connection fails to prevent unhandled timer timeouts
    mongoose.set('bufferCommands', false);
    const sanitizedMsg = sanitizeMongoUri(error.message || 'Unknown connection error');
    logger.warn(
      `[Database] MongoDB connection notice: ${sanitizedMsg}. Application will continue in offline/detached mode if database is unavailable.`
    );
    return false;
  }
};

export const getDbStatus = (): { status: string; host?: string; readyState: number } => {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host ? mongoose.connection.host : undefined,
  };
};

export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('[Database] MongoDB connection closed gracefully.');
  }
};
