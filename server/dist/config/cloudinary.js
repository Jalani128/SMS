import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
let isCloudinaryConfigured = false;
export const initCloudinary = () => {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
        cloudinary.config({
            cloud_name: env.CLOUDINARY_CLOUD_NAME,
            api_key: env.CLOUDINARY_API_KEY,
            api_secret: env.CLOUDINARY_API_SECRET,
            secure: true,
        });
        isCloudinaryConfigured = true;
        logger.info(`[Cloudinary] Media service configured for cloud: ${env.CLOUDINARY_CLOUD_NAME}`);
    }
    else {
        logger.info('[Cloudinary] Credentials omitted; media uploads will use architectural stubs.');
    }
};
export const getCloudinary = () => cloudinary;
export const isConfigured = () => isCloudinaryConfigured;
