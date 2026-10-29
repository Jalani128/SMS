import { Response } from 'express';

export interface ApiResponseOptions<T = unknown> {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  static send<T>(
    res: Response,
    {
      statusCode = 200,
      success = true,
      message = 'Operation successful',
      data,
      meta,
    }: ApiResponseOptions<T>
  ): Response {
    return res.status(statusCode).json({
      success,
      message,
      ...(data !== undefined && { data }),
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        ...meta,
      },
    });
  }

  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200, meta?: Record<string, unknown>): Response {
    return this.send(res, { statusCode, success: true, message, data, meta });
  }

  static created<T>(res: Response, data: T, message = 'Resource created successfully', meta?: Record<string, unknown>): Response {
    return this.send(res, { statusCode: 201, success: true, message, data, meta });
  }
}
