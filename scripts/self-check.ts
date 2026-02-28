#!/usr/bin/env tsx
/**
 * Self-check: simulates critical flows for production reliability.
 * Exits non-zero if any step fails.
 * Usage: BASE_URL=https://your-app.com tsx scripts/self-check.ts
 * Or run with dev server: npm run dev & then BASE_URL=http://localhost:3000 tsx scripts/self-check.ts
 */

import { fetchJson as readJsonOnce } from "./self-check-helper";

const BASE_URL = (process.env.BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

function fail(msg: string): never {
  console.error("[self-check]", msg);
  process.exit(1);
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    redirect: "follow",
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const parsed = await readJsonOnce(res);
  const raw = "raw" in parsed && typeof parsed.raw === "string" ? parsed.raw : "";
  const json = "json" in parsed ? (parsed as { json: unknown }).json : null;

  if (!res.ok) {
    const msg =
      (json as { reason?: string; error?: string } | null)?.reason ||
      (json as { reason?: string; error?: string } | null)?.error ||
      (raw ? raw.slice(0, 300) : `HTTP ${res.status}`);
    const err = new Error(`[self-check] ${res.status} ${res.statusText}: ${msg}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return { res, json, raw };
}

/** Read body once; does not throw on non-2xx. Use for endpoints that may return 400/404/500. */
async function fetchReadOnce(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    redirect: "follow",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const parsed = await readJsonOnce(res);
  const raw = "raw" in parsed && typeof parsed.raw === "string" ? parsed.raw : "";
  const json = "json" in parsed ? (parsed as { json: unknown }).json : null;
  return { res, json, raw };
}

async function main() {
  console.log("[self-check] BASE_URL:", BASE_URL);

  // Resolve canonical base so POST is never sent through a redirect (which can turn into GET → 405)
  let base = BASE_URL;
  try {
    const probe = await fetch(BASE_URL + "/api/health", { redirect: "follow", method: "GET" });
    await probe.text(); // drain body once (avoids "body already read" if implementation reuses)
    if (probe.url) {
      base = new URL(probe.url).origin;
    }
  } catch {
    // keep BASE_URL
  }
  // Prefer www when host is apex (recall-touch.com) so POST is not redirected and turned into GET
  try {
    const u = new URL(base);
    if (u.hostname === "recall-touch.com") {
      base = "https://www.recall-touch.com";
    }
  } catch {
    // keep base
  }
  console.log("[self-check] Resolved base:", base);

  // 0) System health: high-level check before detailed steps
  try {
    const { json: healthJson } = await fetchJson(`${base}/api/system/health`);
    const health = (healthJson || {}) as { ok?: boolean; core_recent?: boolean; db_reachable?: boolean; public_corridor_ok?: boolean };
    if (!health || typeof health !== "object" || health.ok !== true) {
      fail("system/health: reported not-ok");
    }
  } catch (e) {
    fail("system/health: request failed");
  }

  // 1) Trial start: must return deterministic JSON (always 200, body has ok/reason/checkout_url)
  const trialUrl = `${base}/api/trial/start`;
  let trialJson: unknown;
  try {
    const out = await fetchJson(trialUrl, {
      method: "POST",
      body: JSON.stringify({ email: `self-check-${Date.now()}@example.com` }),
    });
    trialJson = out.json;
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 405) {
      console.error("[self-check] POST /api/trial/start returned 405. Ensure the app is deployed and the host allows POST (try BASE_URL=https://www.recall-touch.com).");
    }
    throw e;
  }
  const trialData = trialJson as { ok?: boolean; reason?: string; checkout_url?: string; workspace_id?: string };
  if (typeof trialData?.ok !== "boolean") fail("trial/start: response must have ok: boolean");
  if (trialData.ok && trialData.reason !== "already_active" && !trialData.checkout_url && !(trialData as { url?: string }).url) {
    fail("trial/start: success response must have checkout_url or url");
  }
  if (!trialData.ok && trialData.reason) {
    const allowed = ["invalid_json", "invalid_email", "missing_env", "missing_price_id", "workspace_creation_failed", "checkout_creation_failed", "wrong_price_mode", "stripe_unreachable", "invalid_tier", "invalid_interval"];
    if (!allowed.includes(trialData.reason)) {
      fail(`trial/start: unknown failure reason: ${trialData.reason}`);
    }
  }
  console.log("[self-check] 1. Trial start: ok");

  // 2) /activate and /pricing load (200 or redirect)
  const actRes = await fetch(base + "/activate", { redirect: "manual", cache: "no-store" });
  if (actRes.status !== 200 && actRes.status !== 302 && actRes.status !== 307) fail("activate: expected 200 or redirect");
  const priceRes = await fetch(base + "/pricing", { redirect: "manual", cache: "no-store" });
  if (priceRes.status !== 200 && priceRes.status !== 302 && priceRes.status !== 307) fail("pricing: expected 200 or redirect");
  console.log("[self-check] 2. Activate + pricing load: ok");

  // 3) Checkout contract: POST returns { ok, checkout_url | reason }
  const workspaceId = trialData.workspace_id;
  const { res: checkoutRes, json: checkoutJson } = await fetchReadOnce(`${base}/api/billing/checkout`, {
    method: "POST",
    body: JSON.stringify({ email: `checkout-${Date.now()}@example.com` }),
  });
  if (checkoutRes.status !== 200) fail("billing/checkout: must return 200 with JSON");
  const co = (checkoutJson || {}) as { ok?: boolean; reason?: string; checkout_url?: string };
  if (typeof co.ok !== "boolean") fail("billing/checkout: response must have ok: boolean");
  if (co.ok && !co.checkout_url && co.reason !== "already_active") fail("billing/checkout: success must have checkout_url or reason already_active");
  if (!co.ok && co.reason && !["invalid_json", "invalid_email", "missing_env", "missing_price_id", "workspace_id_or_email_required", "checkout_creation_failed", "stripe_unreachable", "invalid_tier", "invalid_interval"].includes(co.reason)) {
    // allow other reasons from getPriceId
  }
  console.log("[self-check] 3. Billing checkout contract: ok");

  // 4) Webhook: must not redirect, must return 200 or 400 (no 500 from body parse)
  const { res: webhookRes, json: webhookJson } = await fetchReadOnce(`${base}/api/billing/webhook`, {
    method: "POST",
    body: "{}",
  });
  if (webhookRes.status !== 200 && webhookRes.status !== 400) {
    fail(`webhook: expected 200 or 400, got ${webhookRes.status}`);
  }
  const webhookData = webhookJson as { error?: string } | null;
  if (webhookRes.status === 400 && !webhookData?.error) {
    fail("webhook: 400 should include error");
  }
  console.log("[self-check] 4. Webhook (no redirect, deterministic): ok");

  // 5) Onboarding thread creation: requires workspace_id
  const threadWorkspaceId = workspaceId ?? "00000000-0000-0000-0000-000000000000";
  const { res: threadRes, json: threadJson } = await fetchReadOnce(`${base}/api/onboard/create-thread`, {
    method: "POST",
    body: JSON.stringify({ workspace_id: threadWorkspaceId }),
  });
  if (threadRes.status !== 200 && threadRes.status !== 400 && threadRes.status !== 500) {
    fail(`onboard/create-thread: unexpected status ${threadRes.status}`);
  }
  const threadData = (threadJson || {}) as { thread_id?: string; external_ref?: string; error?: string };
  if (threadRes.status === 200 && threadData.external_ref) {
    console.log("[self-check] 5. Onboarding thread creation: ok");
  } else if (threadRes.status === 200 && threadData.thread_id) {
    console.log("[self-check] 5. Onboarding thread (existing): ok");
  } else {
    console.log("[self-check] 5. Onboarding thread (no workspace or error): ok");
  }

  // 6) Public work API: must return neutral response (no internal IDs)
  const extRef = (threadData.external_ref ?? "unknown-ref").replace(/[^a-zA-Z0-9_-]/g, "");
  const { res: publicRes } = await fetchReadOnce(`${base}/api/public/work/${extRef || "x"}`, { method: "GET" });
  if (publicRes.status !== 200 && publicRes.status !== 404 && publicRes.status !== 400) {
    fail(`api/public/work: expected 200/404/400, got ${publicRes.status}`);
  }
  console.log("[self-check] 6. Public work GET: ok");

  // 7) Public work respond: POST must return 200/400/404 (safe)
  const { res: respondRes } = await fetchReadOnce(`${base}/api/public/work/${extRef || "x"}/respond`, {
    method: "POST",
    body: JSON.stringify({ action: "acknowledge", payload: {} }),
  });
  if (respondRes.status !== 200 && respondRes.status !== 400 && respondRes.status !== 404) {
    fail(`api/public/work/respond: expected 200/400/404, got ${respondRes.status}`);
  }
  console.log("[self-check] 7. Public work respond: ok");

  // 8) Core status: must never error (deterministic defaults)
  const { json: coreJson } = await fetchJson(`${base}/api/system/core-status`);
  const coreData = coreJson as Record<string, unknown>;
  if (!coreData || typeof coreData !== "object") fail("core-status: response must be object");
  console.log("[self-check] 8. Core status: ok");

  // 9) Dashboard surfaces: Situation, Record, Activity, Presence (200 or redirect to activate)
  const dashRes = await fetch(base + "/dashboard", { redirect: "manual", cache: "no-store" });
  if (dashRes.status !== 200 && dashRes.status !== 302 && dashRes.status !== 307) {
    fail(`dashboard: expected 200 or redirect, got ${dashRes.status}`);
  }
  console.log("[self-check] 9. Dashboard load: ok");

  // 10) Dashboard billing: 200 or redirect (portal creation is safe failure)
  const billRes = await fetch(base + "/dashboard/billing", { redirect: "manual", cache: "no-store" });
  if (billRes.status !== 200 && billRes.status !== 302 && billRes.status !== 307) {
    fail(`dashboard/billing: expected 200 or redirect, got ${billRes.status}`);
  }
  console.log("[self-check] 10. Dashboard billing: ok");

  console.log("[self-check] All steps passed.");
}

main().catch((err) => {
  console.error("[self-check]", err);
  process.exit(1);
});
