import { apiClient } from '../lib/api';
import {
  ChatResponse,
  HomeworkHelpRequest,
  HomeworkHelpResponse,
  QuizGeneratorRequest,
  QuizGeneratorResponse,
  ReportCardCommentRequest,
  ReportCardCommentResponse,
  FeeReminderRequest,
  FeeReminderResponse,
  NoticeGeneratorRequest,
  NoticeGeneratorResponse,
  SchoolInsightsRequest,
  SchoolInsightsResponse,
} from '../types/ai';

export const aiService = {
  /**
   * 1. Send chat message to role-scoped AI copilot
   */
  async sendChatMessage(
    message: string,
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Promise<ChatResponse> {
    const response = await apiClient.post<{ success: boolean; data: ChatResponse }>(
      '/ai/chat',
      { message, history }
    );
    return response.data.data;
  },

  /**
   * 2. Request step-by-step homework guidance and hints
   */
  async getHomeworkHelp(params: HomeworkHelpRequest): Promise<HomeworkHelpResponse> {
    const response = await apiClient.post<{ success: boolean; data: HomeworkHelpResponse }>(
      '/ai/homework-help',
      params
    );
    return response.data.data;
  },

  /**
   * 3. Generate structured quiz draft
   */
  async generateQuiz(params: QuizGeneratorRequest): Promise<QuizGeneratorResponse> {
    const response = await apiClient.post<{ success: boolean; data: QuizGeneratorResponse }>(
      '/ai/quiz-generator',
      params
    );
    return response.data.data;
  },

  /**
   * 4. Generate draft report-card comment based on factual records
   */
  async generateReportCardComment(
    params: ReportCardCommentRequest
  ): Promise<ReportCardCommentResponse> {
    const response = await apiClient.post<{ success: boolean; data: ReportCardCommentResponse }>(
      '/ai/report-card-comment',
      params
    );
    return response.data.data;
  },

  /**
   * 5. Generate draft fee reminder reflecting verified outstanding balance
   */
  async generateFeeReminder(params: FeeReminderRequest): Promise<FeeReminderResponse> {
    const response = await apiClient.post<{ success: boolean; data: FeeReminderResponse }>(
      '/ai/fee-reminder',
      params
    );
    return response.data.data;
  },

  /**
   * 6. Generate draft notice or event announcement
   */
  async generateNotice(params: NoticeGeneratorRequest): Promise<NoticeGeneratorResponse> {
    const response = await apiClient.post<{ success: boolean; data: NoticeGeneratorResponse }>(
      '/ai/notice-generator',
      params
    );
    return response.data.data;
  },

  /**
   * 7. Fetch factual school analytics insights
   */
  async getSchoolInsights(params: SchoolInsightsRequest): Promise<SchoolInsightsResponse> {
    const response = await apiClient.post<{ success: boolean; data: SchoolInsightsResponse }>(
      '/ai/school-insights',
      params
    );
    return response.data.data;
  },
};
