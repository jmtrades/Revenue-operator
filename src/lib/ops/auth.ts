/**
 * Ops staff authentication — magic link + session + RBAC
 * No ops endpoint callable without staff auth.
 */

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";

export type StaffRole = "ADMIN" | "STAFF";

export interface StaffUser {
  id: string;
  email: string;
  role: StaffRole;
}

export interface StaffSession extends StaffUser {
  sessionToken?: string; // Present when creating; cookie holds it when reading
  impersonationWorkspaceId: string | null;
  writeAccessEnabled: boolean;
}

const SESSION_COOKIE = "ops_session";
const SESSION_TTL_HOURS = 24;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMagicLink(email: string): Promise<{ token: string } | { error: string }> {
  const db = getDb();
  const { data: staff } = await db
    .from("staff_users")
    .select("id, email, role")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (!staff) return { error: "Not a staff user" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await db.from("staff_magic_links").insert({
    staff_user_id: staff.id,
    token_hash: hash(token),
    expires_at: expiresAt.toISOString(),
  });

  // In production, an email provider should deliver this URL to the staff user.
  // For now we surface it directly for dev and operational debugging flows.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!baseUrl) {
    log("error", "[ops/auth] Cannot determine base URL — set NEXT_PUBLIC_APP_URL or VERCEL_URL");
    return { token: "" };
  }
  const verifyUrl = `${baseUrl}/api/ops/auth/verify?token=${token}`;
  if (process.env.NODE_ENV === "development" || process.env.OPS_DEV_MAGIC_LINK === "true") {
    return { token: verifyUrl };
  }
  return { token: verifyUrl };
}

export async function verifyMagicLinkAndCreateSession(token: string): Promise<StaffSession | { error: string }> {
  const db = getDb();
  const tokenHash = hash(token);
  const now = new Date().toISOString();

  const { data: link } = await db
    .from("staff_magic_links")
    .select("id, staff_user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle();

  if (!link) return { error: "Invalid or expired link" };
  if (link.used_at) return { error: "Link already used" };
  if (new Date(link.expires_at) < new Date()) return { error: "Link expired" };

  await db.from("staff_magic_links").update({ used_at: now }).eq("id", link.id);

  const { data: staff } = await db
    .from("staff_users")
    .select("id, email, role")
    .eq("id", link.staff_user_id)
    .maybeSingle();

  if (!staff || (staff.role !== "ADMIN" && staff.role !== "STAFF")) {
    return { error: "Staff user not found" };
  }

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_TTL_HOURS);

  await db.from("staff_sessions").insert({
    staff_user_id: staff.id,
    role: staff.role,
    session_token_hash: hash(sessionToken),
    write_access_enabled: false,
    expires_at: expiresAt.toISOString(),
  });

  return {
    id: staff.id,
    email: staff.email,
    role: staff.role as StaffRole,
    sessionToken,
    impersonationWorkspaceId: null,
    writeAccessEnabled: false,
  };
}

export async function getSessionFromCookie(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const db = getDb();
  const tokenHash = hash(sessionToken);
  const now = new Date().toISOString();

  const { data: session } = await db
    .from("staff_sessions")
    .select("id, staff_user_id, role, impersonation_workspace_id, write_access_enabled")
    .eq("session_token_hash", tokenHash)
    .gt("expires_at", now)
    .limit(1)
    .maybeSingle();

  if (!session) return null;

  const { data: staff } = await db
    .from("staff_users")
    .select("id, email, role")
    .eq("id", session.staff_user_id)
    .maybeSingle();

  if (!staff) return null;

  return {
    id: staff.id,
    email: staff.email,
    role: staff.role as StaffRole,
    impersonationWorkspaceId: session.impersonation_workspace_id ?? null,
    writeAccessEnabled: session.write_access_enabled ?? false,
  };
}

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_HOURS * 3600,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Require staff session; 401 if missing */
export async function requireStaffSession(): Promise<StaffSession> {
  const session = await getSessionFromCookie();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

/** Require staff session with write access (ADMIN or write_access_enabled) */
export async function requireStaffWriteAccess(): Promise<StaffSession> {
  const session = await requireStaffSession();
  if (session.role === "ADMIN" || session.writeAccessEnabled) return session;
  throw new Response(
    JSON.stringify({ error: "Write access required. Request from ADMIN." }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

export async function logStaffAction(
  staffUserId: string,
  action: string,
  payload: Record<string, unknown>,
  targetWorkspaceId?: string | null,
  targetLeadId?: string | null
): Promise<void> {
  const db = getDb();
  await db.from("staff_action_logs").insert({
    staff_user_id: staffUserId,
    action,
    payload: payload as Record<string, unknown>,
    target_workspace_id: targetWorkspaceId ?? null,
    target_lead_id: targetLeadId ?? null,
  });
}
