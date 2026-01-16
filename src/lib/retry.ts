/**
 * Retry utility with exponential backoff and jitter for HTTP requests
 */

import { logger } from "./logger.js";
import { TimeoutError } from "./errors.js";

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to randomize delays (default: 0.1) */
  jitterFactor?: number;
  /** HTTP status codes that should trigger retry (default: [429, 500, 502, 503, 504]) */
  retryableStatuses?: number[];
  /** Network error codes that should trigger retry */
  retryableErrorCodes?: string[];
  /** Timeout in milliseconds per request attempt (default: 30000) */
  timeoutMs?: number;
}

export interface RetryResult<T> {
  result: T;
  attempts: number;
  totalDelayMs: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.1,
  retryableStatuses: [429, 500, 502, 503, 504],
  retryableErrorCodes: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "EAI_AGAIN"],
  timeoutMs: 30000,
};

/**
 * Calculate delay with exponential backoff and jitter
 * Formula: min(initialDelay * 2^attempt, maxDelay) * (1 +/- jitter)
 */
export function calculateBackoff(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  const jitter = (Math.random() * 2 - 1) * jitterFactor;
  const finalDelay = Math.round(cappedDelay * (1 + jitter));

  return Math.max(0, finalDelay);
}

/** @internal Exported for testing */
export function isRetryableStatus(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status);
}

/** @internal Exported for testing */
export function isRetryableError(errorCode: string | undefined, retryableCodes: string[]): boolean {
  if (!errorCode) return false;
  return retryableCodes.some(code => errorCode.includes(code));
}

/**
 * Parse Retry-After header value to milliseconds.
 * Supports both seconds (integer) and HTTP-date (RFC 7231) formats.
 */
export function parseRetryAfter(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) return null;

  const trimmed = retryAfterHeader.trim();
  if (trimmed === "") return null;

  // Integer format: seconds until retry
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10) * 1000;
  }

  // HTTP-date format: absolute timestamp
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

/** @internal Exported for testing */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ErrorWithCause extends Error {
  cause?: { code?: string };
}

function hasErrorCause(error: unknown): error is ErrorWithCause {
  return error instanceof Error;
}

function isRetryableNetworkError(error: unknown, retryableCodes: string[]): boolean {
  if (!hasErrorCause(error)) return false;
  return isRetryableError(error.cause?.code, retryableCodes);
}

function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Execute a function with retry logic and exponential backoff.
 * Retries on network errors (ECONNRESET, ETIMEDOUT, etc.).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        logger.info("Retry succeeded", { attempt, totalDelayMs });
      }

      return { result, attempts: attempt + 1, totalDelayMs };
    } catch (error) {
      const canRetry = attempt < opts.maxRetries;
      const isRetryable = isRetryableNetworkError(error, opts.retryableErrorCodes);

      if (!canRetry || !isRetryable) {
        throw error;
      }

      const delay = calculateBackoff(attempt, opts.initialDelayMs, opts.maxDelayMs, opts.jitterFactor);
      totalDelayMs += delay;

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("Retrying after error", {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delayMs: delay,
        error: errorMessage,
      });

      await sleep(delay);
    }
  }

  // This should never be reached due to the throw in the catch block
  throw new Error("Retry loop exited unexpectedly");
}

/**
 * Execute fetch with timeout using AbortController.
 * Throws TimeoutError if the request exceeds the specified duration.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs, url);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute a fetch request with retry logic.
 * Handles both network errors and retryable HTTP status codes (429, 5xx).
 * Respects Retry-After header for rate limiting responses.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastResponse: Response | null = null;
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, opts.timeoutMs);

      if (!isRetryableStatus(response.status, opts.retryableStatuses)) {
        if (attempt > 0) {
          logger.info("Fetch retry succeeded", { url, attempt, totalDelayMs });
        }
        return response;
      }

      // Response has a retryable status code
      lastResponse = response;

      if (attempt >= opts.maxRetries) {
        return response;
      }

      const delay = calculateDelayForResponse(response, attempt, opts);
      totalDelayMs += delay;

      logger.warn("Retrying after HTTP error", {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        status: response.status,
        delayMs: delay,
        retryAfterHeader: response.headers.get("Retry-After"),
      });

      await sleep(delay);
    } catch (error) {
      const canRetry = attempt < opts.maxRetries;
      const isRetryable = isRetryableNetworkError(error, opts.retryableErrorCodes) || isTimeoutError(error);

      if (!canRetry || !isRetryable) {
        throw error;
      }

      const delay = calculateBackoff(attempt, opts.initialDelayMs, opts.maxDelayMs, opts.jitterFactor);
      totalDelayMs += delay;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = isTimeoutError(error) ? "timeout" : "network error";

      logger.warn(`Retrying after ${errorType}`, {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delayMs: delay,
        error: errorMessage,
      });

      await sleep(delay);
    }
  }

  // Return last response if we have one (retryable status exhausted retries)
  if (lastResponse) {
    return lastResponse;
  }

  // Should not reach here, but provides a safety net
  throw new Error("Retry loop exited unexpectedly");
}

function calculateDelayForResponse(
  response: Response,
  attempt: number,
  opts: Required<RetryOptions>
): number {
  // Respect Retry-After header for rate limit responses
  if (response.status === 429) {
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    if (retryAfter !== null) {
      return Math.min(retryAfter, opts.maxDelayMs);
    }
  }

  return calculateBackoff(attempt, opts.initialDelayMs, opts.maxDelayMs, opts.jitterFactor);
}
