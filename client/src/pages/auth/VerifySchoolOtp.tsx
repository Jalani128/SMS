import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { School, CheckCircle2, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

export const VerifySchoolOtp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ notice?: string } | null>(null);
  const [cooldown, setCooldown] = useState(60);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<{
        activationNotice?: string;
        schoolStatus?: string;
      }>('/auth/verify-school-otp', {
        email,
        otp: otp.trim(),
      });

      setSuccessInfo({
        notice: response.data?.activationNotice || 'School email verified successfully.',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);

    try {
      await api.post('/auth/resend-school-otp', { email });
      setCooldown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  if (successInfo) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Card className="shadow-lg text-center p-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Email Verified!</h2>
              <p className="text-sm text-muted-foreground mt-1">{successInfo.notice}</p>
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify School Email</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter the 6-digit OTP code sent to your registered email
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
          <form onSubmit={handleVerify}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Enter Verification Code</CardTitle>
              <CardDescription className="text-xs">
                OTPs expire in 5 minutes and allow up to 5 attempts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Registered Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@school.edu"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp">6-Digit OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Didn't receive a code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="text-xs text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t pt-4">
              <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  'Verify & Activate School'
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
