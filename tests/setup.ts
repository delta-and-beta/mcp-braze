import { vi } from 'vitest';

// Mock environment variables
process.env.BRAZE_API_KEY = 'test-api-key';
process.env.BRAZE_API_URL = 'https://rest.test.braze.com';
process.env.BRAZE_APP_ID = 'test-app-id';

// Mock logger to prevent console output during tests
vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logApiCall: vi.fn(),
  sanitizeLogData: vi.fn((data) => data),
}));

// Global test utilities
export const mockApiResponse = <T>(data: T): { data: T } => ({ data });

export const mockApiError = (status: number, message: string) => {
  const error = new Error(message) as any;
  error.response = {
    status,
    data: { message },
    headers: {},
  };
  return error;
};

export const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));