/**
 * Settlement Layer: consent-based authorization and usage export to Stripe.
 * No pricing UI. No charge without explicit authorization.
 */

import { log } from "@/lib/logger";
import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/db/queries";
import { isSettlementReady } from "@/lib/operational-perception/settlement-readiness";
import { getStripe } from "@/lib/billing/stripe-client";
import { stripeIdempotencyKey } from "@/lib/billing/stripe-idempotency";

const DEFAULT_TTL_HOURS = 24 * 7; // 7 days
const APP_URL = process.env.APP_URL ?? "";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export class SettlementNotConfiguredError extends Error {
  constructor() {
    super("Settlement not configured");
    this.name = "SettlementNotConfiguredError";
  }
}

async function appendSettlementProtocolEvent(
  externalRef: string,
  workspaceId: string,
  eventType: "settlement_issued" | "settlement_opened" | "settlement_authorized" | "settlement_expired" | "settlement_exported" | "settlement_export_failed",
  payload: Record<string, unknown> = {}
): Promise<void> {
  const db = getDb();
  await db.from("protocol_events").insert({
    external_ref: externalRef,
    workspace_id: workspaceId,
    event_type: eventType,
    payload,
  });
}

/**
 * Billing activates only after proven value (economic activation / stabilization).
 * A) Ensure settlement account; if economically active and inactive, move to pending_authorization.
 */
export async function ensureSettlementAccount(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: row } = await db
    .from("settlement_accounts")
    .select("id, settlement_state")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) {
    const ready = await isSettlementReady(workspaceId);
    await db.from("settlement_accounts").insert({
      workspace_id: workspaceId,
      settlement_state: ready ? "pending_authorization" : "inactive",
      updated_at: now,
    });
    return;
  }

  const state = (row as { settlement_state: string }).settlement_state;
  if (state === "inactive") {
    const ready = await isSettlementReady(workspaceId);
    if (ready) {
      await db
        .from("settlement_accounts")
        .update({ settlement_state: "pending_authorization", updated_at: now })
        .eq("workspace_id", workspaceId);
    }
  }
}

/**
 * B) Issue settlement intent. Dedupe: do not issue if unexpired intent exists; return skipped with existing externalRef.
 */
export async function issueSettlementIntent(
  workspaceId: string,
  ttlHours: number = DEFAULT_TTL_HOURS
): Promise<{ rawToken: string; externalRef: string } | { skipped: true; externalRef: string }> {
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const { data: existingIntent } = await db
    .from("settlement_intents")
    .select("external_ref")
    .eq("workspace_id", workspaceId)
    .gt("expires_at", now.toISOString())
    .in("state", ["issued", "opened"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingIntent) {
    const extRef = (existingIntent as { external_ref: string }).external_ref;
    return { skipped: true, externalRef: extRef };
  }

  const hex = randomBytes(16).toString("hex");
  const externalRef = `settle:${workspaceId}:${hex}`;
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  await db.from("settlement_intents").insert({
    workspace_id: workspaceId,
    external_ref: externalRef,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    state: "issued",
  });
  const configured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_DEFAULT_PRICE_ID);
  await appendSettlementProtocolEvent(externalRef, workspaceId, "settlement_issued", { configured });
  return { rawToken, externalRef };
}

/**
 * C) Validate token. Returns intent info if valid and unused and not expired; { alreadyUsed: true } if used; null if invalid/expired.
 */
export async function validateSettlementToken(
  rawToken: string
): Promise<
  | { intentId: string; workspaceId: string; externalRef: string }
  | { alreadyUsed: true }
  | null
> {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const { data: row } = await db
    .from("settlement_intents")
    .select("id, workspace_id, external_ref, used_at, expires_at, state")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!row) return null;
  const r = row as { id: string; workspace_id: string; external_ref: string; used_at: string | null; expires_at: string; state: string };
  if (new Date(r.expires_at) <= new Date()) return null;
  if (r.used_at != null) return { alreadyUsed: true };
  if (r.state === "authorized" || r.state === "expired" || r.state === "revoked") return null;
  return { intentId: r.id, workspaceId: r.workspace_id, externalRef: r.external_ref };
}

