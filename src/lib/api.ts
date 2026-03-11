export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export async function apiFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 10000, retries = 2, retryDelay = 1000, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        throw new ApiError(res.status, errorBody || res.statusText);
      }

      return (await res.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      const isAbort =
        error instanceof DOMException && (error.name === "AbortError" || error.message === "The user aborted a request.");

      if (attempt === retries || isAbort) {
        if (isAbort) {
          throw new ApiError(408, "Request timed out");
        }
        throw error;
      }

      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }

      await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
    }
  }

  throw new ApiError(500, "Unexpected: all retries exhausted");
}

