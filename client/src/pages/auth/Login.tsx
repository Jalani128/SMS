import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { School, Shield, Users, GraduationCap, HeartHandshake, Lock, Mail, AlertCircle, Building2 } from 'lucide-react';
import { PREVIEW_SCHOOL } from '../../data/previewData';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@greenwood.edu');
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleQuickRoleSelect = (role: UserRole, demoEmail: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      await login(email, password, selectedRole);
      navigate(`/${selectedRole}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <School className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{PREVIEW_SCHOOL.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-School Management System (Phase 3 Authentication)
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Card */}
        <Card className="shadow-lg">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-lg">Sign In to Dashboard</CardTitle>
              <CardDescription className="text-xs">
                Select your persona or authenticate with registered credentials
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Quick Persona Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Quick Role Persona (One-Click Test)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickRoleSelect('admin', 'admin@greenwood.edu')}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-left ${
                      selectedRole === 'admin'
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRoleSelect('teacher', 'clara.oswald@greenwood.edu')}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-left ${
                      selectedRole === 'teacher'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-semibold'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Teacher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRoleSelect('student', 'liam.chen@student.greenwood.edu')}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-left ${
                      selectedRole === 'student'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-semibold'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickRoleSelect('parent', 'sarah.chen@parent.example.com')}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer text-left ${
                      selectedRole === 'parent'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-600 font-semibold'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <HeartHandshake className="h-3.5 w-3.5" />
                    <span>Parent</span>
                  </button>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" required>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>
                    Password
                  </Label>
                  <Link to="/forgot-password" className="text-[11px] text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Launch {selectedRole.toUpperCase()} Dashboard →
              </Button>

              <div className="flex items-center justify-between w-full text-xs pt-2 border-t">
                <Link to="/register-school" className="text-primary hover:underline flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Register New School
                </Link>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {PREVIEW_SCHOOL.code}
                </Badge>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