/**
 * D) Mark token used (idempotent). State -> opened if previously issued.
 */
export async function markSettlementTokenUsed(rawToken: string): Promise<void> {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const { data: row } = await db
    .from("settlement_intents")
    .select("id, used_at, state")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!row) return;
  const r = row as { id: string; used_at: string | null; state: string };
  if (r.used_at != null) return;
  await db
    .from("settlement_intents")
    .update({
      used_at: now,
      state: r.state === "issued" ? "opened" : r.state,
    })
    .eq("id", r.id);
}

/**
 * E) Build public settlement link.
 */
export function buildPublicSettlementLink(rawToken: string): string {
  const base = APP_URL.replace(/\/$/, "");
  return `${base}/public/settlement?token=${encodeURIComponent(rawToken)}`;
}

async function ensureSettlementPriceSeed(): Promise<void> {
  const priceId = process.env.STRIPE_DEFAULT_PRICE_ID;
  if (!priceId) return;
  const db = getDb();
  const { data: row } = await db
    .from("settlement_prices")
    .select("id")
    .eq("key", "default_metered_v1")
    .maybeSingle();
  if (!row) {
    await db.from("settlement_prices").insert({
      key: "default_metered_v1",
      stripe_price_id: priceId,
      description: "metered",
    });
  }
}

/**
 * F) Create Stripe Checkout Session for settlement. Throws SettlementNotConfiguredError if env missing.
 */
export async function createStripeCheckoutSessionForSettlement(workspaceId: string): Promise<{ url: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const defaultPriceId = process.env.STRIPE_DEFAULT_PRICE_ID;
  if (!secretKey || !defaultPriceId) throw new SettlementNotConfiguredError();
  await ensureSettlementPriceSeed().catch((e: unknown) => {
    log("error", "ensureSettlementPriceSeed failed", { error: e instanceof Error ? e.message : String(e) });
  });

  // Phase 78/Phase 6: shared factory with pinned apiVersion
  const stripe = getStripe();
  const db = getDb();
  const now = new Date().toISOString();

  const { data: account } = await db
    .from("settlement_accounts")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  let customerId: string | null = (account as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { workspace_id: workspaceId },
    }, {
      // Phase 78/Phase 6.2: never create two settlement customers per workspace
      idempotencyKey: stripeIdempotencyKey("settlement-customer-create", workspaceId),
    });
    customerId = customer.id;
    await db
      .from("settlement_accounts")
      .update({ stripe_customer_id: customerId, updated_at: now })
      .eq("workspace_id", workspaceId);
  }

  const baseUrl = APP_URL.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: defaultPriceId, quantity: 1 }],
    allow_promotion_codes: false,
    success_url: `${baseUrl}/public/settlement/success?wid=${encodeURIComponent(workspaceId)}`,
    cancel_url: `${baseUrl}/public/settlement/cancel?wid=${encodeURIComponent(workspaceId)}`,
    client_reference_id: workspaceId,
    metadata: { workspace_id: workspaceId, settlement: "true" },
  }, {
    // Phase 78/Phase 6.2: reuse settlement checkout on repeat authorization clicks
    idempotencyKey: stripeIdempotencyKey("settlement-checkout", workspaceId, defaultPriceId),
  });
  const url = session.url ?? "";
  if (!url) throw new SettlementNotConfiguredError();
  return { url };
}

/**
 * G) Activate settlement from Stripe (webhook). Store customer/subscription only; do not call Stripe API.
 * stripe_subscription_item_id left null until first export.
 */
export async function activateSettlementFromStripe(
  workspaceId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .from("settlement_accounts")
    .update({
      settlement_state: "active",
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      authorized_at: now,
      updated_at: now,
    })
    .eq("workspace_id", workspaceId);
  await appendSettlementProtocolEvent(
    `settle:${workspaceId}:activated`,
    workspaceId,
    "settlement_authorized",
    { at: now }
  );
}

const LEASE_TTL_MINUTES = 10;

/**
 * Try to acquire export lease for workspace. Returns true if acquired (atomic via DB function).
 */
