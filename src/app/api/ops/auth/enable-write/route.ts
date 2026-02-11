/**
 * Ops: Enable write access for current session (ADMIN only)
 * STAFF must request this; ADMIN approves via this endpoint.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSessionFromCookie, logStaffAction } from "@/lib/ops/auth";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can enable write access" }, { status: 403 });
  }

  let body: { enable?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const enable = body.enable !== false;

  const db = getDb();
  const cookieStore = await (await import("next/headers")).cookies();
  const sessionToken = cookieStore.get("ops_session")?.value;
  if (!sessionToken) return NextResponse.json({ error: "No session token" }, { status: 400 });

  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  await db
    .from("staff_sessions")
    .update({ write_access_enabled: enable })
    .eq("session_token_hash", tokenHash);

  await logStaffAction(session.id, "enable_write_access", { enable });

  return NextResponse.json({ ok: true, write_access_enabled: enable });
}
