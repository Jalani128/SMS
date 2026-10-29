import React, { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { aiService } from '../../services/ai.service';
import {
  ChatMessage,
  HomeworkHelpResponse,
  QuizGeneratorResponse,
  ReportCardCommentResponse,
  FeeReminderResponse,
  NoticeGeneratorResponse,
  SchoolInsightsResponse,
} from '../../types/ai';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  AlertCircle,
  Copy,
  Receipt,
  Bell,
  BarChart2,
  Loader2,
  RefreshCw,
  Lightbulb,
  Check,
} from 'lucide-react';

export const AiAssistantPage: React.FC = () => {
  const { activeRole, user, schoolName } = useAuth();

  // Role-appropriate active tab
  const [activeTab, setActiveTab] = useState<'chat' | 'homework' | 'quiz' | 'comments' | 'fees' | 'notices' | 'insights'>('chat');

  // Global error banner (e.g. if AI_API_KEY is not configured)
  const [configurationError, setConfigurationError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // 1. Chat State
  // --------------------------------------------------------------------------
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello ${user?.name || 'there'}! I am your AI Institutional Assistant for ${schoolName}. How can I assist you with academic tasks, communication, or school operations today?`,
      timestamp: 'Just now',
    },
  ]);

  const handleSendChat = async (presetPrompt?: string) => {
    const textToSend = (presetPrompt || inputMessage).trim();
    if (!textToSend || chatLoading) return;

    setInputMessage('');
    setConfigurationError(null);

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: (m.sender === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.text,
      }));

      const res = await aiService.sendChatMessage(textToSend, history);

      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      const msg = err.message || 'Failed to communicate with AI Assistant.';
      if (msg.includes('AI_API_KEY') || msg.includes('not configured')) {
        setConfigurationError(msg);
      }
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Error: ${msg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 2. Homework Helper State
  // --------------------------------------------------------------------------
  const [homeworkQuestion, setHomeworkQuestion] = useState('');
  const [homeworkTopic, setHomeworkTopic] = useState('');
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkResult, setHomeworkResult] = useState<HomeworkHelpResponse | null>(null);

  const handleHomeworkHelp = async () => {
    if (!homeworkQuestion.trim() || homeworkLoading) return;
    setHomeworkLoading(true);
    setConfigurationError(null);

    try {
      const res = await aiService.getHomeworkHelp({
        question: homeworkQuestion,
        topic: homeworkTopic || undefined,
      });
      setHomeworkResult(res);
    } catch (err: any) {
      setConfigurationError(err.message || 'Homework helper failed.');
    } finally {
      setHomeworkLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. Quiz Generator State
  // --------------------------------------------------------------------------
  const [quizTopic, setQuizTopic] = useState('');
  const [quizQuestionType, setQuizQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer'>('multiple_choice');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizCount, setQuizCount] = useState<number>(5);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizGeneratorResponse | null>(null);
  const [copiedQuiz, setCopiedQuiz] = useState(false);

  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim() || quizLoading) return;
    setQuizLoading(true);
    setConfigurationError(null);

    try {
      const res = await aiService.generateQuiz({
        classId: '67b6eb4c0b46eb132a000001',
        subjectId: '67b6eb4c0b46eb132a000002',
        topic: quizTopic,
        questionType: quizQuestionType,
        difficulty: quizDifficulty,
        questionCount: quizCount,
      });
      setQuizResult(res);
    } catch (err: any) {
      setConfigurationError(err.message || 'Quiz generation failed.');
    } finally {
      setQuizLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. Report-Card Comment Generator State
  // --------------------------------------------------------------------------
  const [commentStudentId, setCommentStudentId] = useState('67b6eb4c0b46eb132a000003');
  const [commentTone, setCommentTone] = useState<'encouraging' | 'formal' | 'constructive'>('encouraging');
  const [commentStrengths, setCommentStrengths] = useState('Diligent, active participation in class');
  const [commentAreas, setCommentAreas] = useState('Could improve exam preparation time management');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentResult, setCommentResult] = useState<ReportCardCommentResponse | null>(null);
  const [copiedComment, setCopiedComment] = useState(false);

  const handleGenerateComment = async () => {
    setCommentLoading(true);
    setConfigurationError(null);

    try {
      const strengthsArr = commentStrengths.split(',').map((s) => s.trim()).filter(Boolean);
      const areasArr = commentAreas.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await aiService.generateReportCardComment({
        studentId: commentStudentId,
        tone: commentTone,
        strengths: strengthsArr,
        areasForImprovement: areasArr,
      });
      setCommentResult(res);
    } catch (err: any) {
      setConfigurationError(err.message || 'Report-card comment generation failed.');
    } finally {
      setCommentLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. Fee-Reminder Generator State
  // --------------------------------------------------------------------------
  const [feeInvoiceId, setFeeInvoiceId] = useState('67b6eb4c0b46eb132a000004');
  const [feeTone, setFeeTone] = useState<'gentle' | 'standard' | 'urgent'>('standard');
  const [feeInstructions, setFeeInstructions] = useState('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeResult, setFeeResult] = useState<FeeReminderResponse | null>(null);
  const [copiedFee, setCopiedFee] = useState(false);

  const handleGenerateFeeReminder = async () => {
    setFeeLoading(true);
    setConfigurationError(null);

    try {
      const res = await aiService.generateFeeReminder({
        invoiceId: feeInvoiceId,
        tone: feeTone,
        additionalInstructions: feeInstructions || undefined,
      });
      setFeeResult(res);
    } catch (err: any) {
      setConfigurationError(err.message || 'Fee reminder generation failed.');
    } finally {
      setFeeLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6. Notice Generator State
  // --------------------------------------------------------------------------
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeEventType, setNoticeEventType] = useState<
    'notice' | 'parent_announcement' | 'event_invitation' | 'event_schedule' | 'holiday_notice' | 'meeting_reminder' | 'academic_plan'
  >('notice');
  const [noticeAudience, setNoticeAudience] = useState<'all' | 'students' | 'teachers' | 'parents'>('all');
  const [noticeDate, setNoticeDate] = useState('');
  const [noticeLocation, setNoticeLocation] = useState('');
  const [noticeDetails, setNoticeDetails] = useState('');
  const [noticeLoading, setNoticeLoading] = useState(false);
  const [noticeResult, setNoticeResult] = useState<NoticeGeneratorResponse | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const handleGenerateNotice = async () => {
    if (!noticeTitle.trim() || noticeLoading) return;
    setNoticeLoading(true);
    setConfigurationError(null);

    try {
      const res = await aiService.generateNotice({
        title: noticeTitle,
        eventType: noticeEventType,
        targetAudience: noticeAudience,
        date: noticeDate || undefined,
        location: noticeLocation || undefined,
        instructions: noticeDetails || undefined,
      });
      setNoticeResult(res);
    } catch (err: any) {
      setConfigurationError(err.message || 'Notice generation failed.');
    } finally {
      setNoticeLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 7. School Insights State
  // --------------------------------------------------------------------------
  const [insightType, setInsightType] = useState<
    'attendance_trends' | 'fee_collection' | 'outstanding_fees' | 'enrollment_counts' | 'academic_performance' | 'homework_completion'
  >('attendance_trends');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsResult, setInsightsResult] = useState<SchoolInsightsResponse | null>(null);

  const handleFetchInsights = async () => {
    setInsightsLoading(true);
    setConfigurationError(null);

    try {
      const res = await aiService.getSchoolInsights({
        insightType,
      });
      setInsightsResult(res);
    } catch (err: any) {
      setConfigurationError(err.message || 'Failed to fetch insights.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // Suggested Prompts by Role
  const getSuggestedPrompts = () => {
    switch (activeRole) {
      case 'admin':
        return [
          'What are our current attendance trends across classes?',
          'Draft notice for the upcoming parent-teacher conference',
          'How many students and faculty members are actively registered?',
          'Summary of operational guidelines for school events',
        ];
      case 'teacher':
        return [
          'Help me structure a 45-minute lesson plan on Photosynthesis',
          'Suggest 3 engaging formative assessment questions for Algebra',
          'What are effective ways to support struggling readers in Grade 8?',
          'Generate practice vocabulary exercises for Grade 10 English',
        ];
      case 'student':
        return [
          'Explain Newton’s Third Law of Motion with everyday examples',
          'How do I balance chemical redox equations step by step?',
          'Give me 2 practice problems on quadratic equations',
          'Explain the key differences between mitosis and meiosis',
        ];
      case 'parent':
        return [
          'How can I help my child build a consistent homework schedule?',
          'What key math skills are expected in high school curriculum?',
          'Explain the school policies regarding excused medical absences',
          'Tips for encouraging independent reading at home',
        ];
      default:
        return [
          'What services does the institutional copilot provide?',
          'How does role-based access protect student data privacy?',
        ];
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant & Institutional Co-Pilot"
        description="Role-aware artificial intelligence with strict tenant data isolation and pedagogical guardrails"
        badge={<Badge variant="default">Phase 14 Active</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Role: {activeRole.toUpperCase()}
            </Badge>
          </div>
        }
      />

      {/* Configuration Error Banner */}
      {configurationError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-amber-900">AI Provider Notice</h4>
            <p className="text-xs text-amber-800 leading-relaxed">{configurationError}</p>
            <p className="text-xs text-amber-700">
              Configure <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">AI_API_KEY</code> and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">AI_PROVIDER</code> in your server environment to enable live external LLM generation.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-2 pb-px text-sm font-medium">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'chat'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="h-4 w-4" />
          Chat Copilot
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'homework'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          Homework Helper
        </button>

        {(activeRole === 'teacher' || activeRole === 'admin' || activeRole === 'super_admin') && (
          <>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Quiz Generator
            </button>

            <button
              onClick={() => setActiveTab('comments')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'comments'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Report Comments
            </button>
          </>
        )}

        {(activeRole === 'admin' || activeRole === 'super_admin') && (
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'fees'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Fee Reminders
          </button>
        )}

        {(activeRole === 'admin' || activeRole === 'super_admin' || activeRole === 'teacher') && (
          <>
            <button
              onClick={() => setActiveTab('notices')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'notices'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell className="h-4 w-4" />
              Notice Drafts
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'insights'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              School Insights
            </button>
          </>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: Chat Copilot */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col h-[600px] rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-4 border-b flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Institutional Co-Pilot</h3>
                  <p className="text-[11px] text-muted-foreground">Server-enforced permissions & tenant isolation active</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Context: {schoolName}
              </Badge>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[85%] ${
                    m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      m.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground border'
                    }`}
                  >
                    {m.sender === 'user' ? 'U' : <Bot className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        m.sender === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                          : 'bg-muted/60 text-foreground rounded-tl-none border'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground block px-1">
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3 max-w-[80%] items-center text-muted-foreground text-xs py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Generating contextual institutional response...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t bg-muted/20 flex gap-2">
              <Input
                placeholder={`Ask ${schoolName} AI copilot...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                disabled={chatLoading}
                className="bg-background text-sm"
              />
              <Button onClick={() => handleSendChat()} disabled={chatLoading || !inputMessage.trim()}>
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Role-Specific Suggested Prompts */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Suggested Inquiries
                </CardTitle>
                <CardDescription className="text-xs">
                  Role-tailored prompts for {activeRole.toUpperCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {getSuggestedPrompts().map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(p)}
                    className="w-full text-left text-xs p-2.5 rounded-lg border bg-card hover:bg-muted/50 transition text-muted-foreground hover:text-foreground flex items-center justify-between group"
                  >
                    <span className="line-clamp-2">{p}</span>
                    <Sparkles className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <Sparkles className="h-4 w-4" />
                  Academic Privacy Standard
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                <p>• Data queries derive identity strictly from authenticated JWT tokens.</p>
                <p>• Student records, marks, and billing are isolated to authorized tenants.</p>
                <p>• Prompts avoid sending unnecessary PII to external language providers.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: Homework Helper */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'homework' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Student Homework Guide
              </CardTitle>
              <CardDescription className="text-xs">
                Receive age-appropriate explanations, concept breakdowns, and practice hints.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Homework Prompt / Concept Question</label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. How does photosynthesis convert sunlight into chemical energy, and what are the light-dependent reactions?"
                  value={homeworkQuestion}
                  onChange={(e) => setHomeworkQuestion(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Topic or Subject Area (Optional)</label>
                <Input
                  placeholder="e.g. Cellular Biology, AP Chemistry, Algebra II"
                  value={homeworkTopic}
                  onChange={(e) => setHomeworkTopic(e.target.value)}
                />
              </div>

              <Button
                onClick={handleHomeworkHelp}
                disabled={homeworkLoading || !homeworkQuestion.trim()}
                className="w-full gap-2"
              >
                {homeworkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Guided Steps & Hints
              </Button>
            </CardContent>
          </Card>

          {/* Homework Help Output */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Guided Pedagogical Solution</CardTitle>
                {homeworkResult && (
                  <Badge variant="secondary" className="text-xs">
                    Target: {homeworkResult.gradeLevel || 'Standard Grade'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Encourages learning without dumping unearned final answers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {!homeworkResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs text-center border border-dashed rounded-lg p-6">
                  <HelpCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Enter your question on the left to receive concept explanations and practice hints.
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-muted/40 rounded-lg border">
                    <h4 className="font-semibold text-xs text-primary mb-1">Concept Explanation</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {homeworkResult.explanation}
                    </p>
                  </div>

                  {homeworkResult.hints && homeworkResult.hints.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs text-foreground">Step-by-Step Thinking Hints:</h4>
                      <ul className="space-y-1.5">
                        {homeworkResult.hints.map((h, idx) => (
                          <li key={idx} className="text-xs bg-amber-50/80 text-amber-900 border border-amber-200 p-2 rounded flex items-start gap-2">
                            <span className="font-bold text-amber-700 shrink-0">#{idx + 1}</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {homeworkResult.practiceQuestions && homeworkResult.practiceQuestions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs text-foreground">Check Your Understanding:</h4>
                      <ul className="space-y-1.5">
                        {homeworkResult.practiceQuestions.map((q, idx) => (
                          <li key={idx} className="text-xs bg-muted/60 border p-2 rounded">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: AI Quiz Generator */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Draft Quiz Parameters
              </CardTitle>
              <CardDescription className="text-xs">
                Creates draft questions matching syllabus assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Quiz Topic / Curriculum Unit</label>
                <Input
                  placeholder="e.g. Newton's Laws of Motion"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Question Type</label>
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                    value={quizQuestionType}
                    onChange={(e: any) => setQuizQuestionType(e.target.value)}
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Difficulty</label>
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                    value={quizDifficulty}
                    onChange={(e: any) => setQuizDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Number of Questions (1 - 20)</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={quizCount}
                  onChange={(e) => setQuizCount(parseInt(e.target.value, 10) || 5)}
                />
              </div>

              <Button
                onClick={handleGenerateQuiz}
                disabled={quizLoading || !quizTopic.trim()}
                className="w-full gap-2 mt-2"
              >
                {quizLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Draft Assessment
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">
                  {quizResult ? quizResult.title : 'Generated Questions Preview'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {quizResult ? `Total Marks: ${quizResult.totalMarks} • Status: Draft (Not published)` : 'Configured questions appear here for review and editing.'}
                </CardDescription>
              </div>
              {quizResult && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(quizResult, null, 2));
                    setCopiedQuiz(true);
                    setTimeout(() => setCopiedQuiz(false), 2000);
                  }}
                >
                  {copiedQuiz ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedQuiz ? 'Copied' : 'Copy JSON'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-4 overflow-y-auto max-h-[500px]">
              {!quizResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs text-center border border-dashed rounded-lg p-6">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Define your topic and click generate to review structured questions.
                </div>
              ) : (
                <div className="space-y-4">
                  {quizResult.questions.map((q, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border bg-muted/20 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          Question {idx + 1}. {q.question}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {q.marks || 1} mk
                        </Badge>
                      </div>

                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-2 rounded border text-xs flex items-center justify-between ${
                                opt === q.correctAnswer
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                  : 'bg-background'
                              }`}
                            >
                              <span>{opt}</span>
                              {opt === q.correctAnswer && (
                                <Badge variant="secondary" className="text-[9px] bg-emerald-100 text-emerald-800">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.suggestedAnswer && (
                        <div className="p-2 bg-muted/60 rounded border text-muted-foreground">
                          <strong className="text-foreground">Suggested Answer: </strong>
                          {q.suggestedAnswer}
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] text-muted-foreground italic">
                          Rationale: {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 4: Report-Card Comments */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'comments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Factual Comment Parameters
              </CardTitle>
              <CardDescription className="text-xs">
                Generates draft comments grounded strictly on verified marks and attendance records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Student ID / Profile Reference</label>
                <Input
                  value={commentStudentId}
                  onChange={(e) => setCommentStudentId(e.target.value)}
                  placeholder="e.g. 67b6eb4c0b46eb132a000003"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Preferred Tone</label>
                <select
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                  value={commentTone}
                  onChange={(e: any) => setCommentTone(e.target.value)}
                >
                  <option value="encouraging">Encouraging & Constructive</option>
                  <option value="formal">Formal Academic Assessment</option>
                  <option value="constructive">Action-Oriented Improvement</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Observed Strengths</label>
                <Input
                  value={commentStrengths}
                  onChange={(e) => setCommentStrengths(e.target.value)}
                  placeholder="e.g. High analytical skills, consistent attendance"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Areas for Improvement</label>
                <Input
                  value={commentAreas}
                  onChange={(e) => setCommentAreas(e.target.value)}
                  placeholder="e.g. Revise algebra fundamentals, timely homework submission"
                />
              </div>

              <Button
                onClick={handleGenerateComment}
                disabled={commentLoading}
                className="w-full gap-2 mt-2"
              >
                {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Draft Report-Card Comment
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Draft Report Comment</CardTitle>
                <CardDescription className="text-xs">
                  {commentResult ? `Student: ${commentResult.studentName} • Status: Draft (Review required)` : 'Factual summary & comment draft appear here.'}
                </CardDescription>
              </div>
              {commentResult && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(commentResult.comment);
                    setCopiedComment(true);
                    setTimeout(() => setCopiedComment(false), 2000);
                  }}
                >
                  {copiedComment ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedComment ? 'Copied' : 'Copy Text'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {!commentResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs text-center border border-dashed rounded-lg p-6">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Select student parameters to calculate attendance, marks, and draft review comment.
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Factual Summary Badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-lg border">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Verified Attendance</span>
                      <span className="text-sm font-bold text-foreground">
                        {commentResult.attendanceSummary.hasRecords
                          ? `${commentResult.attendanceSummary.attendanceRate}% (${commentResult.attendanceSummary.present}/${commentResult.attendanceSummary.totalDays} Days)`
                          : 'No Records Recorded'}
                      </span>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Verified Academic Score</span>
                      <span className="text-sm font-bold text-foreground">
                        {commentResult.academicSummary.hasRecords
                          ? `${commentResult.academicSummary.averageScore}% Avg`
                          : 'No Marks Recorded'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Editable Comment Body</label>
                    <textarea
                      className="w-full min-h-[140px] rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                      value={commentResult.comment}
                      onChange={(e) =>
                        setCommentResult({
                          ...commentResult,
                          comment: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-[11px]">
                    <strong>Note:</strong> Report-card comments are generated as drafts and require teacher review and confirmation prior to publication on official scorecards.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 5: Fee-Reminder Generator */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'fees' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Verified Fee Reminder Drafting
              </CardTitle>
              <CardDescription className="text-xs">
                Drafts reminders using actual outstanding invoice amounts and due dates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Target Invoice ID</label>
                <Input
                  value={feeInvoiceId}
                  onChange={(e) => setFeeInvoiceId(e.target.value)}
                  placeholder="e.g. 67b6eb4c0b46eb132a000004"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Reminder Tone</label>
                <select
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                  value={feeTone}
                  onChange={(e: any) => setFeeTone(e.target.value)}
                >
                  <option value="gentle">Gentle / Friendly Courtesy</option>
                  <option value="standard">Standard Administrative Notice</option>
                  <option value="urgent">Urgent / Final Notice</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Additional School Instructions (Optional)</label>
                <Input
                  value={feeInstructions}
                  onChange={(e) => setFeeInstructions(e.target.value)}
                  placeholder="e.g. Online portal payment methods, bursar office hours"
                />
              </div>

              <Button
                onClick={handleGenerateFeeReminder}
                disabled={feeLoading}
                className="w-full gap-2 mt-2"
              >
                {feeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Verified Draft Reminder
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Draft Communication</CardTitle>
                <CardDescription className="text-xs">
                  {feeResult ? `Invoice: ${feeResult.invoiceNumber} • Recipient: ${feeResult.recipientName}` : 'Preview verified reminder before dispatching.'}
                </CardDescription>
              </div>
              {feeResult && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${feeResult.subject}\n\n${feeResult.draftMessage}`);
                    setCopiedFee(true);
                    setTimeout(() => setCopiedFee(false), 2000);
                  }}
                >
                  {copiedFee ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedFee ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {!feeResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs text-center border border-dashed rounded-lg p-6">
                  <Receipt className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Enter invoice reference to verify balance and draft respectful fee notification.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded border">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Verified Outstanding Balance</span>
                      <span className="font-bold text-sm text-amber-700">${feeResult.balanceAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Due Date</span>
                      <span className="font-semibold text-sm">{feeResult.dueDate}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Email / Message Subject</label>
                    <Input
                      value={feeResult.subject}
                      onChange={(e) => setFeeResult({ ...feeResult, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Draft Message Body</label>
                    <textarea
                      className="w-full min-h-[140px] rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                      value={feeResult.draftMessage}
                      onChange={(e) => setFeeResult({ ...feeResult, draftMessage: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 6: Notice Drafts */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                School Notice & Event Planning
              </CardTitle>
              <CardDescription className="text-xs">
                Draft official announcements, event invitations, and holiday notices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Notice Heading / Event Title</label>
                <Input
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Annual Inter-School Science Fair 2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Event Type</label>
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                    value={noticeEventType}
                    onChange={(e: any) => setNoticeEventType(e.target.value)}
                  >
                    <option value="notice">General Notice</option>
                    <option value="parent_announcement">Parent Announcement</option>
                    <option value="event_invitation">Event Invitation</option>
                    <option value="holiday_notice">Holiday Notice</option>
                    <option value="meeting_reminder">Meeting Reminder</option>
                    <option value="academic_plan">Academic Activity Plan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Target Audience</label>
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
                    value={noticeAudience}
                    onChange={(e: any) => setNoticeAudience(e.target.value)}
                  >
                    <option value="all">Entire School Community</option>
                    <option value="parents">Parents & Guardians</option>
                    <option value="students">Enrolled Students</option>
                    <option value="teachers">Faculty Members</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Date & Time</label>
                  <Input
                    placeholder="e.g. November 15, 2026 at 10:00 AM"
                    value={noticeDate}
                    onChange={(e) => setNoticeDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Location / Venue</label>
                  <Input
                    placeholder="e.g. School Auditorium"
                    value={noticeLocation}
                    onChange={(e) => setNoticeLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Special Instructions or Agenda</label>
                <textarea
                  className="w-full min-h-[70px] rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Students must wear standard laboratory attire. Registration deadline is Friday."
                  value={noticeDetails}
                  onChange={(e) => setNoticeDetails(e.target.value)}
                />
              </div>

              <Button
                onClick={handleGenerateNotice}
                disabled={noticeLoading || !noticeTitle.trim()}
                className="w-full gap-2 mt-2"
              >
                {noticeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Draft Official Announcement
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Draft Notice Preview</CardTitle>
                <CardDescription className="text-xs">
                  {noticeResult ? `Audience: ${noticeResult.targetAudience.toUpperCase()} • Status: Draft` : 'Formatted draft notice appears here for editing.'}
                </CardDescription>
              </div>
              {noticeResult && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(noticeResult.draftNotice);
                    setCopiedNotice(true);
                    setTimeout(() => setCopiedNotice(false), 2000);
                  }}
                >
                  {copiedNotice ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedNotice ? 'Copied' : 'Copy Text'}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {!noticeResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs text-center border border-dashed rounded-lg p-6">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Specify event details on the left to produce a publication-ready draft announcement.
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Draft Announcement Content</label>
                    <textarea
                      className="w-full min-h-[220px] rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary whitespace-pre-wrap font-sans"
                      value={noticeResult.draftNotice}
                      onChange={(e) => setNoticeResult({ ...noticeResult, draftNotice: e.target.value })}
                    />
                  </div>

                  <div className="p-2.5 bg-muted/40 rounded border text-muted-foreground text-[11px]">
                    Draft notices can be copied or saved into official Announcements upon administrative confirmation.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 7: School Insights */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Deterministic Operational Analytics
                </CardTitle>
                <CardDescription className="text-xs">
                  Calculates real metrics server-side in MongoDB before generating executive summaries.
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <select
                  className="text-xs h-9 rounded-md border border-input bg-background px-3"
                  value={insightType}
                  onChange={(e: any) => setInsightType(e.target.value)}
                >
                  <option value="attendance_trends">Attendance Trends (Last 30 Days)</option>
                  <option value="enrollment_counts">Enrollment & Student Cohorts</option>
                  <option value="academic_performance">Academic Performance & Grades</option>
                  <option value="homework_completion">Homework Completion Trends</option>
                  {activeRole === 'admin' && (
                    <>
                      <option value="fee_collection">Fee Collections & Receipts</option>
                      <option value="outstanding_fees">Outstanding Dues & Overdue Balances</option>
                    </>
                  )}
                </select>

                <Button onClick={handleFetchInsights} disabled={insightsLoading} size="sm" className="gap-1.5 text-xs">
                  {insightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Compute Analytics
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {!insightsResult ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-xs text-center border border-dashed rounded-lg p-6">
                  <BarChart2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  Select an analytics metric above and click "Compute Analytics" to generate real-time institutional statistics.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Real Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(insightsResult.statistics).map(([key, val]) => (
                      <div key={key} className="p-4 bg-muted/40 rounded-xl border">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-2xl font-bold text-foreground mt-1 block">
                          {typeof val === 'number'
                            ? key.toLowerCase().includes('balance') || key.toLowerCase().includes('invoiced') || key.toLowerCase().includes('collected')
                              ? `$${val.toLocaleString()}`
                              : val.toLocaleString()
                            : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* AI Summary Banner */}
                  <div className="p-4 rounded-xl border bg-primary/5 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                      <Sparkles className="h-4 w-4" />
                      Executive Analytics Summary ({insightsResult.reportingPeriod})
                    </div>
                    <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                      {insightsResult.summary}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
