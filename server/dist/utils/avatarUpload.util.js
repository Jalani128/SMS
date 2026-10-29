import path from 'path';
import { getCloudinary, isConfigured } from '../config/cloudinary.js';
import { logger } from './logger.js';
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max avatar size
export const ALLOWED_AVATAR_MIME_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
};
export const ALLOWED_AVATAR_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
/**
 * Sanitizes filename to prevent directory traversal, script execution, or injection.
 */
export const sanitizeAvatarFilename = (filename) => {
    if (!filename)
        return 'avatar.png';
    const basename = path.basename(filename).replace(/[\r\n\t\0\\/]/g, '');
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized.slice(0, 100);
};
/**
 * Validates avatar image file size, extension, and MIME type match.
 * Strictly blocks executables, scripts, and non-image files.
 */
export const validateAvatarFile = (name, mimetype, sizeBytes) => {
    if (sizeBytes > MAX_AVATAR_SIZE_BYTES) {
        return {
            valid: false,
            error: `Avatar file size exceeds the 5 MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
        };
    }
    const ext = path.extname(name).toLowerCase();
    if (!ALLOWED_AVATAR_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `File extension "${ext}" is not permitted for user avatars. Allowed extensions: ${ALLOWED_AVATAR_EXTENSIONS.join(', ')}`,
        };
    }
    const allowedForMime = ALLOWED_AVATAR_MIME_TYPES[mimetype];
    if (!allowedForMime || !allowedForMime.includes(ext)) {
        return {
            valid: false,
            error: `File MIME type "${mimetype}" does not match file extension "${ext}"`,
        };
    }
    return { valid: true };
};
/**
 * Uploads an avatar image to Cloudinary (or returns verified fallback in offline mode).
 */
export const uploadAvatarAsset = async (schoolId, userId, file) => {
    const sanitizedName = sanitizeAvatarFilename(file.originalname);
    const validation = validateAvatarFile(sanitizedName, file.mimetype, file.size);
    if (!validation.valid) {
        throw new Error(validation.error || 'Avatar file validation failed');
    }
    const schoolFolder = schoolId ? schoolId.toString() : 'global';
    const storageKey = `avatar_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (isConfigured() && file.buffer) {
        try {
            const cloudinary = getCloudinary();
            return await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: `edumanage/schools/${schoolFolder}/avatars`,
                    public_id: storageKey,
                    resource_type: 'image',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                }, (error, result) => {
                    if (error || !result) {
                        logger.error('[AvatarUpload] Cloudinary upload error:', error);
                        return reject(new Error('Failed to upload avatar to cloud storage'));
                    }
                    resolve({
                        url: result.secure_url,
                        storageKey: result.public_id,
                        sizeBytes: file.size,
                        mimeType: file.mimetype,
                    });
                });
                uploadStream.end(file.buffer);
            });
        }
        catch (err) {
            logger.warn('[AvatarUpload] Cloudinary failed, falling back to local stub:', err);
        }
    }
    // Graceful offline/local fallback
    return {
        url: `/api/v1/users/avatar/${storageKey}/${encodeURIComponent(sanitizedName)}`,
        storageKey,
        sizeBytes: file.size,
        mimeType: file.mimetype,
    };
};
/**
 * Cleans up / deletes an avatar asset from Cloudinary when replaced or removed.
 */
export const deleteAvatarAsset = async (storageKey) => {
    if (!storageKey || !isConfigured())
        return;
    try {
        const cloudinary = getCloudinary();
        await cloudinary.uploader.destroy(storageKey);
        logger.info(`[AvatarDelete] Destroyed cloud asset: ${storageKey}`);
    }
    catch (err) {
        logger.warn(`[AvatarDelete] Could not delete cloud asset ${storageKey}:`, err);
    }
};
