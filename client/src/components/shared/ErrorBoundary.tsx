import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../../lib/errorTracker';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    correlationId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const correlationId = `err_ui_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return { hasError: true, error, correlationId };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const correlationId = this.state.correlationId || `err_ui_${Date.now()}`;
    this.setState({ errorInfo });
    reportClientError(error, errorInfo.componentStack || undefined, correlationId);
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: '',
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 m-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              An unexpected display error occurred in this view. The system has logged the event.
            </p>

            {this.state.correlationId && (
              <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded text-xs font-mono text-slate-500 dark:text-slate-400 mb-6 inline-block">
                Reference ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{this.state.correlationId}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Dashboard
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-6 text-left border-t border-slate-200 dark:border-slate-700 pt-4">
                <details className="text-xs text-red-600 dark:text-red-400">
                  <summary className="cursor-pointer font-medium hover:underline">
                    Error Details (Dev Mode Only)
                  </summary>
                  <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-x-auto text-[11px] text-slate-800 dark:text-slate-300 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {'\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
