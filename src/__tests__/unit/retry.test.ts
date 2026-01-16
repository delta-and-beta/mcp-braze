/**
 * Unit tests for retry.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateBackoff,
  isRetryableStatus,
  isRetryableError,
  parseRetryAfter,
  sleep,
  withRetry,
  fetchWithTimeout,
} from "../../lib/retry.js";
import { TimeoutError } from "../../lib/errors.js";

describe("retry", () => {
  describe("calculateBackoff", () => {
    it("should calculate exponential backoff", () => {
      const delay0 = calculateBackoff(0, 1000, 30000, 0);
      const delay1 = calculateBackoff(1, 1000, 30000, 0);
      const delay2 = calculateBackoff(2, 1000, 30000, 0);

      expect(delay0).toBe(1000); // 1000 * 2^0 = 1000
      expect(delay1).toBe(2000); // 1000 * 2^1 = 2000
      expect(delay2).toBe(4000); // 1000 * 2^2 = 4000
    });

    it("should cap at maxDelay", () => {
      const delay = calculateBackoff(10, 1000, 5000, 0);
      expect(delay).toBe(5000);
    });

    it("should add jitter when jitterFactor > 0", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // Returns 0 jitter at 0.5

      const delay = calculateBackoff(0, 1000, 30000, 0.1);
      expect(delay).toBe(1000); // 0.5 maps to 0 jitter

      vi.restoreAllMocks();
    });

    it("should handle jitter at boundaries", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const delayMin = calculateBackoff(0, 1000, 30000, 0.1);
      expect(delayMin).toBe(900); // 1000 * (1 - 0.1)

      vi.spyOn(Math, "random").mockReturnValue(1);
      const delayMax = calculateBackoff(0, 1000, 30000, 0.1);
      expect(delayMax).toBe(1100); // 1000 * (1 + 0.1)

      vi.restoreAllMocks();
    });

    it("should return non-negative delay", () => {
      const delay = calculateBackoff(0, 100, 1000, 0.5);
      expect(delay).toBeGreaterThanOrEqual(0);
    });
  });

  describe("isRetryableStatus", () => {
    it("should return true for retryable status codes", () => {
      const retryable = [429, 500, 502, 503, 504];

      retryable.forEach((status) => {
        expect(isRetryableStatus(status, retryable)).toBe(true);
      });
    });

    it("should return false for non-retryable status codes", () => {
      const retryable = [429, 500, 502, 503, 504];

      expect(isRetryableStatus(200, retryable)).toBe(false);
      expect(isRetryableStatus(400, retryable)).toBe(false);
      expect(isRetryableStatus(401, retryable)).toBe(false);
      expect(isRetryableStatus(404, retryable)).toBe(false);
    });
  });

  describe("isRetryableError", () => {
    it("should return true for retryable error codes", () => {
      const retryableCodes = ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"];

      expect(isRetryableError("ECONNRESET", retryableCodes)).toBe(true);
      expect(isRetryableError("ETIMEDOUT", retryableCodes)).toBe(true);
    });

    it("should return false for non-retryable error codes", () => {
      const retryableCodes = ["ECONNRESET", "ETIMEDOUT"];

      expect(isRetryableError("ENOTFOUND", retryableCodes)).toBe(false);
      expect(isRetryableError("UNKNOWN", retryableCodes)).toBe(false);
    });

    it("should return false for undefined error code", () => {
      expect(isRetryableError(undefined, ["ECONNRESET"])).toBe(false);
    });

    it("should handle partial matches", () => {
      const retryableCodes = ["CONN"];

      expect(isRetryableError("ECONNRESET", retryableCodes)).toBe(true);
      expect(isRetryableError("ECONNREFUSED", retryableCodes)).toBe(true);
    });
  });

  describe("parseRetryAfter", () => {
    it("should return null for null or empty header", () => {
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter("")).toBeNull();
      expect(parseRetryAfter("   ")).toBeNull();
    });

    it("should parse seconds format", () => {
      expect(parseRetryAfter("60")).toBe(60000);
      expect(parseRetryAfter("120")).toBe(120000);
      expect(parseRetryAfter("1")).toBe(1000);
    });

    it("should parse HTTP-date format", () => {
      const futureDate = new Date(Date.now() + 60000).toUTCString();
      const result = parseRetryAfter(futureDate);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(50000); // Approximately 60 seconds
      expect(result).toBeLessThanOrEqual(61000);
    });

    it("should return 0 for past HTTP-date", () => {
      const pastDate = new Date(Date.now() - 60000).toUTCString();
      const result = parseRetryAfter(pastDate);

      expect(result).toBe(0);
    });

    it("should return null for invalid format", () => {
      expect(parseRetryAfter("invalid")).toBeNull();
      expect(parseRetryAfter("abc123")).toBeNull();
    });
  });

  describe("sleep", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should resolve after specified time", async () => {
      const promise = sleep(1000);

      vi.advanceTimersByTime(999);
      expect(vi.getTimerCount()).toBe(1);

      vi.advanceTimersByTime(1);
      await promise;
    });

    it("should handle 0ms sleep", async () => {
      const promise = sleep(0);
      vi.advanceTimersByTime(0);
      await promise;
    });
  });

  describe("withRetry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return result on first success", async () => {
      const fn = vi.fn<() => Promise<string>>().mockResolvedValue("success");

      const resultPromise = withRetry(fn);
      vi.runAllTimers();
      const result = await resultPromise;

      expect(result.result).toBe("success");
      expect(result.attempts).toBe(1);
      expect(result.totalDelayMs).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should throw non-retryable errors immediately", async () => {
      const error = new Error("Non-retryable");
      const fn = vi.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(withRetry(fn)).rejects.toThrow("Non-retryable");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetchWithTimeout", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should return response within timeout", async () => {
      const mockResponse = new Response("OK", { status: 200 });
      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(mockResponse);
      vi.stubGlobal("fetch", mockFetch);

      const result = await fetchWithTimeout("https://example.com", {}, 5000);

      expect(result).toBe(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should throw TimeoutError when fetch is aborted", async () => {
      const abortError = Object.assign(new Error("Aborted"), {
        name: "AbortError",
      });
      const mockFetch = vi.fn<typeof fetch>().mockRejectedValue(abortError);
      vi.stubGlobal("fetch", mockFetch);

      await expect(
        fetchWithTimeout("https://example.com", {}, 5000)
      ).rejects.toThrow(TimeoutError);
    });
  });
});
