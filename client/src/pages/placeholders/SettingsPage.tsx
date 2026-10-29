import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import {
  Building2,
  Palette,
  Globe,
  Calendar,
  Award,
  UserCheck,
  DollarSign,
  Bell,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { settingsService } from '../../services/settings.service';
import {
  SchoolSettingsData,
  GradingScaleData,
  GradeBand,
  AcademicHoliday,
} from '../../types/settings';
import { useAuth } from '../../hooks/useAuth';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [settings, setSettings] = useState<SchoolSettingsData | null>(null);
  const [gradingScale, setGradingScale] = useState<GradingScaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New holiday form state
  const [newHoliday, setNewHoliday] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    type: 'public_holiday' | 'vacation' | 'exam_break' | 'teacher_training' | 'other';
    description: string;
  }>({
    name: '',
    startDate: '',
    endDate: '',
    type: 'public_holiday',
    description: '',
  });

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const [settingsData, gradingData] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getGradingPolicy(),
      ]);
      setSettings(settingsData);
      setGradingScale(gradingData);
    } catch (err: any) {
      console.warn('Failed to load settings:', err);
      setErrorMessage('Could not load settings from server. Check connectivity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const showSuccessFeedback = (tab: string) => {
    setSaveSuccess(tab);
    setErrorMessage(null);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // 1. Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSavingTab('profile');
      const updated = await settingsService.updateProfile(settings.profile);
      setSettings(updated);
      showSuccessFeedback('profile');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save profile');
    } finally {
      setSavingTab(null);
    }
  };

  // 2. Branding Save
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSavingTab('branding');
      const updated = await settingsService.updateBranding(settings.branding);
      setSettings(updated);
      showSuccessFeedback('branding');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save branding');
    } finally {
      setSavingTab(null);
    }
  };

  // 3. Regional Save
  const handleSaveRegional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSavingTab('regional');
      const updated = await settingsService.updateRegional(settings.regional);
      setSettings(updated);
      showSuccessFeedback('regional');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save regional settings');
    } finally {
      setSavingTab(null);
    }
  };

  // 4. Academic Working Days Save
  const handleSaveAcademic = async () => {
    if (!settings) return;
    try {
      setSavingTab('academic');
      const updated = await settingsService.updateAcademic({
        workingDays: settings.academic.workingDays,
        termsCount: settings.academic.termsCount,
      });
      setSettings(updated);
      showSuccessFeedback('academic');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save academic settings');
    } finally {
      setSavingTab(null);
    }
  };

  // 4b. Add Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.startDate || !newHoliday.endDate) return;
    try {
      setSavingTab('holiday');
      const updated = await settingsService.addHoliday(newHoliday);
      setSettings(updated);
      setNewHoliday({
        name: '',
        startDate: '',
        endDate: '',
        type: 'public_holiday',
        description: '',
      });
      showSuccessFeedback('holiday');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to add holiday');
    } finally {
      setSavingTab(null);
    }
  };

  // 4c. Delete Holiday
  const handleDeleteHoliday = async (id?: string) => {
    if (!id) return;
    try {
      const updated = await settingsService.deleteHoliday(id);
      setSettings(updated);
      showSuccessFeedback('holiday_del');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to delete holiday');
    }
  };

  // 5. Grading Policy Save
  const handleSaveGrading = async () => {
    if (!gradingScale) return;
    try {
      setSavingTab('grading');
      const updated = await settingsService.updateGradingPolicy({
        name: gradingScale.name,
        description: gradingScale.description,
        bands: gradingScale.bands,
      });
      setGradingScale(updated);
      showSuccessFeedback('grading');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save grading policy');
    } finally {
      setSavingTab(null);
    }
  };

  const handleBandChange = (index: number, field: keyof GradeBand, value: any) => {
    if (!gradingScale) return;
    const newBands = [...gradingScale.bands];
    newBands[index] = { ...newBands[index], [field]: value };
    setGradingScale({ ...gradingScale, bands: newBands });
  };

  const handleAddGradeBand = () => {
    if (!gradingScale) return;
    const newBand: GradeBand = {
      grade: 'NEW',
      minPercentage: 0,
      maxPercentage: 40,
      gradePoint: 0.0,
      isPassing: false,
      description: 'New Band',
    };
    setGradingScale({ ...gradingScale, bands: [...gradingScale.bands, newBand] });
  };

  const handleDeleteGradeBand = (index: number) => {
    if (!gradingScale || gradingScale.bands.length <= 1) return;
    const newBands = gradingScale.bands.filter((_, i) => i !== index);
    setGradingScale({ ...gradingScale, bands: newBands });
  };

  // 6. Attendance Save
  const handleSaveAttendance = async () => {
    if (!settings) return;
    try {
      setSavingTab('attendance');
      const updated = await settingsService.updateAttendancePolicy(settings.attendance);
      setSettings(updated);
      showSuccessFeedback('attendance');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save attendance policy');
    } finally {
      setSavingTab(null);
    }
  };

  // 7. Fee Save
  const handleSaveFees = async () => {
    if (!settings) return;
    try {
      setSavingTab('fees');
      const updated = await settingsService.updateFeePolicy(settings.fees);
      setSettings(updated);
      showSuccessFeedback('fees');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save fee policy');
    } finally {
      setSavingTab(null);
    }
  };

  // 8. Notification Defaults Save
  const handleSaveNotifications = async () => {
    if (!settings) return;
    try {
      setSavingTab('notifications');
      const updated = await settingsService.updateNotificationSettings(settings.notifications);
      setSettings(updated);
      showSuccessFeedback('notifications');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to save notification settings');
    } finally {
      setSavingTab(null);
    }
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const toggleWorkingDay = (day: string) => {
    if (!settings) return;
    const current = settings.academic.workingDays;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    if (next.length === 0) return; // Must have at least 1
    setSettings({
      ...settings,
      academic: { ...settings.academic, workingDays: next },
    });
  };

  if (loading || !settings) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
        <p className="text-sm font-medium text-foreground">Loading Centralized School Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Settings & Policies"
        description="Centralized governance for school branding, localization, academic calendar, grading bands, and operational policies"
        badge={
          <Badge variant="outline" className="font-mono text-xs">
            {settings.profile.code || 'CAMPUS-01'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllSettings}
              disabled={loading}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-xs">
          <strong>Configuration Error:</strong> {errorMessage}
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="mb-4 flex flex-wrap gap-1">
          <TabsTrigger value="profile" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5 text-xs">
            <Palette className="h-3.5 w-3.5" /> Branding
          </TabsTrigger>
          <TabsTrigger value="regional" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Regional
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Calendar & Holidays
          </TabsTrigger>
          <TabsTrigger value="grading" className="gap-1.5 text-xs">
            <Award className="h-3.5 w-3.5" /> Grading Scale
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 text-xs">
            <UserCheck className="h-3.5 w-3.5" /> Attendance Policies
          </TabsTrigger>
          <TabsTrigger value="fees" className="gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" /> Invoicing & Fees
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs">
            <Bell className="h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* 1. School Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Institutional Profile & Address</CardTitle>
                <CardDescription className="text-xs">
                  Official school identity, accreditation credentials, and registered campus contacts
                </CardDescription>
              </div>
              {saveSuccess === 'profile' && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Profile Saved
                </span>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Official School Name</Label>
                    <Input
                      value={settings.profile.schoolName}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: { ...settings.profile, schoolName: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Short Display Name</Label>
                    <Input
                      value={settings.profile.shortName || ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: { ...settings.profile, shortName: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>School Unique Code</Label>
                    <Input value={settings.profile.code} disabled className="bg-muted font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Official Contact Email</Label>
                    <Input
                      type="email"
                      value={settings.profile.email}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: { ...settings.profile, email: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contact Phone</Label>
                    <Input
                      value={settings.profile.phone || ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: { ...settings.profile, phone: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Official Website</Label>
                    <Input
                      value={settings.profile.website || ''}
                      disabled={!isAdmin}
                      placeholder="https://myschool.edu"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: { ...settings.profile, website: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <Label>Campus Street Address</Label>
                  <Input
                    value={settings.profile.address?.street || ''}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          address: { ...settings.profile.address, street: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input
                      value={settings.profile.address?.city || ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: {
                            ...settings.profile,
                            address: { ...settings.profile.address, city: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>State / Province</Label>
                    <Input
                      value={settings.profile.address?.state || ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: {
                            ...settings.profile,
                            address: { ...settings.profile.address, state: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Postal Code</Label>
                    <Input
                      value={settings.profile.address?.postalCode || ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: {
                            ...settings.profile,
                            address: { ...settings.profile.address, postalCode: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Country</Label>
                    <Input
                      value={settings.profile.address?.country || ''}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          profile: {
                            ...settings.profile,
                            address: { ...settings.profile.address, country: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-3 flex justify-end">
                    <Button type="submit" disabled={savingTab === 'profile'} className="text-xs h-8">
                      {savingTab === 'profile' ? 'Saving...' : 'Save Profile Settings'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Branding, Colors & Letterheads</CardTitle>
                <CardDescription className="text-xs">
                  Visual theme parameters used in transcripts, report cards, portals, and email notifications
                </CardDescription>
              </div>
              {saveSuccess === 'branding' && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Branding Saved
                </span>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBranding} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>School Logo URL (CDN / Cloudinary)</Label>
                    <Input
                      value={settings.branding.logoUrl || ''}
                      disabled={!isAdmin}
                      placeholder="https://cdn.example.com/logo.png"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          branding: { ...settings.branding, logoUrl: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Favicon URL</Label>
                    <Input
                      value={settings.branding.faviconUrl || ''}
                      disabled={!isAdmin}
                      placeholder="https://cdn.example.com/favicon.ico"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          branding: { ...settings.branding, faviconUrl: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Primary Brand Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.branding.primaryColor || '#2563eb'}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, primaryColor: e.target.value },
                          })
                        }
                        className="h-8 w-10 border rounded cursor-pointer p-0.5"
                      />
                      <Input
                        value={settings.branding.primaryColor || '#2563eb'}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, primaryColor: e.target.value },
                          })
                        }
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secondary / Header Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.branding.secondaryColor || '#0f172a'}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, secondaryColor: e.target.value },
                          })
                        }
                        className="h-8 w-10 border rounded cursor-pointer p-0.5"
                      />
                      <Input
                        value={settings.branding.secondaryColor || '#0f172a'}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, secondaryColor: e.target.value },
                          })
                        }
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Report Card Official Header Banner</Label>
                  <Input
                    value={settings.branding.reportCardHeader || ''}
                    disabled={!isAdmin}
                    placeholder="Greenwood Academy - Official Cumulative Transcript"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, reportCardHeader: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email Notification Footer</Label>
                  <Input
                    value={settings.branding.emailFooterText || ''}
                    disabled={!isAdmin}
                    placeholder="Confidential notice issued by Greenwood International."
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, emailFooterText: e.target.value },
                      })
                    }
                  />
                </div>

                {isAdmin && (
                  <div className="pt-3 flex justify-end">
                    <Button type="submit" disabled={savingTab === 'branding'} className="text-xs h-8">
                      {savingTab === 'branding' ? 'Saving...' : 'Save Branding Settings'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Regional Settings Tab */}
        <TabsContent value="regional">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Regional & Localization Preferences</CardTitle>
                <CardDescription className="text-xs">
                  School timezone, calendar formatting, week start, and institutional currency
                </CardDescription>
              </div>
              {saveSuccess === 'regional' && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Regional Settings Saved
                </span>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRegional} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>School Timezone (IANA Identifier)</Label>
                    <Input
                      value={settings.regional.timezone}
                      disabled={!isAdmin}
                      placeholder="e.g. America/New_York, Europe/London, Asia/Kolkata, UTC"
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          regional: { ...settings.regional, timezone: e.target.value },
                        })
                      }
                      className="font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Used for attendance midnight boundaries, scheduled notification dispatches, and deadlines.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Default Date Display Format</Label>
                    <select
                      value={settings.regional.dateFormat}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          regional: { ...settings.regional, dateFormat: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (UK / Commonwealth)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</option>
                      <option value="YYYY/MM/DD">YYYY/MM/DD (East Asian Standard)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Time Display Format</Label>
                    <select
                      value={settings.regional.timeFormat}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          regional: { ...settings.regional, timeFormat: e.target.value as any },
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                    >
                      <option value="12h">12-Hour (09:30 AM)</option>
                      <option value="24h">24-Hour (09:30)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Week Start Day</Label>
                    <select
                      value={settings.regional.weekStartDay}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          regional: { ...settings.regional, weekStartDay: e.target.value as any },
                        })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs capitalize"
                    >
                      <option value="monday">Monday</option>
                      <option value="sunday">Sunday</option>
                      <option value="saturday">Saturday</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Currency Code & Symbol</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={settings.regional.currencyCode}
                        disabled={!isAdmin}
                        maxLength={3}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            regional: { ...settings.regional, currencyCode: e.target.value.toUpperCase() },
                          })
                        }
                        className="font-mono uppercase"
                      />
                      <Input
                        value={settings.regional.currencySymbol}
                        disabled={!isAdmin}
                        maxLength={5}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            regional: { ...settings.regional, currencySymbol: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                  <strong>Historical Safeguard:</strong> Modifying regional date or currency display formatting applies strictly to view renderings and never reinterprets stored ledger amounts or historical attendance records.
                </div>

                {isAdmin && (
                  <div className="pt-3 flex justify-end">
                    <Button type="submit" disabled={savingTab === 'regional'} className="text-xs h-8">
                      {savingTab === 'regional' ? 'Saving...' : 'Save Regional Settings'}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Academic Calendar & Holidays Tab */}
        <TabsContent value="academic">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-base font-semibold">Standard School Working Days</CardTitle>
                  <CardDescription className="text-xs">
                    Define instructional school days for timetable allocations and attendance scheduling
                  </CardDescription>
                </div>
                {saveSuccess === 'academic' && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Working Days Saved
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isWorking = settings.academic.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => toggleWorkingDay(day)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                          isWorking
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {isAdmin && (
                  <div className="pt-2 flex justify-end">
                    <Button onClick={handleSaveAcademic} disabled={savingTab === 'academic'} className="text-xs h-8">
                      {savingTab === 'academic' ? 'Saving...' : 'Save Working Days'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold">Institutional Holidays & Term Vacations</CardTitle>
                  <CardDescription className="text-xs">
                    Scheduled calendar non-instructional days where attendance marking is waived
                  </CardDescription>
                </div>
                {saveSuccess === 'holiday' && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Holiday Added
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Holiday Form */}
                {isAdmin && (
                  <form onSubmit={handleAddHoliday} className="p-3.5 border rounded-lg bg-muted/20 space-y-3 text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5 text-primary" /> Schedule New Holiday
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1 sm:col-span-1">
                        <Label>Holiday Title</Label>
                        <Input
                          placeholder="e.g. Winter Break"
                          value={newHoliday.name}
                          onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newHoliday.startDate}
                          onChange={(e) => setNewHoliday({ ...newHoliday, startDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={newHoliday.endDate}
                          onChange={(e) => setNewHoliday({ ...newHoliday, endDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Type</Label>
                        <select
                          value={newHoliday.type}
                          onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value as any })}
                          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                        >
                          <option value="public_holiday">Public Holiday</option>
                          <option value="vacation">Term Vacation</option>
                          <option value="exam_break">Exam Break</option>
                          <option value="teacher_training">Teacher Training</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button type="submit" disabled={savingTab === 'holiday'} className="text-xs h-7 px-3">
                        {savingTab === 'holiday' ? 'Adding...' : 'Add to Calendar'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Holiday list */}
                <div className="border rounded-lg divide-y text-xs">
                  {settings.academic.holidays.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No holidays scheduled in the calendar yet.
                    </div>
                  ) : (
                    settings.academic.holidays.map((h: AcademicHoliday) => (
                      <div key={h._id} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/30">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{h.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {h.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(h.startDate).toLocaleDateString()} — {new Date(h.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteHoliday(h._id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Grading Policy Tab */}
        <TabsContent value="grading">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Institutional Grading Scale & Thresholds</CardTitle>
                <CardDescription className="text-xs">
                  Percentage boundaries, grade points, and pass/fail thresholds for academic performance
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {saveSuccess === 'grading' && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Grading Scale Saved
                  </span>
                )}
                {isAdmin && (
                  <Button onClick={handleAddGradeBand} variant="outline" size="sm" className="text-xs h-8 gap-1">
                    <Plus className="h-3 w-3" /> Add Band
                  </Button>
                )}
                {isAdmin && (
                  <Button onClick={handleSaveGrading} disabled={savingTab === 'grading'} className="text-xs h-8">
                    {savingTab === 'grading' ? 'Saving...' : 'Save Grading Scale'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">Grade Label</th>
                      <th className="p-3">Min %</th>
                      <th className="p-3">Max %</th>
                      <th className="p-3">Grade Point</th>
                      <th className="p-3">Passing Status</th>
                      <th className="p-3">Remarks / Description</th>
                      {isAdmin && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {gradingScale?.bands.map((band, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2.5 font-bold">
                          <Input
                            value={band.grade}
                            disabled={!isAdmin}
                            onChange={(e) => handleBandChange(idx, 'grade', e.target.value)}
                            className="w-16 h-7 font-bold uppercase"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            value={band.minPercentage}
                            disabled={!isAdmin}
                            onChange={(e) => handleBandChange(idx, 'minPercentage', Number(e.target.value))}
                            className="w-20 h-7"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            value={band.maxPercentage}
                            disabled={!isAdmin}
                            onChange={(e) => handleBandChange(idx, 'maxPercentage', Number(e.target.value))}
                            className="w-20 h-7"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.1"
                            value={band.gradePoint ?? ''}
                            disabled={!isAdmin}
                            onChange={(e) => handleBandChange(idx, 'gradePoint', Number(e.target.value))}
                            className="w-20 h-7"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={band.isPassing ? 'true' : 'false'}
                            disabled={!isAdmin}
                            onChange={(e) => handleBandChange(idx, 'isPassing', e.target.value === 'true')}
                            className="h-7 rounded border border-input bg-background px-2 text-xs"
                          >
                            <option value="true">Passing</option>
                            <option value="false">Failing</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <Input
                            value={band.description || ''}
                            disabled={!isAdmin}
                            onChange={(e) => handleBandChange(idx, 'description', e.target.value)}
                            className="h-7 min-w-[120px]"
                          />
                        </td>
                        {isAdmin && (
                          <td className="p-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGradeBand(idx)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Prospective Grading Policy Rule:</strong> Changes made to grading scale bands apply only to newly recorded examination results. Officially published report cards retain their original immutable grade snapshot.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. Attendance Policies Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Attendance Rules & Threshold Alerts</CardTitle>
                <CardDescription className="text-xs">
                  Late grace periods, minimum attendance compliance, and automated notification rules
                </CardDescription>
              </div>
              {saveSuccess === 'attendance' && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Attendance Policy Saved
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Late-Arrival Grace Period (Minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={settings.attendance.lateArrivalThresholdMinutes}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendance: {
                          ...settings.attendance,
                          lateArrivalThresholdMinutes: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Students arriving after this threshold are marked "late" rather than "present".
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Minimum Attendance Requirement (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.attendance.minimumAttendancePercentage}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendance: {
                          ...settings.attendance,
                          minimumAttendancePercentage: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Institutional threshold for term exam eligibility and warning flags.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label>Consecutive Absence Alert Threshold (Days)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.attendance.absenceThresholdForAlert}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        attendance: {
                          ...settings.attendance,
                          absenceThresholdForAlert: Number(e.target.value),
                        },
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Triggers high-priority alerts to administrative staff when absences exceed threshold.
                  </p>
                </div>

                <div className="space-y-1.5 flex flex-col justify-center">
                  <Label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={settings.attendance.dailyAlertEnabled}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          attendance: {
                            ...settings.attendance,
                            dailyAlertEnabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <span className="font-semibold text-xs">Enable Daily Parent Absentee Alerts</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground pl-6">
                    Dispatches automated SMS/Email upon finalized absence marking.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-3 flex justify-end">
                  <Button onClick={handleSaveAttendance} disabled={savingTab === 'attendance'} className="text-xs h-8">
                    {savingTab === 'attendance' ? 'Saving...' : 'Save Attendance Policies'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. Fee & Invoicing Policies Tab */}
        <TabsContent value="fees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Fee Management & Invoicing Rules</CardTitle>
                <CardDescription className="text-xs">
                  Invoice grace periods, reminder schedules, and payment counter instructions
                </CardDescription>
              </div>
              {saveSuccess === 'fees' && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fee Policies Saved
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Default Invoice Grace Period (Days)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={settings.fees.defaultDueGraceDays}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fees: { ...settings.fees, defaultDueGraceDays: Number(e.target.value) },
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Number of days added to invoice issue date before marking overdue.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Invoice Numbering Prefix</Label>
                  <Input
                    value={settings.fees.invoicePrefix}
                    disabled={!isAdmin}
                    maxLength={10}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fees: { ...settings.fees, invoicePrefix: e.target.value.toUpperCase() },
                      })
                    }
                    className="font-mono uppercase"
                  />
                  <p className="text-[11px] text-muted-foreground">e.g. INV-2026-0001</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Default Payment Instructions</Label>
                <textarea
                  rows={2}
                  value={settings.fees.paymentInstructions || ''}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fees: { ...settings.fees, paymentInstructions: e.target.value },
                    })
                  }
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Bank wire transfer details or school cash counter timings..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.fees.allowPartialPayments}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          fees: { ...settings.fees, allowPartialPayments: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <span className="font-semibold text-xs">Allow Partial Invoice Clearances</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground pl-6">
                    Enables installment payments towards a single fee invoice.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.fees.lateFeeEnabled}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          fees: { ...settings.fees, lateFeeEnabled: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <span className="font-semibold text-xs">Enable Automatic Late Fee Surcharge</span>
                  </Label>
                  {settings.fees.lateFeeEnabled && (
                    <div className="pl-6 pt-1">
                      <Input
                        type="number"
                        min={0}
                        placeholder="Late fee amount ($)"
                        value={settings.fees.lateFeeAmount}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            fees: { ...settings.fees, lateFeeAmount: Number(e.target.value) },
                          })
                        }
                        className="w-36 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="pt-3 flex justify-end">
                  <Button onClick={handleSaveFees} disabled={savingTab === 'fees'} className="text-xs h-8">
                    {savingTab === 'fees' ? 'Saving...' : 'Save Fee Policies'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. Notification Defaults Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Institutional Notification Defaults</CardTitle>
                <CardDescription className="text-xs">
                  School-wide automation baselines and permitted quiet hours windows
                </CardDescription>
              </div>
              {saveSuccess === 'notifications' && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Notification Settings Saved
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground">Automated Module Triggers</span>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.attendanceAlertDefault}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              attendanceAlertDefault: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      <span>Attendance alerts to parents upon absentee recording</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.feeReminderDefault}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              feeReminderDefault: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      <span>Tuition & fee reminders for outstanding balances</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.homeworkReminderDefault}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              homeworkReminderDefault: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      <span>Homework published notices and deadline reminders</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.examNoticeDefault}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              examNoticeDefault: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      <span>Examination schedule announcements</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.resultNoticeDefault}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notifications: {
                              ...settings.notifications,
                              resultNoticeDefault: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      <span>Official results published notifications</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-1 border-t sm:border-t-0 sm:border-l sm:pl-4">
                  <span className="text-xs font-semibold text-foreground">Delivery Windows & Quiet Hours</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={settings.notifications.quietHoursEnabled}
                      disabled={!isAdmin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            quietHoursEnabled: e.target.checked,
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <span>Suppress non-essential alerts during Quiet Hours</span>
                  </label>

                  {settings.notifications.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div>
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={settings.notifications.quietHoursStart || '22:00'}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                quietHoursStart: e.target.value,
                              },
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={settings.notifications.quietHoursEnd || '07:00'}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notifications: {
                                ...settings.notifications,
                                quietHoursEnd: e.target.value,
                              },
                            })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-muted/40 rounded-lg text-[11px] text-muted-foreground mt-2">
                    Security-critical notices (password resets, OTP verification tokens) bypass quiet hours and are delivered immediately.
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-3 flex justify-end">
                  <Button onClick={handleSaveNotifications} disabled={savingTab === 'notifications'} className="text-xs h-8">
                    {savingTab === 'notifications' ? 'Saving...' : 'Save Notification Defaults'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
