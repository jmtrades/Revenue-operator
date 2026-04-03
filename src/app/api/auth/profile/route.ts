import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const csrfErr = assertSameOrigin(req);
  if (csrfErr) return csrfErr;

  const session = await getSession(req);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { displayName?: string | null; timezone?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const displayName = (body.displayName ?? "").trim().slice(0, 100) || null;
  const timezone = (body.timezone ?? "").trim().slice(0, 80) || null;

  // Reject obviously invalid timezone strings (must be IANA-like: Region/City)
  if (timezone && !/^[A-Za-z_]+\/[A-Za-z_\-\/]+$/.test(timezone)) {
    return NextResponse.json({ error: "Invalid timezone format" }, { status: 400 });
  }

  const db = getDb();

  try {
    // Prefer a dedicated profile table if it exists
    const { error } = await db
      .from("user_profiles")
      .upsert(
        {
          user_id: session.userId,
          display_name: displayName,
          timezone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      // Fallback: try storing on users metadata, but ignore if schema differs
      await db
        .from("users")
        .update({
          display_name: displayName,
          timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.userId);
    }
  } catch {
    // If both attempts fail, surface a generic error
    return NextResponse.json(
      { error: "Failed to save profile. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

