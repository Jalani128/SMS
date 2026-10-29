import path from 'path';
import { getCloudinary, isConfigured } from '../config/cloudinary.js';
import { logger } from './logger.js';
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_COUNT = 5;
// Allowed file types and MIME type mapping
export const ALLOWED_MIME_TYPES = {
    // Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/plain': ['.txt'],
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
};
export const ALLOWED_EXTENSIONS = [
    '.pdf',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.txt',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
];
/**
 * Sanitizes a filename to prevent path traversal and arbitrary injection.
 */
export const sanitizeFilename = (filename) => {
    if (!filename)
        return 'attachment';
    // Strip path traversal and directory separators
    const basename = path.basename(filename).replace(/[\r\n\t\0\\/]/g, '');
    // Retain only alphanumeric, dots, underscores, dashes
    const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Truncate to safe length
    return sanitized.slice(0, 100);
};
/**
 * Validates file size, extension, and mime type.
 */
export const validateAttachmentFile = (name, mimetype, sizeBytes) => {
    if (sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
        return {
            valid: false,
            error: `File size exceeds the 10 MB maximum limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
        };
    }
    const ext = path.extname(name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `File extension "${ext}" is not permitted. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        };
    }
    const allowedForMime = ALLOWED_MIME_TYPES[mimetype];
    if (!allowedForMime || !allowedForMime.includes(ext)) {
        return {
            valid: false,
            error: `File MIME type "${mimetype}" does not match file extension "${ext}"`,
        };
    }
    return { valid: true };
};
/**
 * Uploads a buffer or file to Cloudinary (or returns verified metadata in offline mode).
 */
export const uploadHomeworkAttachment = async (schoolId, file) => {
    const sanitizedName = sanitizeFilename(file.originalname);
    const validation = validateAttachmentFile(sanitizedName, file.mimetype, file.size);
    if (!validation.valid) {
        throw new Error(validation.error || 'Attachment validation failed');
    }
    const storageKey = `hw_${schoolId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (isConfigured() && file.buffer) {
        try {
            const cloudinary = getCloudinary();
            return await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: `edumanage/schools/${schoolId}/homework`,
                    public_id: storageKey,
                    resource_type: 'auto',
                }, (error, result) => {
                    if (error || !result) {
                        logger.error('[CloudinaryUpload] Error uploading file stream:', error);
                        return reject(new Error('Failed to upload file to Cloudinary'));
                    }
                    resolve({
                        name: sanitizedName,
                        url: result.secure_url,
                        fileType: file.mimetype,
                        sizeBytes: file.size,
                        storageKey: result.public_id,
                    });
                });
                uploadStream.end(file.buffer);
            });
        }
        catch (err) {
            logger.warn('[UploadAttachment] Cloudinary upload failed, falling back to storage stub:', err);
        }
    }
    // Graceful offline / local stub fallback
    return {
        name: sanitizedName,
        url: `/api/v1/homework/files/${storageKey}/${encodeURIComponent(sanitizedName)}`,
        fileType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
    };
};
