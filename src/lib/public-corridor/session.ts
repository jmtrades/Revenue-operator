/**
 * Public corridor session handling: persistent state for public work access without accounts.
 * Enables "same browser returned" vs "new party viewed" detection.
 */

import { getDb } from "@/lib/db/queries";
import { randomBytes } from "crypto";

const CORRIDOR_TOKEN_LENGTH = 32;
const CORRIDOR_COOKIE_NAME = "corridor_token";

/**
 * Get or create corridor session for a thread.
 * Returns session token and whether this is a reopen (thread was acknowledged, session exists).
 */
export async function getOrCreateCorridorSession(
  threadId: string,
  corridorToken?: string | null
): Promise<{ token: string; isReopen: boolean }> {
  const db = getDb();
  
  if (corridorToken) {
    const { data: existing } = await db
      .from("public_corridor_sessions")
      .select("first_seen_at, last_seen_at")
      .eq("corridor_token", corridorToken)
      .eq("thread_id", threadId)
      .maybeSingle();
    
    if (existing) {
      const now = new Date().toISOString();
      await db
        .from("public_corridor_sessions")
        .update({ last_seen_at: now })
        .eq("corridor_token", corridorToken)
        .eq("thread_id", threadId);
      
      const { data: tx } = await db
        .from("shared_transactions")
        .select("state, acknowledged_at")
        .eq("id", threadId)
        .maybeSingle();
      
      const isReopen = tx && 
        (tx as { state: string }).state === "acknowledged" &&
        (tx as { acknowledged_at: string | null }).acknowledged_at &&
        new Date((tx as { acknowledged_at: string }).acknowledged_at).getTime() < new Date(existing.first_seen_at).getTime();
      
      return { token: corridorToken, isReopen: !!isReopen };
    }
  }
  
  const token = randomBytes(CORRIDOR_TOKEN_LENGTH).toString("hex");
  const now = new Date().toISOString();
  
  await db.from("public_corridor_sessions").insert({
    thread_id: threadId,
    corridor_token: token,
    first_seen_at: now,
    last_seen_at: now,
  });
  
  return { token, isReopen: false };
}

/**
 * Update session with actor role and participant hint.
 */
export async function updateCorridorSession(
  corridorToken: string,
  threadId: string,
  actorRole?: string,
  participantHint?: string | null
): Promise<void> {
  const db = getDb();
  const updates: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
  
  if (actorRole && ["originator", "counterparty", "downstream", "observer"].includes(actorRole)) {
    updates.last_actor_role = actorRole;
  }
  
  if (participantHint && participantHint.length <= 60) {
    updates.last_participant_hint = participantHint;
  }
  
  await db
    .from("public_corridor_sessions")
    .update(updates)
    .eq("corridor_token", corridorToken)
    .eq("thread_id", threadId);
}

/**
 * Get corridor token from request cookies.
 */
export function getCorridorTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const corridorCookie = cookies.find((c) => c.startsWith(`${CORRIDOR_COOKIE_NAME}=`));
  
  if (!corridorCookie) return null;
  
  const token = corridorCookie.split("=")[1];
  return token && token.length === CORRIDOR_TOKEN_LENGTH * 2 ? token : null;
}
