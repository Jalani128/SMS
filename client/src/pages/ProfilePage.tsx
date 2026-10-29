import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Bell,
  Camera,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Laptop,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  GraduationCap,
  Briefcase,
  Users,
  Building,
} from 'lucide-react';
import { profileService } from '../services/profile.service';
import { notificationService } from '../services/notification.service';
import { useAuth } from '../hooks/useAuth';
import { UserProfileResponse, UpdateProfilePayload } from '../types/profile';
import { NotificationPreferences } from '../types/notification';

export const ProfilePage: React.FC = () => {
  const { logout } = useAuth();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Edit Form State
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    bio: string;
    qualification: string;
    specializations: string;
    experienceYears: number;
    address: string;
    gender: string;
    bloodGroup: string;
    dateOfBirth: string;
    medicalNotes: string;
    occupation: string;
    alternatePhone: string;
    emergencyName: string;
    emergencyRelationship: string;
    emergencyPhone: string;
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    qualification: '',
    specializations: '',
    experienceYears: 0,
    address: '',
    gender: 'prefer_not_to_say',
    bloodGroup: 'unknown',
    dateOfBirth: '',
    medicalNotes: '',
    occupation: '',
    alternatePhone: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
  });

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<{
    name: string;
    mimetype: string;
    size: number;
    base64Data: string;
  } | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [profileData, prefData] = await Promise.all([
        profileService.getProfile(),
        notificationService.getPreferences().catch(() => null),
      ]);

      setProfile(profileData);
      if (prefData) setPreferences(prefData);

      const u = profileData.user;
      const rp = profileData.roleProfile || {};

      setFormData({
        firstName: u.firstName || (u.name ? u.name.split(' ')[0] : ''),
        lastName: u.lastName || (u.name ? u.name.split(' ').slice(1).join(' ') : ''),
        phone: u.phone || '',
        bio: rp.bio || '',
        qualification: rp.qualification || '',
        specializations: rp.specializations?.join(', ') || '',
        experienceYears: rp.experienceYears || 0,
        address: rp.address || '',
        gender: rp.gender || 'prefer_not_to_say',
        bloodGroup: rp.bloodGroup || 'unknown',
        dateOfBirth: rp.dateOfBirth ? rp.dateOfBirth.slice(0, 10) : '',
        medicalNotes: rp.medicalNotes || '',
        occupation: rp.occupation || '',
        alternatePhone: rp.alternatePhone || '',
        emergencyName: rp.emergencyContact?.name || '',
        emergencyRelationship: rp.emergencyContact?.relationship || '',
        emergencyPhone: rp.emergencyContact?.phone || '',
      });

      setAvatarPreview(u.avatarUrl || null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setSuccessMessage(null);
    } else {
      setSuccessMessage(msg);
      setErrorMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 6000);
  };

  // Password policy check
  const pwHasLength = newPassword.length >= 8;
  const pwHasUpper = /[A-Z]/.test(newPassword);
  const pwHasLower = /[a-z]/.test(newPassword);
  const pwHasDigit = /\d/.test(newPassword);
  const pwHasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword);
  const pwMatches = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid =
    pwHasLength && pwHasUpper && pwHasLower && pwHasDigit && pwHasSpecial && pwMatches;

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const payload: UpdateProfilePayload = {
        name: fullName || undefined,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
      };

      if (profile?.user.role === 'teacher') {
        payload.bio = formData.bio;
        payload.qualification = formData.qualification;
        payload.experienceYears = Number(formData.experienceYears) || 0;
        payload.specializations = formData.specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (profile?.user.role === 'student') {
        payload.address = formData.address;
        payload.gender = formData.gender as any;
        payload.bloodGroup = formData.bloodGroup as any;
        if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
        payload.medicalNotes = formData.medicalNotes;
        payload.emergencyContact = {
          name: formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
        };
      } else if (profile?.user.role === 'parent') {
        payload.occupation = formData.occupation;
        payload.alternatePhone = formData.alternatePhone;
        payload.address = formData.address;
        payload.emergencyContact = {
          name: formData.emergencyName,
          relationship: formData.emergencyRelationship,
          phone: formData.emergencyPhone,
        };
      }

      const updated = await profileService.updateProfile(payload);
      setProfile(updated);
      showNotification('Profile information updated successfully.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update profile.', true);
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showNotification('Only JPEG, PNG, or WebP images are allowed.', true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('Avatar image size must be under 5 MB.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      const base64Data = result.split(',')[1];
      setAvatarFile({
        name: file.name,
        mimetype: file.type,
        size: file.size,
        base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Avatar Upload
  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    try {
      setUploadingAvatar(true);
      const res = await profileService.uploadAvatar(avatarFile);
      setAvatarPreview(res.avatarUrl);
      setAvatarFile(null);
      if (profile) {
        setProfile({
          ...profile,
          user: { ...profile.user, avatarUrl: res.avatarUrl },
        });
      }
      showNotification('Avatar photo uploaded successfully.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to upload avatar photo.', true);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Avatar Delete
  const handleDeleteAvatar = async () => {
    try {
      setUploadingAvatar(true);
      await profileService.deleteAvatar();
      setAvatarPreview(null);
      setAvatarFile(null);
      if (profile) {
        setProfile({
          ...profile,
          user: { ...profile.user, avatarUrl: undefined },
        });
      }
      showNotification('Avatar photo removed.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete avatar.', true);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    try {
      setSavingPassword(true);
      const res = await profileService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification(res.message || 'Password changed successfully. Other sessions terminated.');
      loadProfile();
    } catch (err: any) {
      showNotification(err.message || 'Failed to change password.', true);
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Logout Other Sessions
  const handleLogoutOtherSessions = async () => {
    try {
      setRevokingSessions(true);
      const res = await profileService.logoutOtherSessions();
      showNotification(res.message);
      loadProfile();
    } catch (err: any) {
      showNotification(err.message || 'Failed to invalidate other sessions.', true);
    } finally {
      setRevokingSessions(false);
    }
  };

  // Handle Logout All Sessions
  const handleLogoutAllSessions = async () => {
    if (!window.confirm('Are you sure you want to log out from all devices? You will be redirected to the login page.')) {
      return;
    }
    try {
      setRevokingSessions(true);
      await profileService.logoutAllSessions();
      logout();
    } catch (err: any) {
      showNotification(err.message || 'Failed to log out all sessions.', true);
      setRevokingSessions(false);
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async () => {
    if (!preferences) return;
    try {
      setSavingPrefs(true);
      const updated = await notificationService.updatePreferences(preferences);
      setPreferences(updated);
      showNotification('Notification preferences saved.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update notification preferences.', true);
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading account profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-semibold">Unable to resolve user profile details.</p>
        <Button onClick={loadProfile} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const { user, roleProfile, security } = profile;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Account Profile & Security"
        description="Manage your personal profile, credentials, security sessions, and notification preferences."
      />

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Profile Overview Header Card */}
      <Card className="bg-gradient-to-r from-card via-card to-muted/20 border-border/80 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar Circle */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/10 flex items-center justify-center shadow-md">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-12 w-12 text-primary/70" />
                )}
              </div>
            </div>

            {/* User Meta Details */}
            <div className="flex-1 text-center md:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-2xl font-bold text-foreground">{user.name}</h2>
                <Badge variant="info" className="capitalize text-xs font-semibold">
                  {user.role.replace('_', ' ')}
                </Badge>
                {user.isActive && (
                  <Badge variant="success" className="text-xs">
                    Active Account
                  </Badge>
                )}
                {user.emailVerified ? (
                  <Badge variant="success" className="text-xs">
                    Email Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-xs">
                    Email Pending
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">{user.email}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-primary/70" />
                  {user.schoolName}
                </span>
                {user.phone && <span>• Phone: {user.phone}</span>}
                <span>• Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Role Quick Highlights */}
            <div className="bg-muted/40 border rounded-xl p-3.5 text-xs text-muted-foreground space-y-1.5 min-w-[200px]">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Account Overview
              </div>
              <div>ID: <span className="font-mono text-[11px] text-foreground">{user.id.slice(-8)}</span></div>
              {roleProfile?.admissionNumber && (
                <div>Admission: <span className="font-semibold text-foreground">{roleProfile.admissionNumber}</span></div>
              )}
              {roleProfile?.employeeId && (
                <div>Employee ID: <span className="font-semibold text-foreground">{roleProfile.employeeId}</span></div>
              )}
              {roleProfile?.currentClassId?.name && (
                <div>Class: <span className="font-semibold text-foreground">{roleProfile.currentClassId.name}</span></div>
              )}
              {roleProfile?.children && (
                <div>Linked Wards: <span className="font-semibold text-foreground">{roleProfile.children.length} Students</span></div>
              )}
              <div>Token Version: <span className="font-semibold text-foreground">{security.tokenVersion}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Configuration Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span>Profile Details</span>
          </TabsTrigger>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span>Profile Photo</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Security & Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Preferences</span>
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: Profile Information (Role Tailored)                           */}
        {/* =================================================================== */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal & Professional Information</CardTitle>
              <CardDescription>
                Update permitted profile information. Sensitive administrative attributes (role, school partition, and student academic enrollments) are strictly protected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* General User Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g. Alexander"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g. Hamilton"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address (Read-Only)</Label>
                    <Input id="email" value={user.email} disabled className="bg-muted cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                {/* TEACHER SPECIFIC FIELDS */}
                {user.role === 'teacher' && (
                  <div className="border-t pt-5 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Faculty & Academic Profile
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qualification">Highest Academic Qualification</Label>
                        <Input
                          id="qualification"
                          value={formData.qualification}
                          onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                          placeholder="e.g. M.Sc. in Physics, B.Ed."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experienceYears">Years of Teaching Experience</Label>
                        <Input
                          id="experienceYears"
                          type="number"
                          min="0"
                          max="80"
                          value={formData.experienceYears}
                          onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="specializations">Specializations & Subject Expertise (comma-separated)</Label>
                        <Input
                          id="specializations"
                          value={formData.specializations}
                          onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                          placeholder="e.g. Quantum Mechanics, Calculus, Thermodynamics"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="bio">Professional Bio & Academic Summary</Label>
                        <textarea
                          id="bio"
                          rows={3}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="Brief summary of teaching philosophy, awards, and interests..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STUDENT SPECIFIC FIELDS */}
                {user.role === 'student' && (
                  <div className="border-t pt-5 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Users className="h-4 w-4 text-primary" />
                      Student Details & Emergency Contact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <select
                          id="gender"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bloodGroup">Blood Group</Label>
                        <select
                          id="bloodGroup"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.bloodGroup}
                          onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        >
                          <option value="unknown">Unknown</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-3 space-y-2">
                        <Label htmlFor="address">Residential Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Full residential street address..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                        <Input
                          id="emergencyName"
                          value={formData.emergencyName}
                          onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                          placeholder="Parent / Guardian Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyRelationship">Relationship</Label>
                        <Input
                          id="emergencyRelationship"
                          value={formData.emergencyRelationship}
                          onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                          placeholder="e.g. Father, Mother, Guardian"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                        <Input
                          id="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PARENT SPECIFIC FIELDS & LINKED WARDS */}
                {user.role === 'parent' && (
                  <div className="border-t pt-5 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Parent Details & Ward Directory
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation / Workplace</Label>
                        <Input
                          id="occupation"
                          value={formData.occupation}
                          onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                          placeholder="e.g. Software Engineer, Doctor, Business"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="alternatePhone">Alternate Emergency Phone</Label>
                        <Input
                          id="alternatePhone"
                          value={formData.alternatePhone}
                          onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="address">Residential Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Full residential street address..."
                        />
                      </div>
                    </div>

                    {/* Linked Children Cards */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">
                        Enrolled Wards Under Guardianship
                      </Label>
                      {roleProfile?.children && roleProfile.children.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {roleProfile.children.map((child: any, idx: number) => {
                            const c = child.studentProfileId;
                            return (
                              <div
                                key={idx}
                                className="p-3.5 rounded-lg border bg-muted/30 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-semibold text-sm text-foreground">
                                    {c?.userId?.name || 'Enrolled Student'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Class: {c?.currentClassId?.name || 'Assigned'} | Roll: {c?.rollNumber || 'N/A'}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground font-mono">
                                    Adm: {c?.admissionNumber}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="capitalize text-[10px]">
                                  {child.relationship}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No wards currently linked to this parent profile.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: Avatar & Profile Photo Upload                                */}
        {/* =================================================================== */}
        <TabsContent value="avatar">
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo Management</CardTitle>
              <CardDescription>
                Upload an official portrait or avatar. Supported formats include JPEG, PNG, and WebP up to 5 MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Current Avatar Large Preview */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-40 w-40 rounded-full border-4 border-muted overflow-hidden bg-primary/10 flex items-center justify-center shadow-lg">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
                    ) : (
                      <UserIcon className="h-20 w-20 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">Preview Avatar (400x400)</span>
                </div>

                {/* Upload & Controls */}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1">
                    <Label htmlFor="avatarInput" className="text-sm font-semibold">
                      Choose New Image
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Photos are processed, cropped to fit, and stored securely.
                    </p>
                  </div>

                  <input
                    id="avatarInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />

                  {avatarFile && (
                    <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                      <div className="font-semibold text-foreground">File Selected:</div>
                      <div>Name: {avatarFile.name}</div>
                      <div>Size: {(avatarFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={handleUploadAvatar}
                      disabled={!avatarFile || uploadingAvatar}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      {uploadingAvatar ? 'Uploading...' : 'Save New Avatar'}
                    </Button>
                    {user.avatarUrl && (
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAvatar}
                        disabled={uploadingAvatar}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Avatar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: Security & Password Management                               */}
        {/* =================================================================== */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Change Password Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your credentials. Upon saving, all other active sessions and access tokens will be invalidated immediately.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Real-time Checklist */}
                  <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5">
                    <div className="font-semibold text-foreground">Password Policy Requirements:</div>
                    <div className={`flex items-center gap-1.5 ${pwHasLength ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {pwHasLength ? '✓' : '○'} At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwHasUpper ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {pwHasUpper ? '✓' : '○'} At least 1 uppercase letter (A-Z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwHasLower ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {pwHasLower ? '✓' : '○'} At least 1 lowercase letter (a-z)
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwHasDigit ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {pwHasDigit ? '✓' : '○'} At least 1 numerical digit (0-9)
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwHasSpecial ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {pwHasSpecial ? '✓' : '○'} At least 1 special character (!@#$%^&*...)
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwMatches ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
                      {pwMatches ? '✓' : '○'} Passwords match
                    </div>
                  </div>

                  <Button type="submit" disabled={!isPasswordValid || savingPassword} className="w-full">
                    {savingPassword ? 'Changing Password...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Session Management & Audit Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-primary" />
                  Active Sessions & Security Telemetry
                </CardTitle>
                <CardDescription>
                  Monitor recent authenticated logins and exercise remote session termination.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs">
                    <span className="text-muted-foreground">Last Login Activity:</span>
                    <span className="font-semibold text-foreground">
                      {security.lastLoginAt ? new Date(security.lastLoginAt).toLocaleString() : 'First Session'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs">
                    <span className="text-muted-foreground">Client IP Address:</span>
                    <span className="font-mono text-foreground">{security.lastLoginIp || '127.0.0.1'}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs">
                    <span className="text-muted-foreground">User Agent / Device:</span>
                    <span className="font-mono text-foreground truncate max-w-[200px]" title={security.lastLoginUserAgent}>
                      {security.lastLoginUserAgent || 'Modern Web Browser'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs">
                    <span className="text-muted-foreground">Password Last Changed:</span>
                    <span className="font-semibold text-foreground">
                      {security.passwordChangedAt ? new Date(security.passwordChangedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs">
                    <span className="text-muted-foreground">Current Token Epoch:</span>
                    <span className="font-semibold text-foreground">v{security.tokenVersion} (Active)</span>
                  </div>
                </div>

                {/* Revocation Actions */}
                <div className="border-t pt-4 space-y-3">
                  <div className="text-xs font-semibold text-foreground">Remote Revocation Controls</div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={handleLogoutOtherSessions}
                      disabled={revokingSessions}
                      className="justify-start gap-2 text-xs"
                    >
                      <LogOut className="h-4 w-4 text-warning" />
                      Sign Out Other Devices (Keeps Current Window Active)
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleLogoutAllSessions}
                      disabled={revokingSessions}
                      className="justify-start gap-2 text-xs"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out Everywhere (Logs Out All Browsers)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: Notification Preferences                                    */}
        {/* =================================================================== */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Notification Channel Preferences
              </CardTitle>
              <CardDescription>
                Customize which automated events trigger in-app messages and real-time email notifications. Mandatory administrative security notices cannot be disabled.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preferences ? (
                <div className="space-y-6">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3 text-left">Notification Category</th>
                          <th className="p-3 text-center w-28">In-App Alert</th>
                          <th className="p-3 text-center w-28">Email Dispatch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          { key: 'academic', title: 'Academic Sessions & Classes' },
                          { key: 'attendance', title: 'Daily Attendance & Absence Alerts' },
                          { key: 'homework', title: 'Homework & Assignment Deadlines' },
                          { key: 'exams', title: 'Exam Schedules & Published Results' },
                          { key: 'finance', title: 'Fee Invoices & Payment Receipts' },
                          { key: 'announcements', title: 'School-Wide Announcements' },
                        ].map((cat) => {
                          const k = cat.key as keyof typeof preferences.inApp;
                          return (
                            <tr key={cat.key} className="hover:bg-muted/30">
                              <td className="p-3 font-medium text-foreground">{cat.title}</td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                  checked={preferences.inApp[k]}
                                  onChange={(e) =>
                                    setPreferences({
                                      ...preferences,
                                      inApp: { ...preferences.inApp, [k]: e.target.checked },
                                    })
                                  }
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                                  checked={preferences.email[k]}
                                  onChange={(e) =>
                                    setPreferences({
                                      ...preferences,
                                      email: { ...preferences.email, [k]: e.target.checked },
                                    })
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSavePreferences} disabled={savingPrefs}>
                      {savingPrefs ? 'Saving Preferences...' : 'Save Preferences'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Notification preferences service is initializing...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
