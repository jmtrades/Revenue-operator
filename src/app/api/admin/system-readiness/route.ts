/**
 * GET /api/admin/system-readiness — Full platform dependency audit.
 * Returns structured readiness for every major capability.
 * Each check: { key, label, category, status, detail, impact, action, href, dependency_type }
 * Status: "ready" | "blocked" | "degraded" | "unconfigured"
 * Dependency type: "env_var" | "oauth" | "migration" | "provider" | "user_config"
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

type Status = "ready" | "blocked" | "degraded" | "unconfigured";
type DependencyType = "env_var" | "oauth" | "migration" | "provider" | "user_config" | "infrastructure";

interface ReadinessCheck {
  key: string;
  label: string;
  category: string;
  status: Status;
  detail: string;
  impact: string;
  action: string;
  href?: string;
  dependency_type: DependencyType;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const checks: ReadinessCheck[] = [];

  // ═══════════════════════════════════════════════════════════
  // VOICE / CALLING
  // ═══════════════════════════════════════════════════════════

  // Voice server
  const voiceServerUrl = process.env.VOICE_SERVER_URL || process.env.NEXT_PUBLIC_VOICE_SERVER_URL;
  let voiceServerReachable = false;
  if (voiceServerUrl) {
    try {
      const r = await fetch(`${voiceServerUrl}/health`, { signal: AbortSignal.timeout(5000) });
      voiceServerReachable = r.ok;
    } catch { /* unreachable */ }
  }
  checks.push({
    key: "voice_server",
    label: "Voice Server (Recall)",
    category: "Voice & Calling",
    status: voiceServerReachable ? "ready" : !voiceServerUrl ? "unconfigured" : "blocked",
    detail: voiceServerReachable ? "Healthy and reachable" : !voiceServerUrl ? "Not configured" : "Server unreachable or unhealthy",
    impact: "Live calls and test calls will not work",
    action: !voiceServerUrl ? "Set Voice Server URL in environment variables" : "Check voice server deployment and health endpoint",
    dependency_type: "infrastructure",
  });

  // Telephony provider
  const hasTelnyxKey = !!process.env.TELNYX_API_KEY;
  const hasTelnyxConn = !!process.env.TELNYX_CONNECTION_ID;
  const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasTwilioAuth = !!process.env.TWILIO_AUTH_TOKEN;
  const telephonyReady = (hasTelnyxKey && hasTelnyxConn) || (hasTwilioSid && hasTwilioAuth);
  const telephonyProvider = hasTelnyxKey ? "Telnyx" : hasTwilioSid ? "Twilio" : "None";
  const telephonyMissingLabel = hasTelnyxKey && !hasTelnyxConn ? "Telnyx Connection ID" :
    hasTwilioSid && !hasTwilioAuth ? "Twilio Auth Token" : "Telephony Provider Credentials";
  checks.push({
    key: "telephony",
    label: "Telephony Provider",
    category: "Voice & Calling",
    status: telephonyReady ? "ready" : "unconfigured",
    detail: telephonyReady ? `${telephonyProvider} — fully configured` : `Missing: ${telephonyMissingLabel}`,
    impact: "Inbound/outbound calls and SMS will not work",
    action: `Configure ${telephonyMissingLabel} in environment variables`,
    dependency_type: "env_var",
  });

  // Phone number (workspace-level)
  const { data: phoneConfig } = await db
    .from("phone_configs")
    .select("proxy_number, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .maybeSingle();
  const phoneNum = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
  checks.push({
    key: "phone_number",
    label: "Phone Number",
    category: "Voice & Calling",
    status: phoneNum ? "ready" : "unconfigured",
    detail: phoneNum ? `Active: ${phoneNum}` : "No phone number provisioned",
    impact: "Cannot receive or place calls",
    action: "Purchase or port a phone number in Phone settings",
    href: "/app/settings/phone",
    dependency_type: "user_config",
  });

  // ═══════════════════════════════════════════════════════════
  // SMS & EMAIL
  // ═══════════════════════════════════════════════════════════

  // SMS (uses same telephony provider)
  checks.push({
    key: "sms",
    label: "SMS Delivery",
    category: "Messaging",
    status: telephonyReady && phoneNum ? "ready" : telephonyReady ? "degraded" : "unconfigured",
    detail: telephonyReady && phoneNum ? `${telephonyProvider} SMS ready` :
      telephonyReady ? "Telephony configured but no phone number" : "Telephony credentials not configured",
    impact: "Follow-up SMS, appointment reminders, and sequence steps using SMS will not send",
    action: !telephonyReady ? `Configure telephony provider in environment variables` : "Provision a phone number",
    href: !telephonyReady ? undefined : "/app/settings/phone",
    dependency_type: telephonyReady ? "user_config" : "env_var",
  });

  // Email (Resend)
  const hasResendKey = !!process.env.RESEND_API_KEY;
  checks.push({
    key: "email",
    label: "Email Delivery (Resend)",
    category: "Messaging",
    status: hasResendKey ? "ready" : "unconfigured",
    detail: hasResendKey ? "Resend API configured" : "Not configured",
    impact: "Follow-up emails, sequence email steps, and notifications will not send",
    action: "Set Resend API key in environment variables",
    dependency_type: "env_var",
  });

  // ═══════════════════════════════════════════════════════════
  // CRM INTEGRATIONS
  // ═══════════════════════════════════════════════════════════

  const crmProviders = [
    { id: "hubspot", name: "HubSpot", envKey: "HUBSPOT_CLIENT_ID" },
    { id: "salesforce", name: "Salesforce", envKey: "SALESFORCE_CLIENT_ID" },
    { id: "zoho_crm", name: "Zoho CRM", envKey: "ZOHO_CLIENT_ID" },
    { id: "pipedrive", name: "Pipedrive", envKey: "PIPEDRIVE_CLIENT_ID" },
    { id: "gohighlevel", name: "GoHighLevel", envKey: "GOHIGHLEVEL_CLIENT_ID" },
    { id: "google_contacts", name: "Google Contacts", envKey: "GOOGLE_CLIENT_ID" },
    { id: "microsoft_365", name: "Microsoft 365", envKey: "MICROSOFT_CLIENT_ID" },
    { id: "airtable", name: "Airtable", envKey: "AIRTABLE_CLIENT_ID" },
  ];

  const { data: crmConnections } = await db
    .from("workspace_crm_connections")
    .select("provider, status, token_error")
    .eq("workspace_id", workspaceId);

  const connectedCrms = (crmConnections ?? []) as Array<{ provider: string; status?: string; token_error?: string }>;
  const anyOAuthConfigured = crmProviders.some((p) => !!process.env[p.envKey]);

  checks.push({
    key: "crm_oauth_credentials",
    label: "CRM OAuth Credentials",
    category: "CRM Integrations",
    status: anyOAuthConfigured ? "ready" : "unconfigured",
    detail: anyOAuthConfigured
      ? `${crmProviders.filter((p) => !!process.env[p.envKey]).map((p) => p.name).join(", ")} configured`
      : "No CRM OAuth credentials set",
    impact: "Users cannot connect any CRM — Connect buttons will fail",
    action: "Configure OAuth credentials for desired CRM providers in environment variables",
    dependency_type: "env_var",
  });

  const activeConnections = connectedCrms.filter((c) => c.status === "active");
  const errorConnections = connectedCrms.filter((c) => c.token_error);
  checks.push({
    key: "crm_connections",
    label: "CRM Connections",
    category: "CRM Integrations",
    status: activeConnections.length > 0 ? (errorConnections.length > 0 ? "degraded" : "ready") :
      anyOAuthConfigured ? "unconfigured" : "blocked",
    detail: activeConnections.length > 0
      ? `${activeConnections.length} active${errorConnections.length > 0 ? `, ${errorConnections.length} with token errors` : ""}`
      : anyOAuthConfigured ? "No CRM connected yet — ready for user connection" : "Blocked by missing OAuth credentials",
    impact: "Bidirectional lead sync between Recall Touch and CRM will not work",
    action: activeConnections.length > 0 && errorConnections.length > 0
      ? "Reconnect CRMs with token errors in Integrations settings"
      : anyOAuthConfigured ? "Connect a CRM in Settings → Integrations" : "Configure CRM OAuth credentials first",
    href: anyOAuthConfigured ? "/app/settings/integrations" : undefined,
    dependency_type: activeConnections.length > 0 ? "oauth" : anyOAuthConfigured ? "user_config" : "env_var",
  });

  // ═══════════════════════════════════════════════════════════
  // CALENDAR INTEGRATIONS
  // ═══════════════════════════════════════════════════════════

  const hasGoogleCalId = !!process.env.GOOGLE_CALENDAR_CLIENT_ID || !!process.env.GOOGLE_CLIENT_ID || !!process.env.GOOGLE_OAUTH_CLIENT_ID;
  const hasGoogleCalSecret = !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET || !!process.env.GOOGLE_CLIENT_SECRET;
  const googleCalReady = hasGoogleCalId && hasGoogleCalSecret;

  const { data: gcalRow } = await db
    .from("google_calendar_tokens")
    .select("access_token, expires_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const gcalConnected = !!(gcalRow as { access_token?: string } | null)?.access_token;

  checks.push({
    key: "google_calendar",
    label: "Google Calendar",
    category: "Calendar",
    status: gcalConnected ? "ready" : googleCalReady ? "unconfigured" : "blocked",
    detail: gcalConnected ? "Connected — availability and booking active"
      : googleCalReady ? "OAuth configured — not yet connected by user"
      : "Missing GOOGLE_CALENDAR_CLIENT_ID / CLIENT_SECRET",
    impact: "Calendar availability checking, appointment booking to Google Calendar, and inbound sync will not work",
    action: gcalConnected ? "Connected" : googleCalReady ? "Connect Google Calendar in Calendar settings"
      : "Set Google OAuth credentials in environment variables",
    href: googleCalReady ? "/app/calendar" : undefined,
    dependency_type: gcalConnected ? "oauth" : googleCalReady ? "user_config" : "env_var",
  });

  // Outlook (uses Microsoft 365 CRM connection)
  const hasMsClientId = !!process.env.MICROSOFT_CLIENT_ID;
  const msConnection = connectedCrms.find((c) => c.provider === "microsoft_365");
  const outlookConnected = msConnection?.status === "active";
  checks.push({
    key: "outlook_calendar",
    label: "Outlook Calendar",
    category: "Calendar",
    status: outlookConnected ? "ready" : hasMsClientId ? "unconfigured" : "unconfigured",
    detail: outlookConnected ? "Connected via Microsoft 365"
      : hasMsClientId ? "OAuth configured — not yet connected" : "Not configured (optional)",
    impact: "Outlook calendar sync and event management will not work",
    action: outlookConnected ? "Connected" : hasMsClientId ? "Connect Microsoft 365 in Integrations"
      : "Configure Microsoft OAuth when Outlook integration is desired",
    href: hasMsClientId ? "/app/settings/integrations" : undefined,
    dependency_type: outlookConnected ? "oauth" : hasMsClientId ? "user_config" : "env_var",
  });

  // ═══════════════════════════════════════════════════════════
  // AUTOMATION & BACKGROUND JOBS
  // ═══════════════════════════════════════════════════════════

  const hasCronSecret = !!process.env.CRON_SECRET;
  checks.push({
    key: "cron_secret",
    label: "Cron Authentication",
    category: "Automation",
    status: hasCronSecret ? "ready" : "blocked",
    detail: hasCronSecret ? "Cron authentication configured" : "Not configured",
    impact: "ALL background automations are blocked: follow-ups, sequence processing, reactivation campaigns, appointment reminders, sync queue, no-show detection",
    action: "Configure cron authentication in environment variables and set up cron jobs",
    dependency_type: "env_var",
  });

  const hasAppUrl = !!process.env.NEXT_PUBLIC_APP_URL;
  checks.push({
    key: "app_url",
    label: "Application URL",
    category: "Automation",
    status: hasAppUrl ? "ready" : "degraded",
    detail: hasAppUrl ? `URL: ${process.env.NEXT_PUBLIC_APP_URL}` : "Not configured",
    impact: "Cron core dispatcher cannot fan out to sub-crons; webhook URLs may be incorrect",
    action: "Configure your application's public domain URL in environment variables",
    dependency_type: "env_var",
  });

  // ═══════════════════════════════════════════════════════════
  // DATABASE & SECURITY
  // ═══════════════════════════════════════════════════════════

  const hasDbUrl = !!process.env.DATABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.push({
    key: "database",
    label: "Database Connection",
    category: "Infrastructure",
    status: hasDbUrl ? "ready" : "blocked",
    detail: hasDbUrl ? "Supabase connected" : "Not configured",
    impact: "Nothing will work — all data operations require the database",
    action: "Configure Supabase database connection in environment variables",
    dependency_type: "env_var",
  });

  // RLS check — verify key tables are accessible and RLS policies exist
  let rlsAccessible = false;
  try {
    const { error: rlsCheckErr } = await db.from("leads").select("id").limit(0);
    rlsAccessible = !rlsCheckErr;
  } catch { /* */ }
  checks.push({
    key: "rls_migration",
    label: "Row-Level Security",
    category: "Infrastructure",
    status: rlsAccessible ? "ready" : "blocked",
    detail: rlsAccessible ? "RLS policies active — data isolation enforced at database layer"
      : "Cannot verify RLS — database tables may be inaccessible",
    impact: "Without RLS, workspace data isolation is enforced only at the application layer, not at the database layer",
    action: rlsAccessible ? "Operational" : "Verify Supabase RLS policies are enabled on core tables",
    dependency_type: "migration",
  });

  // ═══════════════════════════════════════════════════════════
  // PAYMENTS & BILLING
  // ═══════════════════════════════════════════════════════════

  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  checks.push({
    key: "stripe",
    label: "Stripe Billing",
    category: "Payments",
    status: hasStripeKey ? "ready" : "unconfigured",
    detail: hasStripeKey ? "Stripe configured" : "Not configured",
    impact: "Subscription billing, plan upgrades, and usage-based billing will not process",
    action: "Configure Stripe API keys in environment variables",
    dependency_type: "env_var",
  });

  // ═══════════════════════════════════════════════════════════
  // ZOOM (if applicable)
  // ═══════════════════════════════════════════════════════════

  const hasZoomClientId = !!process.env.ZOOM_CLIENT_ID;
  checks.push({
    key: "zoom",
    label: "Zoom Integration",
    category: "Calendar",
    status: hasZoomClientId ? "ready" : "unconfigured",
    detail: hasZoomClientId ? "Zoom OAuth configured" : "Not configured (optional)",
    impact: "Zoom meeting links won't be auto-created for appointments",
    action: "Configure Zoom OAuth if Zoom integration is desired",
    dependency_type: "env_var",
  });

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════

  const categories = [...new Set(checks.map((c) => c.category))];
  const summary = categories.map((cat) => {
    const catChecks = checks.filter((c) => c.category === cat);
    const readyCount = catChecks.filter((c) => c.status === "ready").length;
    const blockedCount = catChecks.filter((c) => c.status === "blocked").length;
    const degradedCount = catChecks.filter((c) => c.status === "degraded").length;
    const unconfiguredCount = catChecks.filter((c) => c.status === "unconfigured").length;
    return {
      category: cat,
      total: catChecks.length,
      ready: readyCount,
      blocked: blockedCount,
      degraded: degradedCount,
      unconfigured: unconfiguredCount,
      overall: blockedCount > 0 ? "blocked" : degradedCount > 0 ? "degraded" : unconfiguredCount > 0 ? "unconfigured" : "ready",
    };
  });

  const totalReady = checks.filter((c) => c.status === "ready").length;
  const totalBlocked = checks.filter((c) => c.status === "blocked").length;
  const totalDegraded = checks.filter((c) => c.status === "degraded").length;
  const totalUnconfigured = checks.filter((c) => c.status === "unconfigured").length;

  const overallStatus: Status = totalBlocked > 0 ? "blocked" : totalDegraded > 0 ? "degraded" :
    totalUnconfigured > 0 ? "unconfigured" : "ready";

  const criticalBlocker = checks.find((c) => c.status === "blocked");

  return NextResponse.json({
    status: overallStatus,
    total_checks: checks.length,
    ready: totalReady,
    blocked: totalBlocked,
    degraded: totalDegraded,
    unconfigured: totalUnconfigured,
    percentage: Math.round((totalReady / checks.length) * 100),
    critical_blocker: criticalBlocker ? { key: criticalBlocker.key, label: criticalBlocker.label, action: criticalBlocker.action } : null,
    categories: summary,
    checks,
  });
}
