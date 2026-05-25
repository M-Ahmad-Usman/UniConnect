import * as Sentry from "@sentry/node";
import { env } from "./env.js";

const SENSITIVE_KEY_PATTERN = /password|token|secret|cookie|authorization|hash/i;

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : value,
    ])
  );
}

function scrubEvent<TEvent extends Sentry.Event>(event: TEvent): TEvent {
  if (event.request) {
    event.request.headers = scrubHeaders(event.request.headers);
    delete event.request.cookies;
    delete event.request.data;
  }

  if (event.user) {
    event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  }

  return event;
}

export const telemetryEnabled = Boolean(env.SENTRY_DSN);

if (telemetryEnabled) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    beforeSend: (event) => scrubEvent(event),
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!telemetryEnabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("uniconnect", context);
    }
    Sentry.captureException(error);
  });
}
