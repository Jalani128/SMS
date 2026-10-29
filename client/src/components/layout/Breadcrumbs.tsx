import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const formatBreadcrumb = (segment: string) => {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <Link
        to="/"
        className="flex items-center hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {pathnames.map((segment, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={to}>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[220px]">
                {formatBreadcrumb(segment)}
              </span>
            ) : (
              <Link to={to} className="hover:text-foreground transition-colors truncate max-w-[120px]">
                {formatBreadcrumb(segment)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
