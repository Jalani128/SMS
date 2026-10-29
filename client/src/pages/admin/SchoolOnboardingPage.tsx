import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  onboardingService,
  OnboardingStatusResponse,
} from '../../services/onboarding.service';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  School,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  UploadCloud,
  Sparkles,
  Check,
} from 'lucide-react';

export const SchoolOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [statusData, setStatusData] = useState<OnboardingStatusResponse | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states per step
  const [step1Data, setStep1Data] = useState({
    schoolName: '',
    phone: '',
    address: '',
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
  });

  const [step2Data, setStep2Data] = useState({
    sessionName: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-06-30',
    termsCount: 3,
  });

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await onboardingService.getStatus();
      setStatusData(data);
      if (data.onboarding?.currentStep) {
        setActiveStep(data.onboarding.currentStep);
      }
      if (data.onboarding?.stepsData?.profile) {
        setStep1Data((prev) => ({ ...prev, ...data.onboarding.stepsData.profile }));
      } else if (data.school) {
        setStep1Data((prev) => ({
          ...prev,
          schoolName: data.school.name || '',
          phone: data.school.phone || '',
        }));
      }
      if (data.onboarding?.stepsData?.academic) {
        setStep2Data((prev) => ({ ...prev, ...data.onboarding.stepsData.academic }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load onboarding status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveStep = async (step: number, data: any, advance = true) => {
    try {
      setSaving(true);
      setErrorMessage(null);
      await onboardingService.saveStep(step, data);
      setSuccessMessage(`Step ${step} progress saved successfully.`);
      if (advance && step < 6) {
        setActiveStep(step + 1);
      }
      await loadStatus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save step progress.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      setCompleting(true);
      setErrorMessage(null);
      await onboardingService.completeOnboarding();
      setSuccessMessage('School onboarding completed successfully! Your school is now active.');
      await loadStatus();
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to finalize onboarding. Please verify mandatory requirements.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-muted rounded mb-6"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  const counts = statusData?.counts || {
    sessionsCount: 0,
    classesCount: 0,
    sectionsCount: 0,
    subjectsCount: 0,
    teachersCount: 0,
    studentsCount: 0,
    parentsCount: 0,
    enrollmentsCount: 0,
  };

  const checklist = statusData?.checklist || {
    profile: false,
    academicSession: false,
    academicStructure: false,
    staffSetup: false,
    studentSetup: false,
    enrollmentSetup: false,
  };

  const isCompleted = statusData?.onboarding?.status === 'completed';

  const steps = [
    { num: 1, title: 'School Profile', desc: 'Contact & Localization', icon: School, done: checklist.profile },
    { num: 2, title: 'Academic Session', desc: 'Session & Calendar', icon: Calendar, done: checklist.academicSession },
    { num: 3, title: 'Structure', desc: 'Classes, Sections, Subjects', icon: Layers, done: checklist.academicStructure },
    { num: 4, title: 'Staff Setup', desc: 'Teachers & Roles', icon: Users, done: checklist.staffSetup },
    { num: 5, title: 'Students & Parents', desc: 'Admissions & Enrollments', icon: GraduationCap, done: checklist.studentSetup },
    { num: 6, title: 'Review & Launch', desc: 'Readiness & Finalize', icon: Sparkles, done: isCompleted },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="School Onboarding & Setup Wizard"
        description="Configure institutional fundamentals, import initial cohorts, and activate your school partition."
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Setup Validation Notice</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="bg-card border border-border/80 rounded-xl p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[640px] gap-2">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = activeStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => setActiveStep(s.num)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/40'
                      : s.done
                      ? 'text-emerald-600 dark:text-emerald-400 hover:bg-muted/50'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : s.done
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.done ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs leading-none font-medium">{s.title}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{s.desc}</p>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 min-w-[20px] ${s.done ? 'bg-emerald-500' : 'bg-muted'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Wizard Content Cards */}
      <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm">
        {/* STEP 1: PROFILE */}
        {activeStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 1: School Profile & Localization</h2>
              <p className="text-xs text-muted-foreground">
                Set institutional contact numbers, address, official timezone, and currency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  value={step1Data.schoolName}
                  onChange={(e) => setStep1Data({ ...step1Data, schoolName: e.target.value })}
                  placeholder="Greenwood International Academy"
                />
              </div>

              <div>
                <Label htmlFor="phone">Contact Phone *</Label>
                <Input
                  id="phone"
                  value={step1Data.phone}
                  onChange={(e) => setStep1Data({ ...step1Data, phone: e.target.value })}
                  placeholder="+1-555-0100"
                />
              </div>

              <div>
                <Label htmlFor="address">Official Address</Label>
                <Input
                  id="address"
                  value={step1Data.address}
                  onChange={(e) => setStep1Data({ ...step1Data, address: e.target.value })}
                  placeholder="100 Academic Way, Metro City"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone *</Label>
                <select
                  id="timezone"
                  className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  value={step1Data.timezone}
                  onChange={(e) => setStep1Data({ ...step1Data, timezone: e.target.value })}
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New York (EST/EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="currency">Operational Currency *</Label>
                <Input
                  id="currency"
                  value={step1Data.currency}
                  onChange={(e) => setStep1Data({ ...step1Data, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                  placeholder="USD, EUR, GBP, PKR"
                />
              </div>

              <div>
                <Label htmlFor="dateFormat">Date Display Format</Label>
                <select
                  id="dateFormat"
                  className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  value={step1Data.dateFormat}
                  onChange={(e) => setStep1Data({ ...step1Data, dateFormat: e.target.value })}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (UK / Commonwealth)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveStep(1, step1Data, false)}
                disabled={saving}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Progress
              </Button>
              <Button size="sm" onClick={() => handleSaveStep(1, step1Data, true)} disabled={saving}>
                Next: Academic Session
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: ACADEMIC CONFIGURATION */}
        {activeStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 2: Academic Configuration</h2>
              <p className="text-xs text-muted-foreground">
                Set up your school's initial academic year and operational term cadence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionName">Academic Session Name *</Label>
                <Input
                  id="sessionName"
                  value={step2Data.sessionName}
                  onChange={(e) => setStep2Data({ ...step2Data, sessionName: e.target.value })}
                  placeholder="2026-2027"
                />
              </div>

              <div>
                <Label htmlFor="termsCount">Terms / Semesters Count</Label>
                <Input
                  id="termsCount"
                  type="number"
                  min={1}
                  max={4}
                  value={step2Data.termsCount}
                  onChange={(e) => setStep2Data({ ...step2Data, termsCount: parseInt(e.target.value, 10) || 2 })}
                />
              </div>

              <div>
                <Label htmlFor="startDate">Session Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={step2Data.startDate}
                  onChange={(e) => setStep2Data({ ...step2Data, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="endDate">Session End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={step2Data.endDate}
                  onChange={(e) => setStep2Data({ ...step2Data, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Active Persisted Sessions: <strong>{counts.sessionsCount}</strong>
              </span>
              <Link to="/admin/academic-sessions" className="text-primary hover:underline font-medium">
                Manage Academic Sessions →
              </Link>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setActiveStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleSaveStep(2, step2Data, false)} disabled={saving}>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                </Button>
                <Button size="sm" onClick={() => handleSaveStep(2, step2Data, true)} disabled={saving}>
                  Next: Structure <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ACADEMIC STRUCTURE */}
        {activeStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 3: Classes, Sections & Subjects</h2>
              <p className="text-xs text-muted-foreground">
                Configure your grade levels, classroom sections, and course curriculum.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground font-medium">Classes Configured</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.classesCount}</p>
                <Link to="/admin/classes" className="text-xs text-primary hover:underline mt-2 inline-block">
                  Add / Edit Classes →
                </Link>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground font-medium">Sections Configured</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.sectionsCount}</p>
                <Link to="/admin/sections" className="text-xs text-primary hover:underline mt-2 inline-block">
                  Add / Edit Sections →
                </Link>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground font-medium">Subjects Configured</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.subjectsCount}</p>
                <Link to="/admin/subjects" className="text-xs text-primary hover:underline mt-2 inline-block">
                  Add / Edit Subjects →
                </Link>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground">
              Requirement: Your school must have at least <strong>1 Class</strong>, <strong>1 Section</strong>, and <strong>1 Subject</strong> to finish onboarding.
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setActiveStep(2)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
              <Button size="sm" onClick={() => handleSaveStep(3, counts, true)} disabled={saving}>
                Next: Staff Setup <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: STAFF SETUP */}
        {activeStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 4: Staff & Teacher Onboarding</h2>
              <p className="text-xs text-muted-foreground">
                Register teachers, assign employee identifiers, and issue secure activation invitations.
              </p>
            </div>

            <div className="p-5 rounded-xl border bg-muted/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Current Active Teachers: {counts.teachersCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Import entire faculty cohorts from CSV or register individual instructors.
                </p>
              </div>

              <div className="flex gap-2">
                <Link to="/admin/teachers">
                  <Button variant="outline" size="sm" className="text-xs">
                    Manual Registration
                  </Button>
                </Link>
                <Link to="/admin/data-import">
                  <Button size="sm" className="gap-1.5 text-xs">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Bulk Import Teachers
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground">
              Security note: Uploaded teachers receive a single-use secure activation token. Passwords are never stored in plaintext.
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setActiveStep(3)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
              <Button size="sm" onClick={() => handleSaveStep(4, counts, true)} disabled={saving}>
                Next: Students & Parents <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: STUDENTS & PARENTS */}
        {activeStep === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 5: Student Admissions & Parent Linking</h2>
              <p className="text-xs text-muted-foreground">
                Admit student cohorts, assign admission numbers, and link parents to their student wards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground font-medium">Students Enrolled</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.studentsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Enrollments: {counts.enrollmentsCount}</p>
              </div>

              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-xs text-muted-foreground font-medium">Parents Registered</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.parentsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Wards Linked</p>
              </div>

              <div className="p-4 rounded-xl border bg-primary/10 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">Bulk Onboarding</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your student roster with automated section enrollments.
                  </p>
                </div>
                <Link to="/admin/data-import" className="mt-3">
                  <Button size="sm" className="w-full text-xs gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Open Bulk Importer
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setActiveStep(4)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
              <Button size="sm" onClick={() => handleSaveStep(5, counts, true)} disabled={saving}>
                Next: Review & Launch <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & COMPLETION */}
        {activeStep === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Step 6: Review & Readiness Verification</h2>
              <p className="text-xs text-muted-foreground">
                Review your school's live configuration before finalizing institutional onboarding.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Mandatory Verification Checklist</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {checklist.profile ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>School Profile & Contact Phone</span>
                </div>

                <div className="flex items-center gap-2">
                  {checklist.academicSession ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Academic Session ({counts.sessionsCount} session)</span>
                </div>

                <div className="flex items-center gap-2">
                  {counts.classesCount > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Grade Classes ({counts.classesCount} classes)</span>
                </div>

                <div className="flex items-center gap-2">
                  {counts.sectionsCount > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Classroom Sections ({counts.sectionsCount} sections)</span>
                </div>

                <div className="flex items-center gap-2">
                  {counts.subjectsCount > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Subjects Curriculum ({counts.subjectsCount} subjects)</span>
                </div>

                <div className="flex items-center gap-2">
                  {checklist.staffSetup ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Teaching Faculty ({counts.teachersCount} teachers)</span>
                </div>

                <div className="flex items-center gap-2">
                  {checklist.studentSetup ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Enrolled Students ({counts.studentsCount} students)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setActiveStep(5)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleCompleteOnboarding}
                disabled={completing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {completing ? 'Verifying & Completing...' : 'Complete & Activate School'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
