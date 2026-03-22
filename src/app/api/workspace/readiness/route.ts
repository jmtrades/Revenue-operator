export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id")?.trim();
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const auth = await requireWorkspaceAccess(req, workspaceId);
  if (auth) return auth;

  const db = getDb();
  const checks = [];

  // 1. Phone number configured
  try {
    const { count } = await db.from("phone_configs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active");
    checks.push({ key: "phone", label: "Phone number connected", passed: (count ?? 0) > 0, fixUrl: "/app/settings/phone", fixLabel: "Connect number" });
  } catch { checks.push({ key: "phone", label: "Phone number connected", passed: false, fixUrl: "/app/settings/phone", fixLabel: "Connect number" }); }

  // 2. Agent voice set
  try {
    const { data: ws } = await db.from("workspaces").select("voice_id, default_voice_id").eq("id", workspaceId).maybeSingle();
    const hasVoice = !!(ws?.voice_id || ws?.default_voice_id);
    checks.push({ key: "voice", label: "Agent voice selected", passed: hasVoice, fixUrl: "/app/settings/agent", fixLabel: "Choose voice" });
  } catch { checks.push({ key: "voice", label: "Agent voice selected", passed: false, fixUrl: "/app/settings/agent", fixLabel: "Choose voice" }); }

  // 3. Agent name/greeting set
  try {
    const { data: ws } = await db.from("workspaces").select("agent_name, greeting").eq("id", workspaceId).maybeSingle();
    const hasAgent = !!(ws?.agent_name && ws?.greeting);
    checks.push({ key: "agent", label: "Agent configured", passed: hasAgent, fixUrl: "/app/settings/agent", fixLabel: "Configure agent" });
  } catch { checks.push({ key: "agent", label: "Agent configured", passed: false, fixUrl: "/app/settings/agent", fixLabel: "Configure agent" }); }

  // 4. Integration connected
  try {
    const { count } = await db.from("workspace_integrations").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("status", "active");
    checks.push({ key: "integration", label: "Integration connected", passed: (count ?? 0) > 0, fixUrl: "/app/settings/integrations", fixLabel: "Connect" });
  } catch { checks.push({ key: "integration", label: "Integration connected", passed: false, fixUrl: "/app/settings/integrations", fixLabel: "Connect" }); }

  // 5. Test call completed
  try {
    const { count } = await db.from("call_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).limit(1);
    checks.push({ key: "test_call", label: "Test call completed", passed: (count ?? 0) > 0, fixUrl: "/app/settings/agent", fixLabel: "Make test call" });
  } catch { checks.push({ key: "test_call", label: "Test call completed", passed: false, fixUrl: "/app/settings/agent", fixLabel: "Make test call" }); }

  // 6. Billing configured
  try {
    const { data: ws } = await db.from("workspaces").select("stripe_customer_id").eq("id", workspaceId).maybeSingle();
    checks.push({ key: "billing", label: "Billing method set", passed: !!ws?.stripe_customer_id, fixUrl: "/app/settings/billing", fixLabel: "Add payment" });
  } catch { checks.push({ key: "billing", label: "Billing method set", passed: false, fixUrl: "/app/settings/billing", fixLabel: "Add payment" }); }

  return NextResponse.json({ checks });
}
