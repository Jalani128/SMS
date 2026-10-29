export class ApiError extends Error {
  public statusCode: number;
  public errors?: unknown[];
  public isOperational: boolean;

  constructor(
    statusCode = 500,
    message = 'Internal Server Error',
    errors?: unknown[],
    isOperational = true,
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors?: unknown[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized access'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Access forbidden: Insufficient permissions'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource conflict'): ApiError {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message);
  }

  static badGateway(message = 'Bad gateway'): ApiError {
    return new ApiError(502, message);
  }

  static serviceUnavailable(message = 'Service unavailable'): ApiError {
    return new ApiError(503, message);
  }

  static gatewayTimeout(message = 'Gateway timeout'): ApiError {
    return new ApiError(504, message);
  }
}
