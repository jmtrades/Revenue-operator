/**
 * Route middleware: withWorkspace / withAuth
 *
 * Eliminates the 800+ copies of workspace auth boilerplate across API routes.
 * Provides typed, validated context to handlers so they never touch raw params.
 *
 * Usage:
 *   export const GET = withWorkspace(async (req, ctx) => {
 *     // ctx.workspaceId is guaranteed valid UUID
 *     // ctx.session is guaranteed authenticated
 *     const data = await db.from("agents").select("*").eq("workspace_id", ctx.workspaceId);
 *     return NextResponse.json(data);
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

// ── Types ───────────────────────────────────────────────

export interface WorkspaceContext {
  workspaceId: string;
  session: { userId: string; workspaceId?: string };
  /** Route params from Next.js dynamic segments (e.g., { id: "abc" }) */
  params: Record<string, string>;
}

export interface AuthContext {
  session: { userId: string; workspaceId?: string };
  params: Record<string, string>;
}

interface MiddlewareOptions {
  /** Require CSRF (same-origin) check. Default: true for mutating methods. */
  csrf?: boolean;
  /** Rate limit key pattern. Use `{workspaceId}` as placeholder. */
  rateLimit?: { key: string; max: number; windowMs: number };
  /** How to extract workspace_id. Default: query param. "body" clones the request to preserve body for handler. */
  workspaceFrom?: "query" | "session" | "body";
}

type WorkspaceHandler = (
  req: NextRequest,
  ctx: WorkspaceContext,
) => Promise<NextResponse> | NextResponse;

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext,
) => Promise<NextResponse> | NextResponse;

// ── UUID validation (no import needed) ──────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Helpers ─────────────────────────────────────────────

function isMutating(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code: statusToCode(status), message } }, { status });
}

function statusToCode(status: number): string {
  switch (status) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 422: return "VALIDATION_ERROR";
    case 429: return "RATE_LIMITED";
    default: return "INTERNAL_ERROR";
  }
}

// ── withWorkspace ───────────────────────────────────────

/**
 * Wraps a route handler with workspace authentication, CSRF, and rate limiting.
 * Extracts and validates workspace_id, checks access, injects typed context.
 */
export function withWorkspace(
  handler: WorkspaceHandler,
  options: MiddlewareOptions = {},
): (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => {
    // 1. CSRF for mutating requests
    const shouldCheckCsrf = options.csrf ?? isMutating(req.method);
    if (shouldCheckCsrf) {
      const csrfErr = assertSameOrigin(req);
      if (csrfErr) return csrfErr;
    }

    // 2. Authentication
    const session = await getSession(req);
    if (!session?.userId) {
      return errorResponse("Authentication required", 401);
    }

    // 3. Extract workspace_id
    let workspaceId: string | null = null;
    const source = options.workspaceFrom ?? "query";

    if (source === "query") {
      workspaceId = req.nextUrl.searchParams.get("workspace_id");
    } else if (source === "session") {
      workspaceId = session.workspaceId ?? null;
    } else if (source === "body") {
      try {
        const cloned = req.clone();
        const body = await cloned.json();
        workspaceId = typeof body?.workspace_id === "string" ? body.workspace_id.trim() : null;
      } catch {
        return errorResponse("Invalid JSON body", 400);
      }
    }

    if (!workspaceId || !UUID_RE.test(workspaceId)) {
      return errorResponse("Valid workspace_id is required", 400);
    }

    // 4. Workspace access check
    const accessErr = await requireWorkspaceAccess(req, workspaceId);
    if (accessErr) return accessErr;

    // 5. Rate limiting (optional)
    if (options.rateLimit) {
      const key = options.rateLimit.key.replace("{workspaceId}", workspaceId);
      const rl = await checkRateLimit(key, options.rateLimit.max, options.rateLimit.windowMs);
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
        return new NextResponse(
          JSON.stringify({ ok: false, error: { code: "RATE_LIMITED", message: "Too many requests" } }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.max(0, retryAfter)) } },
        );
      }
    }

    // 6. Resolve route params
    const params = routeCtx?.params ? await routeCtx.params : {} as Record<string, string>;

    // 7. Execute handler
    try {
      return await handler(req, { workspaceId, session: session as WorkspaceContext["session"], params });
    } catch (err) {
      log("error", "route_handler.unhandled_error", {
        method: req.method,
        path: req.nextUrl.pathname,
        workspace_id: workspaceId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3).join(" | ") : undefined,
      });
      return errorResponse("An unexpected error occurred", 500);
    }
  };
}

// ── withAuth (no workspace required) ────────────────────

/**
 * Wraps a route handler with authentication only (no workspace).
 * Use for user-level endpoints like /api/auth/profile.
 */
export function withAuth(
  handler: AuthHandler,
  options: Pick<MiddlewareOptions, "csrf" | "rateLimit"> = {},
): (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => {
    const shouldCheckCsrf = options.csrf ?? isMutating(req.method);
    if (shouldCheckCsrf) {
      const csrfErr = assertSameOrigin(req);
      if (csrfErr) return csrfErr;
    }

    const session = await getSession(req);
    if (!session?.userId) {
      return errorResponse("Authentication required", 401);
    }

    const params = routeCtx?.params ? await routeCtx.params : {} as Record<string, string>;

    try {
      return await handler(req, { session: session as AuthContext["session"], params });
    } catch (err) {
      log("error", "route_handler.unhandled_error", {
        method: req.method,
        path: req.nextUrl.pathname,
        error: err instanceof Error ? err.message : String(err),
      });
      return errorResponse("An unexpected error occurred", 500);
    }
  };
}