export async function tryAcquireSettlementExportLease(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const leaseUntil = new Date(Date.now() + LEASE_TTL_MINUTES * 60 * 1000).toISOString();
  const result = await (db as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: boolean | null; error: unknown }> }).rpc(
    "try_acquire_settlement_export_lease",
    { p_workspace_id: workspaceId, p_lease_until: leaseUntil }
  );
  return !result.error && result.data === true;
}

/**
 * Release export lease (call after export run for workspace).
 */
export async function releaseSettlementExportLease(workspaceId: string): Promise<void> {
  const db = getDb();
  await db.from("settlement_export_leases").delete().eq("workspace_id", workspaceId);
}

/**
 * Count consecutive failed exports after last success (or in window). For suspend logic.
 */
export async function getConsecutiveSettlementExportFailures(
  workspaceId: string,
  windowDays: number = 7
): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await db
    .from("settlement_exports")
    .select("export_state")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  const list = (rows ?? []) as { export_state: string }[];
  let count = 0;
  for (const r of list) {
    if (r.export_state === "failed") count++;
    else break;
  }
  return count;
}

/**
 * H) Compute export periods (UTC day-aligned) after last_exported_period_end.
 */
export async function computeExportPeriods(workspaceId: string): Promise<{ period_start: string; period_end: string }[]> {
  const db = getDb();
  const { data: acc } = await db
    .from("settlement_accounts")
    .select("last_exported_period_end")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const lastEnd = (acc as { last_exported_period_end: string | null } | null)?.last_exported_period_end ?? null;
  const start = lastEnd ? new Date(lastEnd) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const periods: { period_start: string; period_end: string }[] = [];
  const now = new Date();
  let current = new Date(start.getTime());
  current.setUTCHours(0, 0, 0, 0);
  if (lastEnd) current = new Date(new Date(lastEnd).getTime());
  while (current < now) {
    const periodEnd = new Date(current);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
    periodEnd.setUTCHours(0, 0, 0, 0);
    if (periodEnd > now) break;
    periods.push({
      period_start: current.toISOString(),
      period_end: periodEnd.toISOString(),
    });
    current = periodEnd;
  }
  return periods;
}

/**
 * I) Export usage to Stripe for one period. Resolve subscription_item_id on first export; idempotent key includes period; quantity defaults to 0.
 */
const CONSECUTIVE_FAILURES_BEFORE_SUSPEND = 3;

function resolveSubscriptionItemId(
  subscriptionId: string,
  defaultPriceId: string | null
): Promise<string | null> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return Promise.resolve(null);
  return (async () => {
    // Phase 78/Phase 6: shared factory with pinned apiVersion
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
    const items = sub.items?.data ?? [];
    const preferred = defaultPriceId
      ? items.find((i) => (i.price as { id?: string })?.id === defaultPriceId)
      : null;
    const item = preferred ?? items[0];
    return item?.id ?? null;
  })();
}

