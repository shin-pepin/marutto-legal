export interface RetryOptions {
  /** Maximum number of retries. Default: 3 */
  maxRetries: number;
  /** Initial delay in ms. Default: 500 */
  baseDelayMs: number;
  /** Maximum delay in ms. Default: 5000 */
  maxDelayMs: number;
  /** Jitter factor (0-1). Default: 0.2 */
  jitterFactor: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  jitterFactor: 0.2,
};

/** HTTP status codes that should be retried */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/** GraphQL error codes that should be retried */
const RETRYABLE_ERROR_CODES = new Set(["THROTTLED"]);

/** Network error codes that should be retried */
const RETRYABLE_NETWORK_ERRORS = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "EAI_AGAIN",
]);

/**
 * Calculate delay with exponential backoff and jitter.
 */
export function calculateDelay(
  attempt: number,
  options: RetryOptions,
): number {
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponentialDelay, options.maxDelayMs);
  const jitter = capped * options.jitterFactor * (2 * Math.random() - 1);
  return Math.max(0, capped + jitter);
}

/**
 * Determine if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Response) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  if (error instanceof Error) {
    // Network errors
    const code = (error as NodeJS.ErrnoException).code;
    if (code && RETRYABLE_NETWORK_ERRORS.has(code)) {
      return true;
    }

    // Shopify GraphQL throttling
    if (error.message.includes("Throttled")) {
      return true;
    }
  }

  // Check for error objects with status codes
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return RETRYABLE_STATUS_CODES.has(
      (error as { status: number }).status,
    );
  }

  return false;
}

/**
 * Check if a GraphQL response contains retryable error codes.
 */
export function hasRetryableGraphQLError(
  responseBody: unknown,
): boolean {
  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("errors" in responseBody)
  ) {
    return false;
  }

  const errors = (responseBody as { errors: unknown[] }).errors;
  if (!Array.isArray(errors)) return false;

  return errors.some(
    (err) =>
      typeof err === "object" &&
      err !== null &&
      "extensions" in err &&
      typeof (err as { extensions: { code?: string } }).extensions?.code ===
        "string" &&
      RETRYABLE_ERROR_CODES.has(
        (err as { extensions: { code: string } }).extensions.code,
      ),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with exponential backoff retry.
 *
 * Retries on: 429, 5xx, THROTTLED, network errors (ECONNRESET, ETIMEDOUT, etc.)
 * Does NOT retry on: 4xx (except 429), userErrors (input validation)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= opts.maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = calculateDelay(attempt, opts);
      await sleep(delay);
    }
  }

  // Unreachable, but TypeScript needs this
  throw lastError;
}
