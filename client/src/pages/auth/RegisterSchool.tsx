import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { School, Shield, Check, X, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export const RegisterSchool: React.FC = () => {
  const navigate = useNavigate();

  // School fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');

  // Admin fields
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate slug and code from school name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(generatedSlug);

    const initials = val
      .split(/\s+/)
      .map((word) => word[0])
      .filter(Boolean)
      .join('')
      .toUpperCase();
    if (initials.length >= 2) {
      setCode(`${initials}-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordValid) {
      setErrorMessage('Please ensure the admin password meets all security criteria.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register-school', {
        name,
        slug,
        code,
        schoolEmail,
        phone: phone || undefined,
        address: {
          city,
          country,
        },
        currency,
        adminName,
        adminEmail,
        password,
        adminPhone: adminPhone || undefined,
      });

      // Redirect to OTP verification page
      navigate(`/verify-otp?email=${encodeURIComponent(schoolEmail)}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check the details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <School className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Register New School</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set up your multi-tenant school partition and initial administrator credentials
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card className="shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-lg">School Onboarding & Admin Credentials</CardTitle>
              <CardDescription className="text-xs">
                An activation code (OTP) will be dispatched to your school email address for verification
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Section 1: School Profile */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3 border-b pb-1">
                  <School className="h-4 w-4 text-primary" />
                  School Organization Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="school-name">School Official Name *</Label>
                    <Input
                      id="school-name"
                      placeholder="e.g. St. Jude International Academy"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="school-slug">School Subdomain / Slug *</Label>
                    <Input
                      id="school-slug"
                      placeholder="e.g. st-jude-academy"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">Only lowercase letters, numbers, and hyphens</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="school-code">School Identifier Code *</Label>
                    <Input
                      id="school-code"
                      placeholder="e.g. SJA-101"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="school-email">School Contact Email *</Label>
                    <Input
                      id="school-email"
                      type="email"
                      placeholder="contact@stjude.edu"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">Verification OTP will be sent here</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="school-phone">School Phone</Label>
                    <Input
                      id="school-phone"
                      placeholder="+1 (555) 000-1234"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="e.g. San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="e.g. United States"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency Code</Label>
                    <Input
                      id="currency"
                      placeholder="USD"
                      maxLength={3}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Administrator Profile */}
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3 border-b pb-1">
                  <Shield className="h-4 w-4 text-primary" />
                  Primary School Administrator
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-name">Admin Full Name *</Label>
                    <Input
                      id="admin-name"
                      placeholder="e.g. Dr. Eleanor Vance"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">Admin Login Email *</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@stjude.edu"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="admin-phone">Admin Phone Number</Label>
                    <Input
                      id="admin-phone"
                      placeholder="+1 (555) 000-5678"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="password">Administrator Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    {/* Password criteria checklist */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 text-xs">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasMinLength ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasUpper ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                        <span>Uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasLower ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                        <span>Lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                        <span>Numeric digit (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        {hasSpecial ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                        <span>Special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
                Already registered? Sign in
              </Link>
              <Button type="submit" disabled={isLoading || !isPasswordValid} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering School...
                  </>
                ) : (
                  <>
                    Register & Send OTP
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
