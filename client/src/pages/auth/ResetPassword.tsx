import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { School, Check, X, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password strength checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordValid) {
      setErrorMessage('Please ensure the new password satisfies all security criteria and matches confirmation.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email,
        token,
        newPassword,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-lg text-center p-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Password Reset Complete!</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Your password has been securely updated and all previous sessions have been revoked. You may now sign in.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="w-full">
              Proceed to Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <School className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Set New Password</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose a strong, unique password for your account
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
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Create New Password</CardTitle>
              <CardDescription className="text-xs">
                Tokens expire after 15 minutes and can only be used once.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Account Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.edu"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste reset token from email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {/* Password criteria checklist */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {hasMinLength ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {hasUpper ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                  <span>Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {hasLower ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                  <span>Lowercase (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {hasNumber ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {hasSpecial ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                  <span>Special symbol</span>
                </div>
                <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {isMatch ? <Check className="h-3 w-3 text-emerald-600" /> : <X className="h-3 w-3 text-muted-foreground" />}
                  <span>Passwords match</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t pt-4">
              <Button type="submit" disabled={isLoading || !isPasswordValid} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Reset Password & Invalidate Sessions'
                )}
              </Button>
              <Link to="/login" className="text-xs text-center text-muted-foreground hover:text-foreground">
                Back to Sign In
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
