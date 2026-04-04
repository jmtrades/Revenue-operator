/**
 * List leads for workspace (GET). Create a lead (POST).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceSetting } from "@/lib/db/workspace-settings";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { logLeadCreated } from "@/lib/log/revenue-events";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizePhoneE164 } from "@/lib/phone/normalize";
import { assertSameOrigin } from "@/lib/http/csrf";
import { isSafeExternalUrl } from "@/lib/http/url-safety";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().min(1, "Phone is required").max(20),
  email: z.string().email().max(320).optional().or(z.literal("")),
  company: z.string().max(255).optional(),
  service_requested: z.string().max(500).optional(),
  source: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

function leadScoreFromInput(input: { name?: string; phone?: string; email?: string; service_requested?: string; source?: string }): number {
  let score = 0;
  if (input.name?.trim()) score += 10;
  if (input.phone?.trim()) score += 20;
  if (input.email?.trim()) score += 10;
  if (input.service_requested?.trim()) score += 15;
  const src = (input.source ?? "").toLowerCase();
  if (src === "inbound_call") score += 15;
  else if (src === "website") score += 10;
  else if (src === "referral") score += 20;
  return Math.min(100, score);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10), 500);

  const db = getDb();
  const { data: leads, error: leadsErr } = await db
    .from("leads")
    .select("id, name, email, phone, company, state, last_activity_at, opt_out, metadata")
    .eq("workspace_id", workspaceId)
    .order("last_activity_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (leadsErr) {
    log("error", "[leads] GET query failed:", { error: leadsErr.message });
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 });
  }

  const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
  const { data: deals } = leadIds.length
    ? await db.from("deals").select("lead_id, id, value_cents, status").in("lead_id", leadIds).neq("status", "lost")
    : { data: [] };
  const dealByLead = ((deals ?? []) as { lead_id: string; id: string; value_cents?: number }[]).reduce(
    (acc, d) => { acc[d.lead_id] = d; return acc; },
    {} as Record<string, { id: string; value_cents?: number }>
  );

  const withDeals = (leads ?? []).map((l: { id: string; name?: string; email?: string; phone?: string; company?: string; state: string; last_activity_at: string; opt_out?: boolean; metadata?: Record<string, unknown> }) => ({
    ...l,
    deal_id: dealByLead[l.id]?.id,
    value_cents: dealByLead[l.id]?.value_cents ?? 0,
  }));

  return NextResponse.json({ leads: withDeals });
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const rl = await checkRateLimit(`leads_create:${workspaceId}`, 50, 60000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createLeadSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
  }

  const { name, phone, email, company, service_requested, source, status, notes } = parsed.data;
  const phoneRaw = phone.trim();
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return NextResponse.json({ error: "Phone number must be between 10 and 15 digits" }, { status: 400 });
  }
  const phoneStr = normalizePhoneE164(phoneRaw);

  const state = (status ?? "new").toLowerCase().replace(/\s+/g, "_");
  // DB enum is UPPERCASE: NEW, CONTACTED, ENGAGED, QUALIFIED, BOOKED, SHOWED, WON, LOST, RETAIN, REACTIVATE, CLOSED
  const stateMap: Record<string, string> = {
    new: "NEW",
    contacted: "CONTACTED",
    engaged: "ENGAGED",
    qualified: "QUALIFIED",
    appointment_set: "BOOKED",
    booked: "BOOKED",
    showed: "SHOWED",
    won: "WON",
    lost: "LOST",
    retain: "RETAIN",
    reactivate: "REACTIVATE",
    closed: "CLOSED",
  };
  const dbState = stateMap[state] ?? "NEW";

  const score = leadScoreFromInput({ name, phone: phoneStr, email, service_requested, source });
  const metadata: Record<string, unknown> = {
    source: (source ?? "other").trim() || "other",
    service_requested: (service_requested ?? "").trim() || null,
    notes: (notes ?? "").trim() || null,
    score,
  };

  const db = getDb();
  const { data: lead, error } = await runWithWriteContextAsync("api", async () =>
    db
      .from("leads")
      .insert({
        workspace_id: workspaceId,
        name: name.trim(),
        phone: phoneStr,
        email: (email ?? "").trim() || null,
        company: (company ?? service_requested ?? "").trim() || null,
        state: dbState,
        metadata,
      })
      .select()
      .maybeSingle()
  );

  if (error) {
    const isWriteGuard = error instanceof Error && error.name === "UnsafeWriteError";
    log("error", "[leads] POST insert failed:", { error: isWriteGuard ? `UnsafeWriteError: ${(error as Error).message}` : (error as { message?: string })?.message ?? String(error) });
    return NextResponse.json({ error: "Could not process lead data. Please try again." }, { status: 500 });
  }

  const createdLead = lead as {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  logLeadCreated(workspaceId, createdLead.id, (metadata.source as string) ?? "app");

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("webhook_url")
      .eq("id", workspaceId)
      .maybeSingle();
    const webhookUrl =
      (ws as { webhook_url?: string | null } | null)?.webhook_url?.toString().trim() ??
      "";
    if (webhookUrl && isSafeExternalUrl(webhookUrl)) {
      // Fire-and-forget CRM webhook for lead capture (SSRF-safe)
      void fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "lead.created",
          timestamp: new Date().toISOString(),
          data: {
            lead: {
              id: createdLead.id,
              name: (createdLead.name ?? "").toString().trim() || null,
              phone: (createdLead.phone ?? "").toString().trim() || null,
              email: (createdLead.email ?? "").toString().trim() || null,
              score,
            },
            source: metadata.source,
          },
        }),
      }).catch((_err) => {
        // Webhook delivery failed; non-fatal
      });
    }
  } catch {
    // Do not block lead creation on webhook issues
  }

  // Enqueue outbound CRM sync for connected providers (Task 19)
  try {
    const { getConnectedCrmProviders, enqueueSync } = await import("@/lib/integrations/sync-engine");
    const providers = await getConnectedCrmProviders(workspaceId);
    for (const provider of providers) {
      await enqueueSync({
        workspaceId,
        provider,
        direction: "outbound",
        entityType: "lead",
        entityId: createdLead.id,
      });
    }
  } catch {
    // Do not block lead creation on sync enqueue
  }

  // Slack/Teams new lead notifications (Task 24)
  try {
    const { notifyNewLead } = await import("@/lib/integrations/slack");
    void notifyNewLead(workspaceId, {
      lead_id: createdLead.id,
      name: createdLead.name,
      phone: createdLead.phone,
      email: createdLead.email,
    }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
  } catch {
    // non-blocking
  }

  // Autonomous Brain: compute initial intelligence for new lead (non-blocking)
  try {
    const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
    void (async () => {
      try {
        const intelligence = await computeLeadIntelligence(workspaceId, createdLead.id);
        await persistLeadIntelligence(intelligence);
      } catch {
        // Non-blocking: brain will catch up via cron
      }
    })();
  } catch {
    // Non-blocking
  }

  // In-app notification center (Task 31)
  try {
    const { createWorkspaceNotification } = await import("@/lib/notifications");
    void createWorkspaceNotification(workspaceId, {
      type: "new_lead",
      title: "New lead",
      body: [createdLead.name, createdLead.phone].filter(Boolean).join(" · ") || "New lead captured",
      metadata: { lead_id: createdLead.id },
    }).catch((e: unknown) => { log("warn", "non-blocking-catch", { error: String(e) }); });
  } catch {
    // non-blocking
  }

  // Speed-to-lead: auto-callback within 60 seconds for eligible workspaces
  // Only triggers when lead has a phone number and source is website/form/api
  if (phoneStr && ["website", "form", "api", "landing_page"].includes(String(metadata.source))) {
    try {
      const { data: ws } = await db
        .from("workspaces")
        .select("plan_id")
        .eq("id", workspaceId)
        .maybeSingle();
      const wsRow = ws as { plan_id?: string | null } | null;
      // Speed-to-lead available on Business ($597) and above
      const eligiblePlans = ["business", "agency", "enterprise", "scale"];
      if (wsRow?.plan_id && eligiblePlans.includes(wsRow.plan_id)) {
        // Check if workspace has speed-to-lead enabled
        const stlValue = await getWorkspaceSetting(workspaceId, "speed_to_lead_enabled");
        const enabled = stlValue === "true";
        if (enabled) {
          // Enqueue outbound call with 60-second delay
          await db.from("action_queue").insert({
            workspace_id: workspaceId,
            type: "speed_to_lead_call",
            payload: {
              lead_id: createdLead.id,
              phone: phoneStr,
              name: (createdLead.name ?? "").toString().trim(),
            },
            scheduled_for: new Date(Date.now() + 60_000).toISOString(),
            status: "pending",
          });
        }
      }
    } catch {
      // Non-blocking: don't fail lead creation if speed-to-lead fails
    }
  }

  return NextResponse.json(lead);
}
import { log } from "@/lib/logger";
