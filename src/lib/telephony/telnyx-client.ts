/**
 * Telnyx REST API client using native fetch.
 * Base client for all Telnyx API interactions.
 */

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export interface TelnyxFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export interface TelnyxErrorResponse {
  errors?: Array<{
    code?: string;
    detail?: string;
    title?: string;
    source?: { parameter?: string };
  }>;
  error?: string;
  message?: string;
}

/**
 * Make a fetch request to Telnyx API with Bearer token authentication.
 */
export async function telnyxFetch(
  path: string,
  options: TelnyxFetchOptions = {}
): Promise<Response> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TELNYX_API_KEY not configured. Set TELNYX_API_KEY environment variable."
    );
  }

  const url = `${TELNYX_API_BASE}${path}`;

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(15_000),
  });

  return response;
}

/**
 * Parse Telnyx error response and extract meaningful error message.
 */
export function parseTelnyxError(data: unknown): string {
  const errorData = data as TelnyxErrorResponse;

  if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
    const firstError = errorData.errors[0];
    return firstError.detail || firstError.title || "Telnyx API error";
  }

  if (typeof errorData.error === "string") {
    return errorData.error;
  }

  if (typeof errorData.message === "string") {
    return errorData.message;
  }

  return "Unknown Telnyx error";
}

/**
 * Make a Telnyx API request and parse response as JSON.
 * Throws on network errors or non-200 responses.
 */
export async function telnyxRequest<T = Record<string, unknown>>(
  path: string,
  options: TelnyxFetchOptions = {}
): Promise<T> {
  const response = await telnyxFetch(path, options);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      const error = new Error(`Telnyx ${response.status}: ${response.statusText}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return {} as T;
  }

  if (!response.ok) {
    const errorMessage = parseTelnyxError(data);
    const error = new Error(`Telnyx ${response.status}: ${errorMessage}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return data as T;
}
