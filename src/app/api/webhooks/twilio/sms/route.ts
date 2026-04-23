import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { fireWebhookEvent } from "@/lib/integrations/webhook-events";
import {
  verifyTwilioRequest,
  buildTwilioCandidateUrls,
  TwilioSignatureConfigError,
} from "@/lib/security/twilio-signature";
// Phase 78 / Task 7.2 — STOP keyword must ALSO hang up any call still
// in-flight for this phone in this workspace, not just mark the lead
// opted-out. See src/lib/voice/revocation.ts for the full contract.
import { revokeAndHangup } from "@/lib/voice/revocation";

export const dynamic = "force-dynamic";

// STOP words per TCPA/CTIA
const STOP_WORDS = new Set([
  "stop",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "stopall",
  "opt-out",
  "optout",
]);

// NPS score extraction
function extractNpsScore(body: string): number | null {
  const trimmed = body.trim();
  // Check for just a number 0-10
  const match = trimmed.match(/^(\d{1,2})$/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 0 && num <= 10) return num;
  }
  return null;
}

function classifyNps(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const params = Object.fromEntries(
      new URLSearchParams(bodyText)
    ) as Record<string, string>;

    // Phase 78/Phase 4 (P0-4): always-on Twilio signature verification — runs
    // in every environment, fail-closed on missing TWILIO_AUTH_TOKEN.
    const sig = request.headers.get("x-twilio-signature");
    if (!verifyTwilioRequest(buildTwilioCandidateUrls(request), params, sig)) {
      log("warn", "sms_webhook.invalid_signature", {});
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const from = params.From ?? "";
    const _to = params.To ?? "";
    const body = (params.Body ?? "").trim();
    const messageSid = params.MessageSid ?? "";

    if (!from || !body) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const db = getDb();
    const normalizedPhone = from.replace(/[^\d+]/g, "");

    log("info", "sms_webhook.received", {
      from: normalizedPhone,
      bodyLength: body.length,
      messageSid,
    });

    // 1. STOP/Unsubscribe handling (TCPA mandatory)
    if (STOP_WORDS.has(body.toLowerCase().trim())) {
      // Find ALL leads with this phone and mark sms_consent = false
      const { data: leads } = await db
        .from("leads")
        .select("id, workspace_id, metadata")
        .eq("phone", normalizedPhone);

      const leadList = (leads ?? []) as Array<{
        id: string;
        workspace_id: string;
        metadata?: Record<string, unknown>;
      }>;

      // Import unified opt-out recorder
      const { recordOptOut } = await import("@/lib/lead-opt-out");

      for (const lead of leadList) {
        const meta = lead.metadata ?? {};
        await db
          .from("leads")
          .update({
            opt_out: true,
            metadata: {
              ...meta,
              sms_consent: false,
              sms_opted_out_at: new Date().toISOString(),
              sms_opt_out_message_sid: messageSid,
            },
          })
          .eq("id", lead.id);
        // Also record in canonical lead_opt_out table for unified checks
        await recordOptOut(lead.workspace_id, `lead:${lead.id}`, lead.id);
      }

      // Phase 78 / Task 7.2 — STOP during an active call must immediately
      // hang the call up via Twilio REST, not just mark the lead opted-out.
      // Dedupe workspaces across leads (multi-workspace collisions on a
      // shared phone are rare but possible) and fail-safe: never let a
      // hangup error block the CTIA confirmation reply to the caller.
      const workspacesTouched = Array.from(
        new Set(leadList.map((l) => l.workspace_id)),
      );
      for (const wsId of workspacesTouched) {
        try {
          await revokeAndHangup(wsId, normalizedPhone);
        } catch (err) {
          log("error", "sms_webhook.revoke_and_hangup_failed", {
            workspaceId: wsId,
            phone: normalizedPhone,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      log("info", "sms_webhook.opt_out", {
        phone: normalizedPhone,
        leadsUpdated: leadList.length,
      });

      // Reply with confirmation per CTIA guidelines
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been unsubscribed and will no longer receive messages. Reply START to re-subscribe.</Message></Response>',
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // 2. START/re-subscribe handling
    if (body.toLowerCase().trim() === "start") {
      const { data: leads } = await db
        .from("leads")
        .select("id, workspace_id, metadata")
        .eq("phone", normalizedPhone);

      const leadList = (leads ?? []) as Array<{
        id: string;
        workspace_id: string;
        metadata?: Record<string, unknown>;
      }>;

      // Import unified opt-out remover
      const { removeOptOut } = await import("@/lib/lead-opt-out");

      for (const lead of leadList) {
        const meta = lead.metadata ?? {};
        await db
          .from("leads")
          .update({
            opt_out: false,
            metadata: {
              ...meta,
              sms_consent: true,
              sms_resubscribed_at: new Date().toISOString(),
            },
          })
          .eq("id", lead.id);
        // Also remove from canonical lead_opt_out table
        await removeOptOut(lead.workspace_id, `lead:${lead.id}`, lead.id);
      }

      log("info", "sms_webhook.resubscribe", { phone: normalizedPhone });

      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been re-subscribed to messages. Reply STOP at any time to unsubscribe.</Message></Response>',
        { status: 200, headers: { "Content-Type": "text/xml" } }
      );
    }

    // 3. NPS score capture
    const npsScore = extractNpsScore(body);
    if (npsScore !== null) {
      const classification = classifyNps(npsScore);

      // Find the lead and their most recent call session that sent NPS
      const { data: lead } = await db
        .from("leads")
        .select("id, workspace_id, metadata")
        .eq("phone", normalizedPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lead) {
        const leadData = lead as {
          id: string;
          workspace_id: string;
          metadata?: Record<string, unknown>;
        };
        const meta = leadData.metadata ?? {};
        const existingNps = (meta.nps_scores ?? []) as Array<
          Record<string, unknown>
        >;

        const npsEntry = {
          score: npsScore,
          classification,
          received_at: new Date().toISOString(),
          message_sid: messageSid,
        };

        await db
          .from("leads")
          .update({
            metadata: {
              ...meta,
              nps_scores: [...existingNps, npsEntry],
              latest_nps_score: npsScore,
              latest_nps_classification: classification,
              latest_nps_date: new Date().toISOString(),
            },
          })
          .eq("id", leadData.id);

        // Store workspace-level NPS aggregation
        try {
          const { data: wsMeta } = await db
            .from("workspaces")
            .select("metadata")
            .eq("id", leadData.workspace_id)
            .maybeSingle();

          const wsMetaData = (
            (
              wsMeta as {
                metadata?: Record<string, unknown>;
              } | null
            )?.metadata ?? {}
          ) as Record<string, unknown>;
          const npsHistory = (wsMetaData.nps_responses ?? []) as Array<
            Record<string, unknown>
          >;

          await db
            .from("workspaces")
            .update({
              metadata: {
                ...wsMetaData,
                nps_responses: [
                  ...npsHistory.slice(-99),
                  {
                    ...npsEntry,
                    lead_id: leadData.id,
                    phone: normalizedPhone,
                  },
                ],
                nps_last_updated: new Date().toISOString(),
              },
            })
            .eq("id", leadData.workspace_id);
        } catch (wsErr) {
          log("warn", "sms_webhook.nps_ws_update_failed", {
            error: wsErr instanceof Error ? wsErr.message : String(wsErr),
          });
        }

        log("info", "sms_webhook.nps_captured", {
          phone: normalizedPhone,
          score: npsScore,
          classification,
          leadId: leadData.id,
        });

        // Fire webhook for NPS
        await fireWebhookEvent(leadData.workspace_id, "nps.received", {
          lead_id: leadData.id,
          phone: normalizedPhone,
          score: npsScore,
          classification,
        }).catch((e: unknown) => {
          log("error", "fireWebhookEvent nps.received failed", {
            error: e instanceof Error ? e.message : String(e),
          });
        });

        // Thank them based on score
        let thankYouMsg = "Thank you for your feedback!";
        if (npsScore >= 9) {
          thankYouMsg =
            "Thank you! We're thrilled you had a great experience. If you'd like to share your story, we'd love to hear it at hello@recall-touch.com";
        } else if (npsScore >= 7) {
          thankYouMsg =
            "Thank you for your feedback! We're always working to improve. If there's anything specific we can do better, reply here or email hello@recall-touch.com";
        } else {
          thankYouMsg =
            "Thank you for your honest feedback. We take this seriously and want to make it right. A team member will reach out to you shortly.";
        }

        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${thankYouMsg}</Message></Response>`,
          { status: 200, headers: { "Content-Type": "text/xml" } }
        );
      }
    }

    // 4. General inbound SMS — log it and optionally route to AI
    // Store as inbound message on the lead record
    const { data: lead } = await db
      .from("leads")
      .select("id, workspace_id, metadata")
      .eq("phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lead) {
      const leadData = lead as {
        id: string;
        workspace_id: string;
        metadata?: Record<string, unknown>;
      };
      const meta = leadData.metadata ?? {};
      const inboundMessages = (meta.inbound_sms ?? []) as Array<
        Record<string, unknown>
      >;

      await db
        .from("leads")
        .update({
          metadata: {
            ...meta,
            inbound_sms: [
              ...inboundMessages.slice(-49),
              {
                body,
                received_at: new Date().toISOString(),
                message_sid: messageSid,
                from: normalizedPhone,
              },
            ],
            last_inbound_sms_at: new Date().toISOString(),
          },
        })
        .eq("id", leadData.id);

      log("info", "sms_webhook.inbound_stored", {
        leadId: leadData.id,
        phone: normalizedPhone,
      });

      // Fire webhook for inbound SMS
      await fireWebhookEvent(leadData.workspace_id, "sms.received", {
        lead_id: leadData.id,
        phone: normalizedPhone,
        body,
        message_sid: messageSid,
      }).catch((e: unknown) => {
        log("error", "fireWebhookEvent sms.received failed", {
          error: e instanceof Error ? e.message : String(e),
        });
      });
    } else {
      log("info", "sms_webhook.unknown_sender", { phone: normalizedPhone });
    }

    // Empty response — no auto-reply for general messages
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  } catch (err) {
    // Phase 78/Phase 4: missing TWILIO_AUTH_TOKEN is a deploy-time misconfig —
    // return 500 (loud) so ops notices rather than silently dropping SMS.
    if (err instanceof TwilioSignatureConfigError) {
      log("error", "sms_webhook.signature_config_error", { message: err.message });
      return new NextResponse("Server misconfigured", { status: 500 });
    }
    log("error", "sms_webhook.failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { status: 200, headers: { "Content-Type": "text/xml" } }
    );
  }
}
