export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown[];
  meta?: {
    timestamp: string;
    path?: string;
  };
}
