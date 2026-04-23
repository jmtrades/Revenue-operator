/**
 * Single-call authorization helper for workspace-scoped API routes.
 *
 * Bundles session extraction + workspace membership check + role gate into one
 * call that returns either the authenticated session (with verified workspace
 * access) or an error response. Callers don't need to call `getSession` twice.
 *
 * Usage:
 *   const auth = await authorizeOrg(req, workspaceId, "viewer");
 *   if (!auth.ok) return auth.response;
 *   // auth.session.userId, auth.session.workspaceId, auth.role
 *
 * Returns one of:
 *   - { ok: true,  session, role }       — caller may proceed
 *   - { ok: false, response }             — caller must return this NextResponse
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./request-session";
import { isSessionEnabled } from "./session";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type MemberRole = "owner" | "admin" | "manager" | "viewer";

const MEMBER_ROLE_RANK: Record<MemberRole, number> = {
  viewer: 0,
  manager: 1,
  admin: 2,
  owner: 3,
};

export type AuthorizedSession = NonNullable<SessionPayload>;

export type AuthorizeOrgResult =
  | { ok: true; session: AuthorizedSession; role: MemberRole }
  | { ok: false; response: NextResponse };

/**
 * Assert the request carries a valid session AND the user has at least `minRole`
 * access to `workspaceId`. Returns the session + resolved role on success.
 *
 * @param req          the NextRequest
 * @param workspaceId  target workspace (from path/query/body)
 * @param minRole      minimum required role; defaults to "viewer"
 */
export async function authorizeOrg(
  req: NextRequest,
  workspaceId: string,
  minRole: MemberRole = "viewer",
): Promise<AuthorizeOrgResult> {
  // Defensive: reject obviously malformed workspace IDs to prevent blind
  // DB lookups on attacker-controlled strings.
  if (typeof workspaceId !== "string" || workspaceId.length === 0 || workspaceId.length > 64) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid workspace id" }, { status: 400 }),
    };
  }

  if (!isSessionEnabled()) {
    if (process.env.NODE_ENV === "production") {
      log("error", "[SECURITY] authorizeOrg called with sessions disabled in production");
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    // Dev-only: synthesize a fake owner session. Never reached in prod.
    return {
      ok: true,
      session: { userId: "dev-user", workspaceId, emailVerified: true },
      role: "owner",
    };
  }

  const session = await getSession(req);
  if (!session?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const db = getDb();

  // 1) Owner on the workspace row is always granted (handles the case where
  //    the workspace_members row was never written — a known gap we close
  //    over time during migrations).
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if ((ws as { owner_id?: string } | null)?.owner_id === session.userId) {
    return { ok: true, session, role: "owner" };
  }

  // 2) Otherwise require an explicit membership row.
  const { data: member } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", session.userId)
    .maybeSingle();

  const role = (member as { role?: string } | null)?.role as MemberRole | undefined;

  // Return 404 (not 403) for non-members — don't leak existence of a workspace
  // the user can't see.
  if (!role || !(role in MEMBER_ROLE_RANK)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  // 3) Role gate.
  if (MEMBER_ROLE_RANK[role] < MEMBER_ROLE_RANK[minRole]) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, session, role };
}

/**
 * Convenience wrapper for routes that only need to know "is this caller
 * authenticated" — no workspace binding required. Use this sparingly; almost
 * every authenticated action should also be workspace-scoped.
 */
export async function requireAuthenticated(
  req: NextRequest,
): Promise<{ ok: true; session: AuthorizedSession } | { ok: false; response: NextResponse }> {
  if (!isSessionEnabled()) {
    if (process.env.NODE_ENV === "production") {
      log("error", "[SECURITY] requireAuthenticated called with sessions disabled in production");
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return {
      ok: true,
      session: { userId: "dev-user", workspaceId: undefined, emailVerified: true },
    };
  }

  const session = await getSession(req);
  if (!session?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}
