export class BrazeError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'BrazeError';
  }
}

export class AccessControlError extends BrazeError {
  constructor(message: string, details?: any) {
    super(message, 'ACCESS_DENIED', 403, details);
    this.name = 'AccessControlError';
  }
}

export class ValidationError extends BrazeError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends BrazeError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ApiError extends BrazeError {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'API_ERROR', statusCode, details);
    this.name = 'ApiError';
  }
}

export function isRetryableError(error: any): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  
  if (error instanceof ApiError) {
    return error.statusCode >= 500 || error.statusCode === 429;
  }
  
  return false;
}

export function formatErrorForMcp(error: any): { code: string; message: string; data?: any } {
  if (error instanceof BrazeError) {
    return {
      code: error.code,
      message: error.message,
      data: error.details,
    };
  }
  
  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: error.message,
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
  };
}