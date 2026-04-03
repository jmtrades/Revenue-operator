/**
 * POST /api/dashboard/cancel-subscription — Record cancellation reason and
 * cancel the Stripe subscription at period end.
 *
 * Before canceling, returns a retention summary showing the user exactly
 * what they're giving up — revenue recovered, calls handled, appointments
 * booked. This makes the cost of leaving viscerally real.
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import { withWorkspace, type WorkspaceContext } from "@/lib/api/with-workspace";
import { apiOk, apiInternalError } from "@/lib/api/errors";
import { backgroundTask } from "@/lib/async/safe-background";

export const POST = withWorkspace(
  async (req: NextRequest, ctx: WorkspaceContext) => {
    const { workspaceId } = ctx;

    let body: { reason?: string; confirmed?: boolean };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const reason = body.reason ?? "unspecified";
    const confirmed = body.confirmed === true;
    const db = getDb();

    // ── Step 1: If not confirmed, return retention summary ──
    if (!confirmed) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Gather lifetime stats to show impact of leaving
      const [callsResult, appointmentsResult, dealsResult, leadsResult] = await Promise.all([
        db.from("call_sessions").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("status", "completed"),
        db.from("call_sessions").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("outcome", "appointment_booked"),
        db.from("deals").select("value_cents").eq("workspace_id", workspaceId).eq("status", "won"),
        db.from("leads").select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId),
      ]);

      const totalCallsHandled = callsResult.count ?? 0;
      const totalAppointmentsBooked = appointmentsResult.count ?? 0;
      const totalRevenueWon = ((dealsResult.data ?? []) as { value_cents?: number }[])
        .reduce((sum, d) => sum + (d.value_cents ?? 0), 0);
      const totalLeads = leadsResult.count ?? 0;

      // Recent month stats
      const { count: recentCalls } = await db.from("call_sessions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("status", "completed")
        .gte("call_started_at", startOfMonth.toISOString());

      return apiOk({
        action: "confirm_required",
        message: "Please review what you'll lose before confirming cancellation.",
        retention_summary: {
          total_calls_handled: totalCallsHandled,
          total_appointments_booked: totalAppointmentsBooked,
          total_revenue_won_cents: totalRevenueWon,
          total_leads_managed: totalLeads,
          calls_this_month: recentCalls ?? 0,
          data_at_risk: {
            agents_configured: true,
            campaigns_active: true,
            lead_intelligence: true,
            call_recordings: true,
            conversation_history: true,
          },
          warning: totalRevenueWon > 0
            ? `Revenue Operator has helped close $${Math.round(totalRevenueWon / 100).toLocaleString()} in revenue. Canceling means missed calls go unanswered and leads go cold.`
            : "Canceling means missed calls go unanswered, leads go cold, and revenue leaks reopen.",
        },
      });
    }

    // ── Step 2: Confirmed — proceed with cancellation ──

    // Save cancellation reason
    await db.from("cancellation_reasons").insert({
      workspace_id: workspaceId,
      reason,
      created_at: new Date().toISOString(),
    }).then(() => {});

    // Cancel via Stripe if subscription exists
    const { data: ws } = await db
      .from("workspaces")
      .select("stripe_subscription_id, billing_status")
      .eq("id", workspaceId)
      .maybeSingle();

    const subId = (ws as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;

    if (subId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = (await import("stripe")).default;
        const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY);
        await stripeClient.subscriptions.update(subId, {
          cancel_at_period_end: true,
          metadata: { cancellation_reason: reason },
        });
      } catch (err) {
        log("error", "cancel_subscription.stripe_error", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Update workspace status
    await db
      .from("workspaces")
      .update({ billing_status: "canceling", updated_at: new Date().toISOString() })
      .eq("id", workspaceId);

    // Background: Send retention email + log churn event
    backgroundTask("cancellation_followup", async () => {
      try {
        const { data: owner } = await db
          .from("workspaces")
          .select("owner_id")
          .eq("id", workspaceId)
          .maybeSingle();
        const ownerId = (owner as { owner_id?: string } | null)?.owner_id;
        if (ownerId) {
          const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
          const email = (user as { email?: string } | null)?.email;
          if (email) {
            // Log for win-back campaign targeting
            await db.from("billing_events").insert({
              workspace_id: workspaceId,
              event_type: "cancellation_initiated",
              metadata: { reason, email },
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch {
        // Non-blocking
      }
    }, { context: { workspace_id: workspaceId } });

    return apiOk({
      action: "cancelled",
      message: "Subscription will cancel at end of billing period. Your data is preserved for 90 days.",
    });
  },
  { workspaceFrom: "body" },
);
