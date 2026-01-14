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

export interface FormattedError {
  success: false;
  error: {
    name: string;
    code: string;
    message: string;
    statusCode?: number;
    context?: ErrorContext;
  };
}

/**
 * Format a successful response
 */
export function formatSuccessResponse(result: unknown): object {
  if (result && typeof result === "object") {
    return { success: true, ...(result as Record<string, unknown>) };
  }
  return { success: true, data: result };
}

export function formatErrorResponse(
  error: unknown,
  context?: ErrorContext
): FormattedError {
  const mergedContext = context;

  if (error instanceof BrazeError) {
    logger.error("Braze API error", error, {
      code: error.code,
      ...mergedContext,
    });
    return {
      success: false,
      error: {
        name: error.name,
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context: { ...error.context, ...mergedContext },
      },
    };
  }

  if (error instanceof Error) {
    logger.error("Unexpected error", error, mergedContext);
    return {
      success: false,
      error: {
        name: error.name,
        code: "UNKNOWN_ERROR",
        message: error.message,
        context: mergedContext,
      },
    };
  }

  logger.error("Unknown error type", undefined, {
    error: String(error),
    ...mergedContext,
  });
  return {
    success: false,
    error: {
      name: "UnknownError",
      code: "UNKNOWN_ERROR",
      message: String(error),
      context: mergedContext,
    },
  };
}
