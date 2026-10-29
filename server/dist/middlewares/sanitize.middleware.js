/**
 * Checks if a value is a plain JavaScript object
 */
const isPlainObject = (obj) => {
    return (obj !== null &&
        typeof obj === 'object' &&
        !Array.isArray(obj) &&
        !(obj instanceof Date) &&
        !(obj instanceof RegExp) &&
        !(typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)));
};
/**
 * Recursively sanitizes an object or array by removing keys
 * that contain '$' (NoSQL operator injection like $gt, $ne, $where)
 * or '.' (path traversal / document property pollution).
 */
export const sanitizeData = (data) => {
    if (!data)
        return data;
    if (Array.isArray(data)) {
        return data.map((item) => sanitizeData(item));
    }
    if (isPlainObject(data)) {
        const cleanObj = {};
        for (const [key, value] of Object.entries(data)) {
            // Disallow MongoDB operators ($) or dot notation keys in user payloads
            if (key.includes('$') || key.includes('.')) {
                continue;
            }
            // Prevent prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }
            cleanObj[key] = sanitizeData(value);
        }
        return cleanObj;
    }
    return data;
};
/**
 * Express middleware to sanitize req.body, req.query, and req.params against NoSQL query injection
 */
export const mongoSanitize = (req, _res, next) => {
    try {
        if (req.body) {
            req.body = sanitizeData(req.body);
        }
        if (req.query) {
            req.query = sanitizeData(req.query);
        }
        if (req.params) {
            req.params = sanitizeData(req.params);
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
