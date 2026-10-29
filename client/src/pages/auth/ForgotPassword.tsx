import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { School, Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <School className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot Password</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reset access to your school management portal account
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
          {submitted ? (
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Instructions Dispatched</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  If an active account exists for <strong>{email}</strong>, password reset instructions and a secure link have been sent. Please check your inbox and spam folder.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center text-xs text-primary font-medium hover:underline pt-2">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Return to Sign In
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Reset Account Password</CardTitle>
                <CardDescription className="text-xs">
                  Enter your registered email address to receive password reset instructions.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Registered Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@school.edu"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 border-t pt-4">
                <Button type="submit" disabled={isLoading || !email} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Dispatching Reset Link...
                    </>
                  ) : (
                    'Send Password Reset Link'
                  )}
                </Button>
                <Link to="/login" className="text-xs text-center text-muted-foreground hover:text-foreground">
                  Remember your password? Sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
