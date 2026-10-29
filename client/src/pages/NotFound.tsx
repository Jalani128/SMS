import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { FileQuestion, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  const { activeRole } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        The dashboard route you requested does not exist or may have been reorganized.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to={`/${activeRole}`}>
          <Button variant="default" size="sm" className="gap-2">
            <Home className="h-4 w-4" />
            Back to {activeRole.toUpperCase()} Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
