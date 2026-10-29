export class ApiError extends Error {
    statusCode;
    errors;
    isOperational;
    constructor(statusCode = 500, message = 'Internal Server Error', errors, isOperational = true, stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = isOperational;
        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    static badRequest(message = 'Bad Request', errors) {
        return new ApiError(400, message, errors);
    }
    static unauthorized(message = 'Unauthorized access') {
        return new ApiError(401, message);
    }
    static forbidden(message = 'Access forbidden: Insufficient permissions') {
        return new ApiError(403, message);
    }
    static notFound(message = 'Resource not found') {
        return new ApiError(404, message);
    }
    static conflict(message = 'Resource conflict') {
        return new ApiError(409, message);
    }
    static tooManyRequests(message = 'Too many requests, please try again later') {
        return new ApiError(429, message);
    }
    static internal(message = 'Internal server error') {
        return new ApiError(500, message);
    }
    static badGateway(message = 'Bad gateway') {
        return new ApiError(502, message);
    }
    static serviceUnavailable(message = 'Service unavailable') {
        return new ApiError(503, message);
    }
    static gatewayTimeout(message = 'Gateway timeout') {
        return new ApiError(504, message);
    }
}
