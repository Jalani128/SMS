import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const { user, activeRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="shadow-lg text-center p-6 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">403 - Access Denied</h1>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              You do not have administrative authorization to view this resource. Your active account is assigned the{' '}
              <strong className="text-foreground capitalize">{user?.role || activeRole}</strong> role.
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-muted/40 text-xs text-muted-foreground text-left space-y-1">
            <p className="font-semibold text-foreground">Role Restrictions Enforced:</p>
            <p>Access across school domains and role boundaries is strictly governed by server-side RBAC middleware and multi-tenant isolation policies.</p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate(`/${activeRole}`)} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Your Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out & Switch Account
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
