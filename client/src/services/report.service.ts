import { apiClient } from '../lib/api';
import {
  ReportFilterQuery,
  DashboardAnalyticsResponse,
  AttendanceReportResponse,
  FeeFinanceReportResponse,
  StudentEnrollmentReportResponse,
  AcademicPerformanceReportResponse,
  HomeworkReportResponse,
  SingleStudentReportResponse,
  AdvancedAnalyticsResponse,
} from '../types/reports';

export const reportService = {
  /**
   * 1. Overview Dashboard Analytics
   */
  async getDashboardAnalytics(
    params?: ReportFilterQuery
  ): Promise<DashboardAnalyticsResponse> {
    const res = await apiClient.get<{ success: boolean; data: DashboardAnalyticsResponse }>(
      '/reports/dashboard',
      { params }
    );
    return res.data.data;
  },

  /**
   * 2. Attendance Reports
   */
  async getAttendanceReport(
    params?: ReportFilterQuery
  ): Promise<AttendanceReportResponse> {
    const res = await apiClient.get<{ success: boolean; data: AttendanceReportResponse }>(
      '/reports/attendance',
      { params }
    );
    return res.data.data;
  },

  /**
   * 3. Fee & Financial Reports (Admin Only)
   */
  async getFeeFinanceReport(
    params?: ReportFilterQuery
  ): Promise<FeeFinanceReportResponse> {
    const res = await apiClient.get<{ success: boolean; data: FeeFinanceReportResponse }>(
      '/reports/fees',
      { params }
    );
    return res.data.data;
  },

  /**
   * 4. Student Enrollment Reports
   */
  async getStudentEnrollmentReport(
    params?: ReportFilterQuery
  ): Promise<StudentEnrollmentReportResponse> {
    const res = await apiClient.get<{ success: boolean; data: StudentEnrollmentReportResponse }>(
      '/reports/students',
      { params }
    );
    return res.data.data;
  },

  /**
   * 5. Academic Performance Reports
   */
  async getAcademicPerformanceReport(
    params?: ReportFilterQuery
  ): Promise<AcademicPerformanceReportResponse> {
    const res = await apiClient.get<{ success: boolean; data: AcademicPerformanceReportResponse }>(
      '/reports/academic-performance',
      { params }
    );
    return res.data.data;
  },

  /**
   * 6. Homework Completion Reports
   */
  async getHomeworkReport(
    params?: ReportFilterQuery
  ): Promise<HomeworkReportResponse> {
    const res = await apiClient.get<{ success: boolean; data: HomeworkReportResponse }>(
      '/reports/homework',
      { params }
    );
    return res.data.data;
  },

  /**
   * 7. Single Student Consolidated Performance Report
   */
  async getStudentReport(
    studentId: string
  ): Promise<SingleStudentReportResponse> {
    const res = await apiClient.get<{ success: boolean; data: SingleStudentReportResponse }>(
      `/reports/student/${studentId}`
    );
    return res.data.data;
  },

  /**
   * Universal CSV File Downloader
   */
  async downloadReportCsv(
    reportType: 'attendance' | 'fees' | 'students' | 'academic' | 'homework',
    params?: ReportFilterQuery
  ): Promise<void> {
    const endpointMap: Record<string, string> = {
      attendance: '/reports/attendance/export',
      fees: '/reports/fees/export',
      students: '/reports/students/export',
      academic: '/reports/academic-performance/export',
      homework: '/reports/homework/export',
    };

    const endpoint = endpointMap[reportType] || `/reports/${reportType}/export`;
    const res = await apiClient.get(endpoint, {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * 9. Phase 25: Comprehensive Advanced Analytics Overview
   */
  async getAdvancedAnalytics(
    params?: ReportFilterQuery
  ): Promise<AdvancedAnalyticsResponse> {
    const res = await apiClient.get<{ success: boolean; data: AdvancedAnalyticsResponse }>(
      '/reports/advanced-overview',
      { params }
    );
    return res.data.data;
  },

  /**
   * 10. Phase 25: Export Comprehensive Advanced Analytics CSV
   */
  async exportAdvancedAnalyticsCsv(
    params?: ReportFilterQuery
  ): Promise<void> {
    const res = await apiClient.get('/reports/advanced-overview/export', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `advanced_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
