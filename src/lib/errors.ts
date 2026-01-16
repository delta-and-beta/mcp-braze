/**
 * Custom error classes for Braze MCP server
 */

import { logger } from "./logger.js";

export interface ErrorContext {
  tool?: string;
  operation?: string;
  [key: string]: unknown;
}

export class BrazeError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    context?: ErrorContext
  ) {
    super(message);
    this.name = "BrazeError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class AuthenticationError extends BrazeError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "AUTHENTICATION_ERROR", 401, context);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends BrazeError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, context?: ErrorContext) {
    super(message, "RATE_LIMIT_ERROR", 429, context);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends BrazeError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: ErrorContext) {
    super(message, "VALIDATION_ERROR", 400, context);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class NotFoundError extends BrazeError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "NOT_FOUND_ERROR", 404, context);
    this.name = "NotFoundError";
  }
}

export class TimeoutError extends BrazeError {
  public readonly timeoutMs: number;
  public readonly url?: string;

  constructor(message: string, timeoutMs: number, url?: string, context?: ErrorContext) {
    super(message, "TIMEOUT_ERROR", 408, context);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
    this.url = url;
  }
}

export interface ErrorDetails {
  name: string;
  code: string;
  message: string;
  statusCode?: number;
  context?: ErrorContext;
}

export interface FormattedError {
  success: false;
  error: ErrorDetails;
}

export interface FormattedSuccess<T = unknown> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

/**
 * Format a successful response by wrapping the result with success: true.
 * If result is an object, spreads its properties into the response.
 * Otherwise, wraps the result in a data property.
 */
export function formatSuccessResponse<T>(result: T): FormattedSuccess<T> {
  if (result !== null && typeof result === "object" && !Array.isArray(result)) {
    return { success: true, ...(result as Record<string, unknown>) };
  }
  return { success: true, data: result };
}

/**
 * Format an error into a standardized response structure.
 * Handles BrazeError subclasses, standard Error instances, and unknown types.
 * Logs all errors with appropriate context for debugging.
 */
export function formatErrorResponse(
  error: unknown,
  context?: ErrorContext
): FormattedError {
  if (error instanceof BrazeError) {
    logger.error("Braze API error", error, {
      code: error.code,
      ...context,
    });
    return {
      success: false,
      error: {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context: { ...error.context, ...context },
      },
    };
  }

  if (error instanceof Error) {
    logger.error("Unexpected error", error, context);
    return {
      success: false,
      error: {
        name: error.name,
        code: "UNKNOWN_ERROR",
        message: error.message,
        context,
      },
    };
  }

  logger.error("Unknown error type", undefined, {
    error: String(error),
    ...context,
  });
  return {
    success: false,
    error: {
      name: "UnknownError",
      code: "UNKNOWN_ERROR",
      message: String(error),
      context,
    },
  };
}
