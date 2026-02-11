/**
 * Network Intelligence Job
 * Nightly aggregation of privacy-safe patterns by industry bucket.
 * Feeds readiness engine as priors.
 */

import { getDb } from "@/lib/db/queries";

const INDUSTRY_BUCKETS = ["saas", "professional_services", "ecommerce", "other", "unknown"];

function toBucket(businessType: string | null | undefined): string {
  if (!businessType) return "unknown";
  const t = businessType.toLowerCase();
  if (t.includes("saas") || t.includes("software")) return "saas";
  if (t.includes("consulting") || t.includes("agency") || t.includes("services")) return "professional_services";
  if (t.includes("shop") || t.includes("store") || t.includes("retail")) return "ecommerce";
  return "other";
}

export async function runNetworkIntelligenceJob(): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Get workspace -> industry mapping
  const { data: settingsRows } = await db
    .from("settings")
    .select("workspace_id, business_type")
    .not("workspace_id", "is", null);

  const workspaceToIndustry = new Map<string, string>();
  for (const r of settingsRows ?? []) {
    const ws = (r as { workspace_id: string; business_type?: string }).workspace_id;
    const bt = (r as { business_type?: string }).business_type;
    workspaceToIndustry.set(ws, toBucket(bt));
  }

  // Reply decay curves: hours until user reply after outbound, bucketed
  const buckets: Record<string, Record<string, number>> = {};
  for (const b of INDUSTRY_BUCKETS) {
    buckets[b] = { "0-4": 0, "4-24": 0, "24-72": 0, "72+": 0, never: 0 };
  }

  const { data: outboundRows } = await db
    .from("outbound_messages")
    .select("workspace_id, lead_id, sent_at")
    .eq("status", "sent")
    .gte("sent_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .limit(5000);

  for (const om of outboundRows ?? []) {
    const ws = (om as { workspace_id: string }).workspace_id;
    const bucket = workspaceToIndustry.get(ws) ?? "unknown";
    const sentAt = new Date((om as { sent_at: string }).sent_at);

    // Find next user message in same conversation
    const { data: convRow } = await db
      .from("conversations")
      .select("id")
      .eq("lead_id", (om as { lead_id: string }).lead_id)
      .limit(1)
      .maybeSingle();
    const convId = (convRow as { id?: string })?.id;
    if (!convId) {
      buckets[bucket]!.never++;
      continue;
    }
    const { data: userMsg } = await db
      .from("messages")
      .select("created_at")
      .eq("conversation_id", convId)
      .eq("role", "user")
      .gt("created_at", sentAt.toISOString())
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const userAt = userMsg ? new Date((userMsg as { created_at: string }).created_at) : null;
    const hours = userAt ? (userAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60) : 9999;
    if (hours >= 72) buckets[bucket]!["72+"]++;
    else if (hours >= 24) buckets[bucket]!["24-72"]++;
    else if (hours >= 4) buckets[bucket]!["4-24"]++;
    else if (hours >= 0) buckets[bucket]!["0-4"]++;
    else buckets[bucket]!.never++;
  }

  for (const [bucket, curve] of Object.entries(buckets)) {
    const total = Object.values(curve).reduce((a, b) => a + b, 0);
    if (total < 5) continue; // Skip small samples
    await db.from("network_patterns").delete().eq("pattern_type", "reply_decay_curves").eq("industry_bucket", bucket);
    await db.from("network_patterns").insert({
      pattern_type: "reply_decay_curves",
      industry_bucket: bucket,
      aggregate_value: { curve, total },
      sample_count: total,
      computed_at: now.toISOString(),
    });
  }

  // Show rate: % of booked calls that showed (from leads state SHOWED vs BOOKED)
  const { data: leadStates } = await db
    .from("leads")
    .select("workspace_id, state")
    .in("state", ["BOOKED", "SHOWED"]);

  const showByBucket: Record<string, { showed: number; booked: number }> = {};
  for (const b of INDUSTRY_BUCKETS) showByBucket[b] = { showed: 0, booked: 0 };
  for (const l of leadStates ?? []) {
    const ws = (l as { workspace_id: string }).workspace_id;
    const bucket = workspaceToIndustry.get(ws) ?? "unknown";
    const st = (l as { state: string }).state;
    if (st === "SHOWED") showByBucket[bucket]!.showed++;
    if (st === "BOOKED" || st === "SHOWED") showByBucket[bucket]!.booked++;
  }

  for (const [bucket, counts] of Object.entries(showByBucket)) {
    if (counts.booked < 3) continue;
    const rate = counts.booked > 0 ? counts.showed / counts.booked : 0;
    await db.from("network_patterns").delete().eq("pattern_type", "show_rate").eq("industry_bucket", bucket);
    await db.from("network_patterns").insert({
      pattern_type: "show_rate",
      industry_bucket: bucket,
      aggregate_value: { rate, showed: counts.showed, booked: counts.booked },
      sample_count: counts.booked,
      computed_at: now.toISOString(),
    });
  }

  // Optimal follow-up intervals: median hours between outbound and engagement (simplified)
  const { data: replyBaseline } = await db
    .from("reply_rate_baseline")
    .select("workspace_id, baseline_value")
    .order("created_at", { ascending: false })
    .limit(500);

  const intervalByBucket: Record<string, number[]> = {};
  for (const b of INDUSTRY_BUCKETS) intervalByBucket[b] = [];
  for (const r of replyBaseline ?? []) {
    const ws = (r as { workspace_id: string }).workspace_id;
    const bucket = workspaceToIndustry.get(ws) ?? "unknown";
    const val = Number((r as { baseline_value: number }).baseline_value);
    if (val > 0 && val <= 1) intervalByBucket[bucket]!.push(val * 24); // rough hours
  }
  for (const [bucket, vals] of Object.entries(intervalByBucket)) {
    if (vals.length < 3) continue;
    vals.sort((a, b) => a - b);
    const median = vals[Math.floor(vals.length / 2)] ?? 24;
    await db.from("network_patterns").delete().eq("pattern_type", "optimal_followup_intervals").eq("industry_bucket", bucket);
    await db.from("network_patterns").insert({
      pattern_type: "optimal_followup_intervals",
      industry_bucket: bucket,
      aggregate_value: { median_hours: median, p25: vals[Math.floor(vals.length * 0.25)], p75: vals[Math.floor(vals.length * 0.75)] },
      sample_count: vals.length,
      computed_at: now.toISOString(),
    });
  }

  // Recovery success: REACTIVATE -> WON rate
  const { data: reactLeads } = await db
    .from("leads")
    .select("id, workspace_id")
    .eq("state", "REACTIVATE");
  const { data: wonDeals } = await db.from("deals").select("lead_id").eq("status", "won");
  const reactWon = new Set((wonDeals ?? []).map((d) => (d as { lead_id: string }).lead_id));
  const recoveryByBucket: Record<string, { won: number; total: number }> = {};
  for (const b of INDUSTRY_BUCKETS) recoveryByBucket[b] = { won: 0, total: 0 };
  for (const l of reactLeads ?? []) {
    const ws = (l as { workspace_id: string }).workspace_id;
    const bucket = workspaceToIndustry.get(ws) ?? "unknown";
    recoveryByBucket[bucket]!.total++;
    if (reactWon.has((l as { id: string }).id)) recoveryByBucket[bucket]!.won++;
  }
  for (const [bucket, counts] of Object.entries(recoveryByBucket)) {
    if (counts.total < 2) continue;
    const rate = counts.total > 0 ? counts.won / counts.total : 0;
    await db.from("network_patterns").delete().eq("pattern_type", "recovery_success").eq("industry_bucket", bucket);
    await db.from("network_patterns").insert({
      pattern_type: "recovery_success",
      industry_bucket: bucket,
      aggregate_value: { rate, won: counts.won, total: counts.total },
      sample_count: counts.total,
      computed_at: now.toISOString(),
    });
  }
}
