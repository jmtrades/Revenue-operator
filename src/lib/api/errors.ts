/**
 * Typed API error codes and standardized error response builder.
 *
 * Every API error gets a machine-readable code + human-readable message.
 * Clients can switch on `error.code` instead of parsing strings.
 */

import { NextResponse } from "next/server";

// ── Error code registry ────────────────────────────────

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // Billing
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  PAYMENT_METHOD_REQUIRED: "PAYMENT_METHOD_REQUIRED",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  GRACE_PERIOD_EXPIRED: "GRACE_PERIOD_EXPIRED",

  // External services
  STRIPE_ERROR: "STRIPE_ERROR",
  TELEPHONY_ERROR: "TELEPHONY_ERROR",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  TIMEOUT: "TIMEOUT",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ── Standardized response envelope ─────────────────────

export interface ApiSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Response builders ──────────────────────────────────

/** Build a success response with the standard envelope */
export function apiOk<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ ok: true, data } as ApiSuccessResponse<T>, { status });
}

/** Build an error response with typed code */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    ok: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}

// ── Convenience shortcuts ──────────────────────────────

export const apiBadRequest = (message: string, details?: Record<string, unknown>) =>
  apiError("BAD_REQUEST", message, 400, details);

export const apiUnauthorized = (message = "Authentication required") =>
  apiError("UNAUTHORIZED", message, 401);

export const apiForbidden = (message = "Access denied") =>
  apiError("FORBIDDEN", message, 403);

export const apiNotFound = (resource = "Resource") =>
  apiError("NOT_FOUND", `${resource} not found`, 404);

export const apiConflict = (message: string) =>
  apiError("CONFLICT", message, 409);

export const apiValidationError = (message: string, details?: Record<string, unknown>) =>
  apiError("VALIDATION_ERROR", message, 422, details);

export const apiRateLimited = (retryAfterSeconds?: number) => {
  const res = apiError("RATE_LIMITED", "Too many requests", 429);
  if (retryAfterSeconds) {
    res.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return res;
};

export const apiInternalError = (message = "An unexpected error occurred") =>
  apiError("INTERNAL_ERROR", message, 500);