export async function exportUsageToStripe(
  workspaceId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ ok: boolean; failureReason?: string }> {
  const db = getDb();
  const { data: acc } = await db
    .from("settlement_accounts")
    .select("settlement_state, stripe_subscription_id, stripe_subscription_item_id, suspended_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!acc) return { ok: false, failureReason: "no_settlement_account" };
  const a = acc as {
    settlement_state: string;
    stripe_subscription_id: string | null;
    stripe_subscription_item_id: string | null;
    suspended_at: string | null;
  };
  if (a.settlement_state !== "active" || !a.stripe_subscription_id) {
    return { ok: false, failureReason: "settlement_not_active" };
  }

  let subscriptionItemId = a.stripe_subscription_item_id;
  if (!subscriptionItemId) {
    const defaultPriceId = process.env.STRIPE_DEFAULT_PRICE_ID ?? null;
    subscriptionItemId = await resolveSubscriptionItemId(a.stripe_subscription_id, defaultPriceId);
    if (subscriptionItemId) {
      await db
        .from("settlement_accounts")
        .update({
          stripe_subscription_item_id: subscriptionItemId,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", workspaceId);
    }
  }
  if (!subscriptionItemId) return { ok: false, failureReason: "no_subscription_item" };

  const { computeAndStoreUsageClassification } = await import("./usage-classification");
  const classification = await computeAndStoreUsageClassification(workspaceId, periodStart, periodEnd);
  const quantity =
    classification.continuity_preserved ||
    classification.loss_prevented ||
    classification.coordination_enabled ||
    classification.outcome_verified
      ? 1
      : 0;

  const idempotencyKey = `usage:${workspaceId}:${periodStart}:${periodEnd}`;
  const timestamp = Math.floor(new Date(periodEnd).getTime() / 1000) - 1;

  try {
    const _stripe = getStripe();
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    const res = await fetch(`https://api.stripe.com/v1/subscription_items/${subscriptionItemId}/usage_records`, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body: new URLSearchParams({
        quantity: String(quantity),
        timestamp: String(timestamp),
        action: "set",
      }).toString(),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || res.statusText);
    }

    await db.from("settlement_exports").upsert(
      {
        workspace_id: workspaceId,
        period_start: periodStart,
        period_end: periodEnd,
        export_state: "exported",
        failure_reason: null,
        stripe_usage_record_id: idempotencyKey,
      },
      { onConflict: "workspace_id,period_start,period_end" }
    );
    await db
      .from("settlement_accounts")
      .update({
        last_exported_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId);
    const wasResumed = a.suspended_at != null;
    await appendSettlementProtocolEvent(
      `settle:${workspaceId}:export`,
      workspaceId,
      "settlement_exported",
      { period_start: periodStart, period_end: periodEnd, ...(wasResumed && { resumed: true }) }
    );
    if (wasResumed) {
      const now = new Date().toISOString();
      await db
        .from("settlement_accounts")
        .update({
          settlement_state: "active",
          suspended_at: null,
          updated_at: now,
        })
        .eq("workspace_id", workspaceId);
    }
    return { ok: true };
  } catch (err) {
    const reason = String(err).slice(0, 500);
    await db.from("settlement_exports").upsert(
      {
        workspace_id: workspaceId,
        period_start: periodStart,
        period_end: periodEnd,
        export_state: "failed",
        failure_reason: reason,
      },
      { onConflict: "workspace_id,period_start,period_end" }
    );
    await appendSettlementProtocolEvent(
      `settle:${workspaceId}:export`,
      workspaceId,
      "settlement_export_failed",
      { period_start: periodStart, period_end: periodEnd, reason }
    );

    const consecutiveFailures = await getConsecutiveSettlementExportFailures(workspaceId, 7);
    if (consecutiveFailures >= CONSECUTIVE_FAILURES_BEFORE_SUSPEND) {
      const now = new Date().toISOString();
      const { data: ac } = await db
        .from("settlement_accounts")
        .select("suspension_entry_created_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const alreadyCreated = (ac as { suspension_entry_created_at: string | null } | null)?.suspension_entry_created_at != null;
      await db
        .from("settlement_accounts")
        .update({
          settlement_state: "suspended",
          suspended_at: now,
          updated_at: now,
          ...(!alreadyCreated && { suspension_entry_created_at: now }),
        })
        .eq("workspace_id", workspaceId);
      await appendSettlementProtocolEvent(
        `settle:${workspaceId}:export`,
        workspaceId,
        "settlement_export_failed",
        { reason: "consecutive_failures" }
      );
    }
    return { ok: false, failureReason: reason };
  }
}

/**
 * J) True if workspace has active settlement.
 */
export async function hasActiveSettlement(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: row } = await db
    .from("settlement_accounts")
    .select("settlement_state")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (row as { settlement_state: string } | null)?.settlement_state === "active";
}

/**
 * Get settlement state for responsibility: active, pending_authorization, suspended.
 */
export async function getSettlementState(workspaceId: string): Promise<{
  active: boolean;
  pending_authorization: boolean;
  suspended: boolean;
}> {
  const db = getDb();
  const { data: row } = await db
    .from("settlement_accounts")
    .select("settlement_state")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const state = (row as { settlement_state: string } | null)?.settlement_state ?? "inactive";
  return {
    active: state === "active",
    pending_authorization: state === "pending_authorization",
    suspended: state === "suspended",
  };
}
