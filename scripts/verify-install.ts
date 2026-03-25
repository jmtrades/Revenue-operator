#!/usr/bin/env npx tsx
/**
 * Verify install: health, cron health, installation readiness, connector inbox, core cron, proof capsule.
 * Safe for staging/dev. No external network; all requests to BASE_URL.
 * Usage: BASE_URL=http://localhost:3000 CRON_SECRET=xxx [WORKSPACE_ID=uuid] npx tsx scripts/verify-install.ts
 */

const BASE_URL = process.env.BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const WORKSPACE_ID = process.env.WORKSPACE_ID;

async function fetchJson(path: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${BASE_URL.replace(/\/$/, "")}${path}`;
  try {
    const res = await fetch(url, { ...options, cache: "no-store" });
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: String(e) };
  }
}

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg: string) {
  console.log(`  ✗ ${msg}`);
}

async function run() {
  let hasFailure = false;

  const health = await fetchJson("/api/health");
  if (health.ok && health.data && typeof health.data === "object" && "status" in health.data) {
    pass("/api/health");
  } else {
    fail(`/api/health ${health.status}`);
    hasFailure = true;
  }

  const cronHealth = await fetchJson("/api/health/cron");
  if (cronHealth.status === 200 && cronHealth.data && typeof cronHealth.data === "object") {
    const d = cronHealth.data as Record<string, unknown>;
    if (d.cron_secret_set) pass("/api/health/cron");
    else {
      fail("CRON_SECRET not set");
      hasFailure = true;
    }
  } else {
    fail(`/api/health/cron ${cronHealth.status}`);
    hasFailure = true;
  }

  if (WORKSPACE_ID) {
    const readiness = await fetchJson(`/api/installation/readiness?workspace_id=${encodeURIComponent(WORKSPACE_ID)}`);
    if (readiness.ok && readiness.data && typeof readiness.data === "object") {
      const r = readiness.data as Record<string, unknown>;
      if (r.system_ready === true) pass("installation/readiness system_ready=true");
      else pass("installation/readiness (system_ready=false expected if not fully connected)");
    } else {
      fail(`installation/readiness ${readiness.status}`);
      hasFailure = true;
    }

    const inbox = await fetchJson("/api/connectors/webhook-inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: WORKSPACE_ID,
        kind: "email.inbound",
        data: { message_id: `verify_${Date.now()}`, from: "verify@test", to: "workspace@test", body: "Verify." },
        occurred_at: new Date().toISOString(),
      }),
    });
    if (inbox.ok && inbox.data && typeof inbox.data === "object" && "id" in inbox.data) {
      pass("connector inbox POST");
    } else {
      fail(`connector inbox ${inbox.status} ${JSON.stringify(inbox.data)}`);
      hasFailure = true;
    }
  } else {
    console.log("  ⚠ WORKSPACE_ID not set: skipping readiness, inbox, proof-capsule");
  }

  if (CRON_SECRET) {
    const core = await fetchJson("/api/cron/core", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (core.ok) pass("/api/cron/core");
    else {
      fail(`/api/cron/core ${core.status}`);
      hasFailure = true;
    }
  } else {
    fail("CRON_SECRET not set; cannot run core cron");
    hasFailure = true;
  }

  if (WORKSPACE_ID) {
    const proof = await fetchJson(`/api/assurance/proof-capsule?workspace_id=${encodeURIComponent(WORKSPACE_ID)}`);
    if (proof.ok && proof.data && typeof proof.data === "object" && Array.isArray((proof.data as { lines?: unknown }).lines)) {
      pass("proof capsule can be generated");
    } else {
      fail(`proof-capsule ${proof.status}`);
      hasFailure = true;
    }
  }

  if (hasFailure) {
    console.log("\nResult: FAIL");
    process.exit(1);
  }
  console.log("\nResult: PASS");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
