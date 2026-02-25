import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  isRetryableError,
  calculateDelay,
  hasRetryableGraphQLError,
} from "../shopify/retry.server";

describe("isRetryableError", () => {
  it("returns true for 429 status", () => {
    expect(isRetryableError({ status: 429 })).toBe(true);
  });

  it("returns true for 5xx status codes", () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 502 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError({ status: 504 })).toBe(true);
  });

  it("returns false for 4xx (except 429)", () => {
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 403 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
    expect(isRetryableError({ status: 422 })).toBe(false);
  });

  it("returns true for network errors", () => {
    const error = new Error("connection reset");
    (error as NodeJS.ErrnoException).code = "ECONNRESET";
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for ETIMEDOUT", () => {
    const error = new Error("timed out");
    (error as NodeJS.ErrnoException).code = "ETIMEDOUT";
    expect(isRetryableError(error)).toBe(true);
  });

  it("returns true for Throttled message", () => {
    expect(isRetryableError(new Error("Throttled"))).toBe(true);
  });

  it("returns false for generic errors", () => {
    expect(isRetryableError(new Error("Something went wrong"))).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe("hasRetryableGraphQLError", () => {
  it("detects THROTTLED error code", () => {
    const body = {
      errors: [
        { message: "Throttled", extensions: { code: "THROTTLED" } },
      ],
    };
    expect(hasRetryableGraphQLError(body)).toBe(true);
  });

  it("returns false for non-retryable GraphQL errors", () => {
    const body = {
      errors: [
        { message: "Not found", extensions: { code: "NOT_FOUND" } },
      ],
    };
    expect(hasRetryableGraphQLError(body)).toBe(false);
  });

  it("returns false when no errors present", () => {
    expect(hasRetryableGraphQLError({ data: {} })).toBe(false);
    expect(hasRetryableGraphQLError(null)).toBe(false);
    expect(hasRetryableGraphQLError({})).toBe(false);
  });
});

describe("calculateDelay", () => {
  it("produces exponential backoff", () => {
    const opts = {
      maxRetries: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      jitterFactor: 0, // no jitter for predictable tests
    };
    expect(calculateDelay(0, opts)).toBe(500); // 500 * 2^0
    expect(calculateDelay(1, opts)).toBe(1000); // 500 * 2^1
    expect(calculateDelay(2, opts)).toBe(2000); // 500 * 2^2
  });

  it("caps at maxDelayMs", () => {
    const opts = {
      maxRetries: 3,
      baseDelayMs: 500,
      maxDelayMs: 1500,
      jitterFactor: 0,
    };
    expect(calculateDelay(0, opts)).toBe(500);
    expect(calculateDelay(1, opts)).toBe(1000);
    expect(calculateDelay(2, opts)).toBe(1500); // capped
    expect(calculateDelay(3, opts)).toBe(1500); // still capped
  });

  it("applies jitter within bounds", () => {
    const opts = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      jitterFactor: 0.2,
    };
    // Run multiple times to check bounds
    for (let i = 0; i < 100; i++) {
      const delay = calculateDelay(0, opts);
      expect(delay).toBeGreaterThanOrEqual(800); // 1000 - 200
      expect(delay).toBeLessThanOrEqual(1200); // 1000 + 200
    }
  });
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const error = new Error("timed out");
    (error as NodeJS.ErrnoException).code = "ETIMEDOUT";

    const fn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-retryable error", async () => {
    const error = new Error("validation failed");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { baseDelayMs: 1, maxDelayMs: 1 }),
    ).rejects.toThrow("validation failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after maxRetries exhausted", async () => {
    const error = new Error("Throttled");
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 }),
    ).rejects.toThrow("Throttled");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("retries on 429 status object", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: "Too Many Requests" })
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 status object", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue("ok");

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400 status", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400, message: "Bad Request" });

    await expect(
      withRetry(fn, { baseDelayMs: 1, maxDelayMs: 1 }),
    ).rejects.toEqual({ status: 400, message: "Bad Request" });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
