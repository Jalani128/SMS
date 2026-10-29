/**
 * Client-Side Error Tracking & Observability Utility
 * Formats, sanitizes, and reports unhandled frontend runtime errors.
 */

export interface ClientErrorPayload {
  correlationId: string;
  message: string;
  name?: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

export const reportClientError = (
  error: Error,
  componentStack?: string,
  correlationId?: string
): ClientErrorPayload => {
  const refId = correlationId || `err_client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const payload: ClientErrorPayload = {
    correlationId: refId,
    name: error.name,
    message: error.message || 'Unknown client runtime error',
    stack: import.meta.env.DEV ? error.stack : undefined,
    componentStack: import.meta.env.DEV ? componentStack : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // Safe developer logging
  if (import.meta.env.DEV) {
    console.error(`[ClientObservability] [${refId}] Captured unhandled error:`, error, componentStack);
  } else {
    // In production, log minimal sanitized error record
    console.warn(`[ClientObservability] [${refId}] Application error: ${payload.message}`);
  }

  return payload;
};
