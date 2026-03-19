/**
 * POST /api/workspace/delete — Delete the current workspace (owner only).
 * Body: { confirm: string } — must match workspace name exactly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

async function cancelStripeSubscription(subscriptionId: string | null): Promise<void> {
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    await stripe.subscriptions.cancel(subscriptionId);
  } catch {
    // Non-blocking: workspace still transitions to deletion pending.
  }
}

async function releaseWorkspaceNumbers(workspaceId: string): Promise<void> {
  const db = getDb();
  const { data: numbers } = await db
    .from("phone_numbers")
    .select("id, provider, provider_sid")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "pending"]);

  const rows = (numbers ?? []) as Array<{ id: string; provider?: string | null; provider_sid?: string | null }>;
  for (const row of rows) {
    await db
      .from("phone_numbers")
      .update({
        status: "released",
        assigned_agent_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (row.provider === "twilio" && row.provider_sid && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${row.provider_sid}.json`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            },
          },
        );
      } catch {
        // Non-blocking provider release failure.
      }
    }
  }

  await db
    .from("phone_configs")
    .update({ proxy_number: null, status: "inactive", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  let body: { confirm?: string };
  try {
    body = (await req.json()) as { confirm?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const confirm = (body.confirm ?? "").toString().trim();
  if (!confirm)
    return NextResponse.json({ error: "Type the workspace name to confirm" }, { status: 400 });

  const db = getDb();
  const { data: ws, error: fetchErr } = await db
    .from("workspaces")
    .select("id, name, owner_id, stripe_subscription_id")
    .eq("id", session.workspaceId)
    .maybeSingle();

  if (fetchErr || !ws)
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const row = ws as {
    id: string;
    name?: string | null;
    owner_id: string;
    stripe_subscription_id?: string | null;
  };
  if (row.owner_id !== session.userId)
    return NextResponse.json({ error: "Only the workspace owner can delete it" }, { status: 403 });

  const workspaceName = (row.name ?? "My Workspace").trim();
  if (confirm !== workspaceName)
    return NextResponse.json({ error: "Workspace name does not match. Type it exactly to confirm." }, { status: 400 });

  const now = new Date();
  const retentionEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await Promise.all([
    cancelStripeSubscription(row.stripe_subscription_id ?? null),
    releaseWorkspaceNumbers(session.workspaceId),
  ]);

  const { error: updateErr } = await db
    .from("workspaces")
    .update({
      status: "deletion_pending",
      billing_status: "cancelled",
      pause_reason: "workspace_deleted",
      deleted_at: now.toISOString(),
      deletion_requested_at: now.toISOString(),
      deletion_effective_at: retentionEndsAt.toISOString(),
      deletion_status: "pending_purge",
      anonymized_analytics_retained: true,
      updated_at: now.toISOString(),
    })
    .eq("id", session.workspaceId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Mark recording/transcript purge work for retention cron.
  await db.from("protocol_events").insert({
    external_ref: `workspace-delete:${session.workspaceId}:${now.getTime()}`,
    workspace_id: session.workspaceId,
    event_type: "workspace_deletion_requested",
    payload: {
      requested_at: now.toISOString(),
      retention_window_days: 30,
      delete_recordings: true,
      delete_transcripts: true,
      release_phone_numbers: true,
      stripe_subscription_cancelled: Boolean(row.stripe_subscription_id),
      retain_anonymized_analytics: true,
    },
  });

  return NextResponse.json({
    ok: true,
    status: "deletion_pending",
    retention_ends_at: retentionEndsAt.toISOString(),
  });
}
