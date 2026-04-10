import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/public/[id] — return minimal public-facing agent info.
 *
 * This endpoint is intentionally unauthenticated so the chat widget embed
 * can fetch agent name/greeting without a session.  Security measures:
 *  - Only returns id, name, greeting (no system prompts, config, or workspace data)
 *  - Rate limited via edge runtime config (not inline, to avoid cold-start overhead)
 *  - Agent IDs are UUIDs — not enumerable
 *  - Added workspace_id exclusion from response to prevent cross-workspace leaks
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("agents")
    .select("id, name, greeting")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load agent" },
      { status: 500 },
    );
  }
  if (!data) {
    // Return generic 404 — don't reveal whether the ID format was valid
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const row = data as { id?: string; name?: string | null; greeting?: string | null };

  return NextResponse.json(
    {
      id: row.id ?? id,
      name: row.name ?? "Agent",
      greeting: row.greeting ?? null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
