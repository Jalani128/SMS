import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// Request interceptor: attach bearer token, tenant school header, and correlation ID
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('edumanage_token');
    const schoolId = localStorage.getItem('edumanage_school_id') || 'school_demo_greenwood_001';

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (schoolId) {
      config.headers['x-school-id'] = schoolId;
    }

    if (!config.headers['x-request-id']) {
      config.headers['x-request-id'] = `req_cl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: envelope parsing and error formatting
apiClient.interceptors.response.use(
  (response) => {
    // Return standard response data
    return response;
  },
  (error: AxiosError<{ message?: string; errors?: unknown[]; meta?: { requestId?: string } }>) => {
    const requestId =
      (error.response?.headers?.['x-request-id'] as string) ||
      error.response?.data?.meta?.requestId;

    if (error.response?.status === 401) {
      // Handle unauthorized / token expired
      console.warn('[API] 401 Unauthorized encountered. Session may be expired.', { requestId });
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const enrichedError = new Error(message) as Error & { requestId?: string; statusCode?: number };
    if (requestId) enrichedError.requestId = requestId;
    if (error.response?.status) enrichedError.statusCode = error.response.status;

    return Promise.reject(enrichedError);
  }
);

// Typed wrapper methods
export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
    const res = await apiClient.get<ApiResponse<T>>(url, { params });
    return res.data;
  },
  post: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    const res = await apiClient.post<ApiResponse<T>>(url, data);
    return res.data;
  },
  put: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    const res = await apiClient.put<ApiResponse<T>>(url, data);
    return res.data;
  },
  patch: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    const res = await apiClient.patch<ApiResponse<T>>(url, data);
    return res.data;
  },
  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    const res = await apiClient.delete<ApiResponse<T>>(url);
    return res.data;
  },
};
