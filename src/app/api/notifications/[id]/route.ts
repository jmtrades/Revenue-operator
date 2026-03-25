/**
 * PATCH /api/notifications/[id] — Mark one notification as read.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const { data: row, error: fetchError } = await db
    .from("notifications")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (fetchError || !row)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error: updateError } = await db
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", session.userId);

  if (updateError) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
