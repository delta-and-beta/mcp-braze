/**
 * Error tracking and monitoring integration
 * Provides optional Sentry integration for production error tracking
 * Adapted from mcp-airtable gold standard
 *
 * Note: To enable Sentry, install @sentry/node and set SENTRY_DSN env var:
 *   npm install @sentry/node
 *   SENTRY_DSN=https://xxx@sentry.io/xxx
 */

import { logger } from "./logger.js";
import type { ErrorContext } from "./errors.js";

/** Sentry initialization options */
interface SentryInitOptions {
  dsn: string;
  environment: string;
  release: string | undefined;
  tracesSampleRate: number;
  debug: boolean;
  sendDefaultPii: boolean;
  beforeSend: (event: Record<string, unknown>) => Record<string, unknown>;
}

/** Sentry severity level for messages */
type SentrySeverityLevel = "info" | "warning" | "error";

/** Sentry scope interface for setting context within withScope */
interface SentryScope {
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
}

/** Sentry module interface (optional dependency) */
interface SentryModule {
  init: (options: SentryInitOptions) => void;
  captureException: (error: Error) => string;
  captureMessage: (message: string, level?: SentrySeverityLevel) => string;
  setTag: (key: string, value: string) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  withScope: (callback: (scope: SentryScope) => void) => void;
}

let Sentry: SentryModule | null = null;
let initialized = false;

export interface SentryOptions {
  /** Sentry DSN (Data Source Name) */
  dsn?: string;
  /** Environment name (e.g., "production", "staging") */
  environment?: string;
  /** Release version */
  release?: string;
  /** Sample rate for transactions (0.0 to 1.0) */
  tracesSampleRate?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Initialize Sentry error tracking
 * No-op if @sentry/node is not installed or DSN is not provided
 */
export async function initSentry(options: SentryOptions = {}): Promise<boolean> {
  if (initialized) {
    return Sentry !== null;
  }

  initialized = true;

  const dsn = options.dsn || process.env.SENTRY_DSN;
  if (!dsn) {
    logger.debug("Sentry DSN not configured, error tracking disabled");
    return false;
  }

  try {
    // Dynamically import Sentry (optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sentryModule = await (Function('return import("@sentry/node")')() as Promise<unknown>);
    Sentry = sentryModule as SentryModule;

    Sentry.init({
      dsn,
      environment: options.environment || process.env.NODE_ENV || "development",
      release: options.release || process.env.npm_package_version,
      tracesSampleRate: options.tracesSampleRate ?? 0.1,
      debug: options.debug || false,
      // Don't send PII
      sendDefaultPii: false,
      // Filter out sensitive data
      beforeSend(event: Record<string, unknown>) {
        return redactSensitiveData(event);
      },
    });

    // Set default tags
    Sentry.setTag("mcp_server", "mcp-braze");

    logger.info("Sentry initialized", { environment: options.environment });
    return true;
  } catch {
    logger.debug("@sentry/node not installed, error tracking disabled");
    Sentry = null;
    return false;
  }
}

/**
 * Capture an exception and send to Sentry
 */
export function captureException(
  error: Error,
  context?: ErrorContext
): string | null {
  if (!Sentry) {
    return null;
  }

  const sentry = Sentry;
  let eventId: string | null = null;

  sentry.withScope((scope: SentryScope) => {
    if (context) {
      scope.setContext("tool_context", context);

      if (context.tool) {
        scope.setTag("tool", context.tool);
      }
      if (context.operation) {
        scope.setTag("operation", context.operation);
      }
    }

    eventId = sentry.captureException(error);
  });

  logger.debug("Exception captured in Sentry", { eventId, error: error.message });
  return eventId;
}

/**
 * Capture a message and send to Sentry
 */
export function captureMessage(
  message: string,
  level: SentrySeverityLevel = "info",
  context?: ErrorContext
): string | null {
  if (!Sentry) {
    return null;
  }

  const sentry = Sentry;
  let eventId: string | null = null;

  sentry.withScope((scope: SentryScope) => {
    if (context) {
      scope.setContext("message_context", context);
    }

    eventId = sentry.captureMessage(message, level);
  });

  return eventId;
}

/**
 * Set a tag that will be sent with all events
 */
export function setTag(key: string, value: string): void {
  if (Sentry) {
    Sentry.setTag(key, value);
  }
}

/**
 * Set context data that will be sent with events
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  if (Sentry) {
    Sentry.setContext(name, context);
  }
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return Sentry !== null;
}

/** Sensitive keys to redact from Sentry events (lowercase for case-insensitive matching) */
const SENSITIVE_KEYS = new Set([
  "api_key",
  "apikey",
  "authorization",
  "password",
  "secret",
  "token",
  "bearer",
  "x-api-key",
]);

/** Check if a key matches a sensitive pattern (case-insensitive) */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

/** Redact sensitive keys from an object */
function redactObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (isSensitiveKey(key)) {
      obj[key] = "[REDACTED]";
    }
  }
}

/** Redact sensitive data from Sentry events */
function redactSensitiveData(event: Record<string, unknown>): Record<string, unknown> {
  const request = event.request as Record<string, unknown> | undefined;
  if (request?.headers) {
    redactObject(request.headers as Record<string, unknown>);
  }

  const breadcrumbs = event.breadcrumbs as Array<Record<string, unknown>> | undefined;
  if (breadcrumbs) {
    for (const crumb of breadcrumbs) {
      const data = crumb.data as Record<string, unknown> | undefined;
      if (data) {
        redactObject(data);
      }
    }
  }

  const extra = event.extra as Record<string, unknown> | undefined;
  if (extra) {
    redactObject(extra);
  }

  return event;
}

/** Error handler function type */
type ErrorHandler = (error: Error, additionalContext?: Record<string, unknown>) => void;

/** Create an error handler that captures to Sentry */
export function createErrorHandler(toolName: string): ErrorHandler {
  return function handleError(error: Error, additionalContext?: Record<string, unknown>): void {
    const context: ErrorContext = {
      tool: toolName,
      ...additionalContext,
    };

    captureException(error, context);
  };
}
