#!/usr/bin/env npx tsx
/**
 * Smoke test for production readiness: health, cron health, optionally trigger process-queue.
 * Usage: BASE_URL=https://your-app.vercel.app CRON_SECRET=xxx npx tsx scripts/smoke-production.ts [--trigger-cron]
 */

const BASE_URL = process.env.BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const isProd = process.env.NODE_ENV === "production";

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

async function runSmoke() {
  const triggerCron = process.argv.includes("--trigger-cron");
  console.log("Smoke report");
  console.log("Base URL:", BASE_URL);
  console.log("");

  let hasFailure = false;

  const health = await fetchJson("/api/health");
  if (health.ok && health.data && typeof health.data === "object" && "status" in health.data) {
    pass(`/api/health ${health.status}`);
  } else {
    fail(`/api/health ${health.status} ${JSON.stringify(health.data)}`);
    hasFailure = true;
  }

  const cronHealth = await fetchJson("/api/health/cron");
  if (cronHealth.status === 200 && cronHealth.data && typeof cronHealth.data === "object") {
    const d = cronHealth.data as Record<string, unknown>;
    if (d.cron_secret_set) {
      pass("/api/health/cron cron_secret_set=true");
    } else {
      fail("/api/health/cron CRON_SECRET not set");
      hasFailure = true;
    }
    if (d.recent_success === true) {
      pass("recent_success=true");
    } else if (d.status === "warning" && d.message) {
      console.log("  ⚠", d.message);
    }
  } else {
    fail(`/api/health/cron ${cronHealth.status} ${JSON.stringify(cronHealth.data)}`);
    hasFailure = true;
  }

  if (triggerCron && !isProd && CRON_SECRET) {
    const cron = await fetchJson("/api/cron/process-queue", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (cron.ok) {
      pass("/api/cron/process-queue 200");
    } else {
      fail(`/api/cron/process-queue ${cron.status} ${JSON.stringify(cron.data)}`);
      hasFailure = true;
    }
  } else if (triggerCron && !CRON_SECRET) {
    console.log("  ⚠ --trigger-cron skipped: CRON_SECRET not set");
  } else if (triggerCron && isProd) {
    console.log("  ⚠ --trigger-cron skipped in NODE_ENV=production");
  }

  console.log("");
  if (hasFailure) {
    console.log("Result: FAIL");
    process.exit(1);
  }
  console.log("Result: PASS");
}

runSmoke().catch((e) => {
  console.error(e);
  process.exit(1);
});
