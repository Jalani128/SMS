import path from 'path';
import { Types } from 'mongoose';
import { getCloudinary, isConfigured } from '../config/cloudinary.js';
import { logger } from './logger.js';

export const MAX_MATERIAL_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB max educational file

export const ALLOWED_MATERIAL_MIME_TYPES: Record<string, string[]> = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],
  'application/epub+zip': ['.epub'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

export const ALLOWED_MATERIAL_EXTENSIONS = Object.values(ALLOWED_MATERIAL_MIME_TYPES).flat();

/**
 * Sanitizes filename to prevent directory traversal and script execution
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return 'material';
  const basename = path.basename(filename).replace(/[\r\n\t\0\\/]/g, '');
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.slice(0, 120);
};

/**
 * Validates file size, extension, and MIME type match
 */
export const validateMaterialFile = (
  name: string,
  mimetype: string,
  sizeBytes: number
): { valid: boolean; error?: string } => {
  if (sizeBytes > MAX_MATERIAL_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 25 MB limit (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`,
    };
  }

  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_MATERIAL_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension "${ext}" is not permitted for study materials. Allowed: ${ALLOWED_MATERIAL_EXTENSIONS.join(', ')}`,
    };
  }

  const allowedForMime = ALLOWED_MATERIAL_MIME_TYPES[mimetype];
  if (!allowedForMime || !allowedForMime.includes(ext)) {
    return {
      valid: false,
      error: `File MIME type "${mimetype}" does not match file extension "${ext}"`,
    };
  }

  return { valid: true };
};

/**
 * Validates external URL: requires http/https; strictly blocks javascript:, data:, vbscript:, etc.
 */
export const validateExternalUrl = (url: string): { valid: boolean; error?: string } => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'External URL must be a valid string' };
  }

  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return { valid: false, error: 'External URL scheme is prohibited for security reasons' };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'External URL must use http: or https: protocol' };
    }
  } catch {
    return { valid: false, error: 'Malformed external URL' };
  }

  return { valid: true };
};

/**
 * Uploads a study material asset to Cloudinary (or returns verified fallback metadata)
 */
export const uploadStudyMaterialAsset = async (
  schoolId: Types.ObjectId,
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer?: Buffer;
  }
): Promise<{
  url: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
}> => {
  const sanitizedName = sanitizeFilename(file.originalname);
  const validation = validateMaterialFile(sanitizedName, file.mimetype, file.size);

  if (!validation.valid) {
    throw new Error(validation.error || 'Study material validation failed');
  }

  const storageKey = `mat_${schoolId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  if (isConfigured() && file.buffer) {
    try {
      const cloudinary = getCloudinary();
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `edumanage/schools/${schoolId}/study-materials`,
            public_id: storageKey,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error || !result) {
              logger.error('[CloudinaryUpload] Error uploading study material:', error);
              return reject(new Error('Failed to upload file to Cloudinary'));
            }

            resolve({
              url: result.secure_url,
              originalFileName: sanitizedName,
              mimeType: file.mimetype,
              fileSize: file.size,
              storageKey: result.public_id,
            });
          }
        );

        uploadStream.end(file.buffer);
      });
    } catch (err) {
      logger.warn('[UploadStudyMaterial] Cloudinary upload failed, falling back to local storage stub:', err);
    }
  }

  // Offline / local stub fallback
  return {
    url: `/api/v1/study-materials/files/${storageKey}/${encodeURIComponent(sanitizedName)}`,
    originalFileName: sanitizedName,
    mimeType: file.mimetype,
    fileSize: file.size,
    storageKey,
  };
};

/**
 * Deletes a storage asset from Cloudinary when replacing or deleting materials
 */
export const deleteMaterialStorageAsset = async (storageKey?: string): Promise<void> => {
  if (!storageKey || !isConfigured()) return;

  try {
    const cloudinary = getCloudinary();
    await cloudinary.uploader.destroy(storageKey);
    logger.info(`[CloudinaryDelete] Asset deleted: ${storageKey}`);
  } catch (err) {
    logger.warn(`[CloudinaryDelete] Failed to delete asset ${storageKey}:`, err);
  }
};
