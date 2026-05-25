import * as Sentry from '@sentry/react';

const SENSITIVE_KEY_PATTERN = /password|token|secret|cookie|authorization|hash/i;

function scrubEvent<TEvent extends Sentry.Event>(event: TEvent): TEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;

    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).map(([key, value]) => [
          key,
          SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : value,
        ]),
      );
    }
  }

  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }

  return event;
}

export const telemetryEnabled = Boolean(import.meta.env.VITE_SENTRY_DSN);

export function initializeTelemetry() {
  if (!telemetryEnabled) {
    return;
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    beforeSend: (event) => scrubEvent(event),
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!telemetryEnabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('uniconnect', context);
    }
    Sentry.captureException(error);
  });
}
