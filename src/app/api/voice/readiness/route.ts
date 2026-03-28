/**
 * GET /api/voice/readiness — Call readiness diagnostic endpoint.
 * Returns a structured checklist of everything needed for live calling.
 * Used by the agent page, test-call UI, and admin diagnostics.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";

interface ReadinessCheck {
  key: string;
  label: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  action?: string;
  href?: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 401 });

  const db = getDb();
  const checks: ReadinessCheck[] = [];

  // 1. Phone number configured
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("proxy_number, status, outbound_from_number")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();

  const phoneNum = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
  checks.push({
    key: "phone_number",
    label: "Phone number",
    status: phoneNum ? "pass" : "fail",
    detail: phoneNum ? `Active: ${phoneNum}` : "No phone number configured",
    action: phoneNum ? undefined : "Purchase or port a phone number",
    href: phoneNum ? undefined : "/app/settings/phone",
  });

  // 2. Agent configured
  const { data: agents } = await db
    .from("agents")
    .select("id, name, voice_id, greeting, knowledge_base, is_active, test_call_completed, tested_at")
    .eq("workspace_id", workspaceId)
    .limit(1);

  const agent = (agents as Array<{
    id: string; name?: string; voice_id?: string; greeting?: string;
    knowledge_base?: { faq?: Array<{ q?: string; a?: string }> };
    is_active?: boolean; test_call_completed?: boolean; tested_at?: string;
  }> | null)?.[0];

  checks.push({
    key: "agent_configured",
    label: "AI agent",
    status: agent ? "pass" : "fail",
    detail: agent ? `${agent.name || "Unnamed"} — active` : "No agent configured",
    action: agent ? undefined : "Create your AI agent",
    href: agent ? undefined : "/app/agents",
  });

  // 3. Voice configured
  const voiceId = agent?.voice_id;
  checks.push({
    key: "voice_configured",
    label: "Voice",
    status: voiceId ? "pass" : "warn",
    detail: voiceId ? `Voice: ${voiceId}` : "Using default voice",
    action: voiceId ? undefined : "Choose a voice for your agent",
    href: voiceId ? undefined : "/app/settings/voices",
  });

  // 4. Greeting set
  const greeting = agent?.greeting;
  checks.push({
    key: "greeting_set",
    label: "Greeting",
    status: greeting && greeting.length > 10 ? "pass" : "warn",
    detail: greeting ? `"${greeting.slice(0, 60)}..."` : "Using default greeting",
    action: greeting ? undefined : "Customize your agent greeting",
    href: greeting ? undefined : "/app/agents",
  });

  // 5. Knowledge base
  const faq = agent?.knowledge_base?.faq ?? [];
  const faqCount = Array.isArray(faq) ? faq.filter((e) => (e?.q ?? "").trim()).length : 0;
  checks.push({
    key: "knowledge_base",
    label: "Knowledge base",
    status: faqCount >= 3 ? "pass" : faqCount > 0 ? "warn" : "fail",
    detail: `${faqCount} Q&A entries${faqCount < 3 ? " (minimum 3 recommended)" : ""}`,
    action: faqCount < 3 ? "Add more Q&A entries for better call quality" : undefined,
    href: faqCount < 3 ? "/app/knowledge" : undefined,
  });

  // 6. Voice server reachable
  const voiceServerUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
  let voiceServerOk = false;
  let voiceServerDetail = "VOICE_SERVER_URL not configured";
  if (voiceServerUrl) {
    try {
      const resp = await fetch(`${voiceServerUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const data = await resp.json() as { status?: string; version?: string };
        voiceServerOk = true;
        voiceServerDetail = `Healthy — v${data.version || "unknown"}`;
      } else {
        voiceServerDetail = `Unhealthy — HTTP ${resp.status}`;
      }
    } catch (e) {
      voiceServerDetail = `Unreachable: ${e instanceof Error ? e.message : "timeout"}`;
    }
  }
  checks.push({
    key: "voice_server",
    label: "Voice server",
    status: voiceServerOk ? "pass" : "fail",
    detail: voiceServerDetail,
    action: voiceServerOk ? undefined : "Contact support — voice server needs attention",
  });

  // 7. Telephony provider configured
  const hasTelnyxKey = !!process.env.TELNYX_API_KEY;
  const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasConnectionId = !!process.env.TELNYX_CONNECTION_ID;
  const provider = process.env.TELEPHONY_PROVIDER || (hasTelnyxKey ? "telnyx" : hasTwilioSid ? "twilio" : "none");
  const providerReady = provider === "telnyx" ? (hasTelnyxKey && hasConnectionId) : hasTwilioSid;
  checks.push({
    key: "telephony_provider",
    label: "Telephony provider",
    status: providerReady ? "pass" : "fail",
    detail: providerReady
      ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} — configured`
      : `${provider} — missing credentials`,
    action: providerReady ? undefined : "Contact support to configure telephony",
  });

  // 8. Webhook URL reachable
  const webhookBase = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const webhookPath = provider === "twilio" ? "/api/webhooks/twilio/voice" : "/api/webhooks/telnyx/voice";
  const webhookUrl = webhookBase ? `${webhookBase}${webhookPath}` : "";
  checks.push({
    key: "webhook_url",
    label: "Webhook URL",
    status: webhookBase ? "pass" : "fail",
    detail: webhookBase ? `${webhookUrl.slice(0, 60)}...` : "No WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL set",
    action: webhookBase ? undefined : "Configure webhook base URL",
  });

  // 9. Business context
  const { data: bizCtx } = await db
    .from("workspace_business_context")
    .select("business_name, faq, business_hours")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const bizName = (bizCtx as { business_name?: string } | null)?.business_name;
  const bizFaq = (bizCtx as { faq?: unknown[] } | null)?.faq;
  const bizFaqCount = Array.isArray(bizFaq) ? bizFaq.length : 0;
  checks.push({
    key: "business_context",
    label: "Business context",
    status: bizName && bizFaqCount > 0 ? "pass" : bizName ? "warn" : "fail",
    detail: bizName ? `${bizName} — ${bizFaqCount} FAQ entries` : "Business profile not configured",
    action: !bizName ? "Set up your business profile" : bizFaqCount === 0 ? "Add FAQ entries to business context" : undefined,
    href: !bizName ? "/app/settings/business" : undefined,
  });

  // 10. Test call status
  const testCompleted = agent?.test_call_completed || !!agent?.tested_at;
  checks.push({
    key: "test_call",
    label: "Test call",
    status: testCompleted ? "pass" : "warn",
    detail: testCompleted
      ? `Completed${agent?.tested_at ? ` at ${new Date(agent.tested_at).toLocaleString()}` : ""}`
      : "Not yet tested — run a test call to verify everything works",
    action: testCompleted ? undefined : "Run a test call",
    href: testCompleted ? undefined : "/app/agents",
  });

  // 11. Last call session (if any)
  const { data: lastSession } = await db
    .from("call_sessions")
    .select("id, call_started_at, call_ended_at, provider, metadata")
    .eq("workspace_id", workspaceId)
    .order("call_started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastCall = lastSession as {
    id?: string; call_started_at?: string; call_ended_at?: string;
    provider?: string; metadata?: { test_call?: boolean };
  } | null;

  if (lastCall) {
    checks.push({
      key: "last_call",
      label: "Last call",
      status: lastCall.call_ended_at ? "pass" : "warn",
      detail: `${lastCall.metadata?.test_call ? "Test call" : "Call"} on ${new Date(lastCall.call_started_at || "").toLocaleString()} via ${lastCall.provider || "unknown"}${lastCall.call_ended_at ? " — completed" : " — in progress or interrupted"}`,
    });
  }

  // Calculate overall readiness
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const totalChecks = checks.length;
  const readyToCall = failCount === 0;
  const percentage = Math.round((passCount / totalChecks) * 100);

  // Determine the most important next action
  const criticalFail = checks.find((c) => c.status === "fail" && c.action);
  const nextWarn = checks.find((c) => c.status === "warn" && c.action);
  const nextAction = criticalFail || nextWarn || null;

  return NextResponse.json({
    ready: readyToCall,
    percentage,
    pass_count: passCount,
    fail_count: failCount,
    total_checks: totalChecks,
    next_action: nextAction ? { label: nextAction.action, href: nextAction.href, key: nextAction.key } : null,
    checks,
  });
}
