/**
 * List leads for workspace (GET). Create a lead (POST).
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { getWorkspaceSetting } from "@/lib/db/workspace-settings";
import { logLeadCreated } from "@/lib/log/revenue-events";
import { normalizePhoneE164 } from "@/lib/phone/normalize";
import { isSafeExternalUrl } from "@/lib/http/url-safety";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { log } from "@/lib/logger";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiBadRequest, apiInternalError, apiValidationError } from "@/lib/api/errors";
import { backgroundTask, backgroundTasks } from "@/lib/async/safe-background";

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

export const GET = withWorkspace(async (req: NextRequest, ctx: WorkspaceContext) => {
  const { workspaceId } = ctx;
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
    log("error", "leads.get_failed", { error: leadsErr.message, workspace_id: workspaceId });
    return apiInternalError("Failed to load leads");
  }

  const leadIds = (leads ?? []).map((l: { id: string }) => l.id);
  const { data: deals } = leadIds.length
    ? await db.from("deals").select("lead_id, id, value_cents, status").in("lead_id", leadIds).neq("status", "lost")
    : { data: [] };
  const dealByLead = ((deals ?? []) as { lead_id: string; id: string; value_cents?: number }[]).reduce(
    (acc, d) => { acc[d.lead_id] = d; return acc; },
    {} as Record<string, { id: string; value_cents?: number }>,
  );

  const withDeals = (leads ?? []).map((l: { id: string; name?: string; email?: string; phone?: string; company?: string; state: string; last_activity_at: string; opt_out?: boolean; metadata?: Record<string, unknown> }) => ({
    ...l,
    deal_id: dealByLead[l.id]?.id,
    value_cents: dealByLead[l.id]?.value_cents ?? 0,
  }));

  return apiOk({ leads: withDeals });
}, { workspaceFrom: "query" });

export const POST = withWorkspace(
  async (req: NextRequest, ctx: WorkspaceContext) => {
    const { workspaceId } = ctx;

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return apiBadRequest("Invalid JSON");
    }

    const parsed = createLeadSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return apiValidationError(firstError?.message ?? "Invalid input");
    }

    const { name, phone, email, company, service_requested, source, status, notes } = parsed.data;
    const phoneRaw = phone.trim();
    const phoneDigits = phoneRaw.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return apiValidationError("Phone number must be between 10 and 15 digits");
    }
    const phoneStr = normalizePhoneE164(phoneRaw);

    const state = (status ?? "new").toLowerCase().replace(/\s+/g, "_");
    const stateMap: Record<string, string> = {
      new: "NEW", contacted: "CONTACTED", engaged: "ENGAGED", qualified: "QUALIFIED",
      appointment_set: "BOOKED", booked: "BOOKED", showed: "SHOWED", won: "WON",
      lost: "LOST", retain: "RETAIN", reactivate: "REACTIVATE", closed: "CLOSED",
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
          status: dbState,
          metadata,
        })
        .select()
        .maybeSingle(),
    );

    if (error) {
      const isWriteGuard = error instanceof Error && error.name === "UnsafeWriteError";
      log("error", "leads.create_failed", {
        error: isWriteGuard ? `UnsafeWriteError: ${(error as Error).message}` : (error as { message?: string })?.message ?? String(error),
        workspace_id: workspaceId,
      });
      return apiInternalError("Could not process lead data. Please try again.");
    }

    const createdLead = lead as {
      id: string;
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    };

    logLeadCreated(workspaceId, createdLead.id, (metadata.source as string) ?? "app");

    // ── Background tasks: webhook, CRM sync, notifications, intelligence ──
    const leadContext = { workspace_id: workspaceId, lead_id: createdLead.id };

    backgroundTasks([
      {
        name: "crm_webhook",
        fn: async () => {
          const { data: ws } = await db.from("workspaces").select("webhook_url").eq("id", workspaceId).maybeSingle();
          const webhookUrl = (ws as { webhook_url?: string | null } | null)?.webhook_url?.toString().trim() ?? "";
          if (webhookUrl && isSafeExternalUrl(webhookUrl)) {
            await fetch(webhookUrl, {
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
            });
          }
        },
        context: leadContext,
      },
      {
        name: "crm_sync",
        fn: async () => {
          const { getConnectedCrmProviders, enqueueSync } = await import("@/lib/integrations/sync-engine");
          const providers = await getConnectedCrmProviders(workspaceId);
          for (const provider of providers) {
            await enqueueSync({ workspaceId, provider, direction: "outbound", entityType: "lead", entityId: createdLead.id });
          }
        },
        context: leadContext,
      },
      {
        name: "slack_notification",
        fn: async () => {
          const { notifyNewLead } = await import("@/lib/integrations/slack");
          await notifyNewLead(workspaceId, {
            lead_id: createdLead.id,
            name: createdLead.name,
            phone: createdLead.phone,
            email: createdLead.email,
          });
        },
        context: leadContext,
      },
      {
        name: "lead_intelligence",
        fn: async () => {
          const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
          const intelligence = await computeLeadIntelligence(workspaceId, createdLead.id);
          await persistLeadIntelligence(intelligence);
        },
        context: leadContext,
      },
      {
        name: "in_app_notification",
        fn: async () => {
          const { createWorkspaceNotification } = await import("@/lib/notifications");
          await createWorkspaceNotification(workspaceId, {
            type: "new_lead",
            title: "New lead",
            body: [createdLead.name, createdLead.phone].filter(Boolean).join(" · ") || "New lead captured",
            metadata: { lead_id: createdLead.id },
          });
        },
        context: leadContext,
      },
    ]);

    // Speed-to-lead: auto-callback within 60 seconds for eligible workspaces
    if (phoneStr && ["website", "form", "api", "landing_page"].includes(String(metadata.source))) {
      backgroundTask("speed_to_lead_enqueue", async () => {
        const { data: ws } = await db.from("workspaces").select("plan_id").eq("id", workspaceId).maybeSingle();
        const wsRow = ws as { plan_id?: string | null } | null;
        const eligiblePlans = ["business", "agency", "enterprise", "scale"];
        if (wsRow?.plan_id && eligiblePlans.includes(wsRow.plan_id)) {
          const stlValue = await getWorkspaceSetting(workspaceId, "speed_to_lead_enabled");
          if (stlValue === "true") {
            await db.from("action_queue").insert({
              workspace_id: workspaceId,
              type: "speed_to_lead_call",
              payload: { lead_id: createdLead.id, phone: phoneStr, name: (createdLead.name ?? "").toString().trim() },
              scheduled_for: new Date(Date.now() + 60_000).toISOString(),
              status: "pending",
            });
          }
        }
      }, { context: leadContext });
    }

    return apiOk(lead, 201);
  },
  {
    workspaceFrom: "session",
    rateLimit: { key: "leads_create:{workspaceId}", max: 50, windowMs: 60_000 },
  },
);
