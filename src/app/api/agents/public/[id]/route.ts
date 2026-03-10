import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Agent id is required" }, { status: 400 });
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
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const row = data as { id?: string; name?: string | null; greeting?: string | null };

  return NextResponse.json({
    id: row.id ?? id,
    name: row.name ?? "Agent",
    greeting: row.greeting ?? null,
  });
}

