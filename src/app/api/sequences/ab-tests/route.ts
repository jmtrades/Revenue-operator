export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getDb } from "@/lib/db/queries";

// GET: List active sequence A/B tests
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();

  // Get sequences grouped by their ab_test_group
  const { data: sequences } = await db
    .from("follow_up_sequences")
    .select("id, name, trigger_type, status, ab_test_group, created_at")
    .eq("workspace_id", workspaceId)
    .not("ab_test_group", "is", null)
    .order("created_at", { ascending: false });

  if (!sequences?.length) {
    return NextResponse.json({ tests: [] });
  }

  // Group by ab_test_group
  const groups: Record<string, (typeof sequences)[0][]> = {};
  for (const seq of sequences) {
    const group = (seq as { ab_test_group: string }).ab_test_group;
    if (!groups[group]) groups[group] = [];
    groups[group].push(seq);
  }

  // For each group, get enrollment stats
  const tests = await Promise.all(
    Object.entries(groups).map(async ([groupId, seqs]) => {
      const variants = await Promise.all(
        seqs.map(async (seq) => {
          // Count total enrollments
          const { count: totalEnrolled } = await db
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("sequence_id", seq.id);

          // Count completed
          const { count: completed } = await db
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("sequence_id", seq.id)
            .eq("status", "completed");

          // Count conversions (leads that moved to booked/won state)
          const { count: converted } = await db
            .from("sequence_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("sequence_id", seq.id)
            .eq("status", "completed")
            .not("converted_at", "is", null);

          const enrolled = totalEnrolled ?? 0;
          const convRate = enrolled > 0 ? ((converted ?? 0) / enrolled) * 100 : 0;

          return {
            sequence_id: seq.id,
            name: seq.name,
            status: seq.status,
            enrolled,
            completed: completed ?? 0,
            converted: converted ?? 0,
            conversion_rate: Math.round(convRate * 10) / 10,
          };
        })
      );

      // Determine winner
      const sorted = [...variants].sort((a, b) => b.conversion_rate - a.conversion_rate);
      const leader = sorted[0];
      const challenger = sorted[1];
      const lift = challenger && challenger.conversion_rate > 0
        ? Math.round(((leader.conversion_rate - challenger.conversion_rate) / challenger.conversion_rate) * 100)
        : 0;
      const totalSamples = variants.reduce((s, v) => s + v.enrolled, 0);
      const isSignificant = totalSamples >= 50 && Math.abs(lift) >= 10;

      return {
        group_id: groupId,
        trigger: seqs[0]?.trigger_type ?? "manual",
        variants,
        leader: leader?.sequence_id ?? null,
        lift,
        is_significant: isSignificant,
        total_enrolled: totalSamples,
      };
    })
  );

  return NextResponse.json({ tests });
}

// POST: Create a new A/B test by cloning a sequence
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  const body = await req.json() as { workspace_id: string; source_sequence_id: string; variant_name: string };
  if (!body.workspace_id || !body.source_sequence_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(req, body.workspace_id);
  if (authErr) return authErr;

  const db = getDb();

  // Get source sequence
  const { data: source } = await db
    .from("follow_up_sequences")
    .select("*")
    .eq("id", body.source_sequence_id)
    .eq("workspace_id", body.workspace_id)
    .maybeSingle();

  if (!source) return NextResponse.json({ error: "Source sequence not found" }, { status: 404 });

  // Generate or use existing ab_test_group
  const groupId = (source as { ab_test_group?: string }).ab_test_group || crypto.randomUUID();

  // Update source with group if needed
  if (!(source as { ab_test_group?: string }).ab_test_group) {
    await db
      .from("follow_up_sequences")
      .update({ ab_test_group: groupId })
      .eq("id", body.source_sequence_id);
  }

  // Clone the sequence as variant B
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = source as Record<string, unknown>;
  const { data: variant, error: insertErr } = await db
    .from("follow_up_sequences")
    .insert({
      ...rest,
      name: body.variant_name || `${(source as { name: string }).name} (Variant B)`,
      ab_test_group: groupId,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });

  // Clone steps too
  const { data: steps } = await db
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", body.source_sequence_id)
    .order("step_order", { ascending: true });

  if (steps?.length) {
    const clonedSteps = steps.map((s: Record<string, unknown>) => {
      const { id: _sid, created_at: _sca, sequence_id: _seqId, ...stepRest } = s;
      return { ...stepRest, sequence_id: (variant as { id: string }).id };
    });
    await db.from("sequence_steps").insert(clonedSteps);
  }

  return NextResponse.json({ variant, group_id: groupId }, { status: 201 });
}
