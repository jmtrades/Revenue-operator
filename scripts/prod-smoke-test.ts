/**
 * Production smoke test: hits real deployed endpoints and asserts contracts.
 * 
 * Usage:
 *   BASE_URL=https://your-domain.com WORKSPACE_ID=xxx CRON_SECRET=xxx npx tsx scripts/prod-smoke-test.ts
 * 
 * Exits non-zero on any failure.
 */

const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
const WORKSPACE_ID = process.env.WORKSPACE_ID || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

const FORBIDDEN_WORDS = [
  "should",
  "improve",
  "increase",
  "performance",
  "optimize",
  "recommend",
  "advice",
  "suggest",
  "better",
  "faster",
  "efficient",
];

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: unknown;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, error?: string, details?: unknown): void {
  results.push({ name, passed: condition, error, details });
  if (!condition) {
    console.error(`❌ FAIL: ${name}${error ? ` - ${error}` : ""}`);
    if (details) console.error("   Details:", JSON.stringify(details, null, 2));
  } else {
    console.log(`✅ PASS: ${name}`);
  }
}

function checkDoctrineSafe(obj: unknown, path = ""): string[] {
  const violations: string[] = [];
  if (typeof obj === "string") {
    for (const word of FORBIDDEN_WORDS) {
      if (obj.toLowerCase().includes(word)) {
        violations.push(`${path}: contains "${word}"`);
      }
      if (obj.length > 90) {
        violations.push(`${path}: length ${obj.length} > 90`);
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      violations.push(...checkDoctrineSafe(item, `${path}[${i}]`));
    });
  } else if (obj && typeof obj === "object") {
    Object.entries(obj).forEach(([key, value]) => {
      if (key.includes("_id") && typeof value === "string" && value.length > 20) {
        violations.push(`${path}.${key}: potential internal ID`);
      }
      violations.push(...checkDoctrineSafe(value, path ? `${path}.${key}` : key));
    });
  }
  return violations;
}

async function fetchJSON(url: string, options?: RequestInit): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({ error: "Invalid JSON" }));
    return { ok: res.ok, data, error: res.ok ? undefined : String(data) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  console.log(`\n🧪 Production Smoke Test\n`);
  console.log(`BASE_URL: ${BASE_URL || "NOT SET"}`);
  console.log(`WORKSPACE_ID: ${WORKSPACE_ID || "NOT SET"}`);
  console.log(`CRON_SECRET: ${CRON_SECRET ? "SET" : "NOT SET"}\n`);

  if (!BASE_URL) {
    console.error("❌ BASE_URL not set");
    process.exit(1);
  }

  // Test 1: Core Status
  console.log("\n1. Testing /api/system/core-status...");
  const statusRes = await fetchJSON(`${BASE_URL}/api/system/core-status?workspace_id=${WORKSPACE_ID}`);
  assert(statusRes.ok, "core-status returns 200", statusRes.error);
  if (statusRes.data) {
    const data = statusRes.data as Record<string, unknown>;
    assert(
      typeof data.inbound_processing_active === "boolean",
      "core-status has inbound_processing_active",
      undefined,
      data
    );
    assert(
      typeof data.dependence_level === "string",
      "core-status has dependence_level",
      undefined,
      data
    );
    const violations = checkDoctrineSafe(data);
    assert(violations.length === 0, "core-status is doctrine-safe", violations.join(", "));
  }

  // Test 2: Core Cron
  if (CRON_SECRET) {
    console.log("\n2. Testing /api/cron/core...");
    const cronRes = await fetchJSON(`${BASE_URL}/api/cron/core`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    assert(cronRes.ok, "cron/core returns 200", cronRes.error);
  } else {
    console.log("\n2. Skipping cron test (CRON_SECRET not set)");
  }

  // Test 3: Onboarding Identity
  console.log("\n3. Testing /api/onboard/identity...");
  const identityRes = await fetchJSON(`${BASE_URL}/api/onboard/identity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `test-${Date.now()}@example.com` }),
  });
  assert(identityRes.ok, "onboard/identity returns 200", identityRes.error);

  // Test 4: Create Thread (requires workspace_id from identity)
  let externalRef = "";
  if (identityRes.data && typeof identityRes.data === "object") {
    const data = identityRes.data as { workspace_id?: string };
    if (data.workspace_id) {
      console.log("\n4. Testing /api/onboard/create-thread...");
      const threadRes = await fetchJSON(`${BASE_URL}/api/onboard/create-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: data.workspace_id,
          subject_type: "agreement",
          subject_id: "test-smoke",
          counterparty_identifier: "test-counterparty",
        }),
      });
      assert(threadRes.ok, "onboard/create-thread returns 200", threadRes.error);
      if (threadRes.data && typeof threadRes.data === "object") {
        const threadData = threadRes.data as { external_ref?: string };
        if (threadData.external_ref) {
          externalRef = threadData.external_ref;
        }
      }
    }
  }

  // Test 5: Public Work (if thread created)
  if (externalRef) {
    console.log("\n5. Testing /api/public/work/[external_ref]...");
    const publicRes = await fetchJSON(`${BASE_URL}/api/public/work/${externalRef}`);
    assert(publicRes.ok, "public/work returns 200", publicRes.error);
    if (publicRes.data) {
      const violations = checkDoctrineSafe(publicRes.data);
      assert(violations.length === 0, "public/work is doctrine-safe", violations.join(", "));
      const data = publicRes.data as Record<string, unknown>;
      assert(!("workspace_id" in data), "public/work does not expose workspace_id");
      assert(!("thread_id" in data), "public/work does not expose thread_id");
      assert(!("id" in data), "public/work does not expose id");
    }
  } else {
    console.log("\n5. Skipping public/work test (no external_ref)");
  }

  // Test 6: Respond Confirm (if thread exists)
  if (externalRef) {
    console.log("\n6. Testing /api/public/work/[external_ref]/respond (confirm)...");
    const respondRes = await fetchJSON(`${BASE_URL}/api/public/work/${externalRef}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "confirm" }),
    });
    assert(respondRes.ok, "public/work/respond returns 200", respondRes.error);
  } else {
    console.log("\n6. Skipping respond test (no external_ref)");
  }

  // Test 7: Re-fetch Public Work (check state)
  if (externalRef) {
    console.log("\n7. Testing /api/public/work/[external_ref] (after confirm)...");
    const publicRes2 = await fetchJSON(`${BASE_URL}/api/public/work/${externalRef}`);
    assert(publicRes2.ok, "public/work returns 200 after confirm", publicRes2.error);
    if (publicRes2.data) {
      const data = publicRes2.data as Record<string, unknown>;
      assert(
        typeof data.can_follow_up === "boolean",
        "public/work has can_follow_up after confirm",
        undefined,
        data
      );
    }
  } else {
    console.log("\n7. Skipping re-fetch test (no external_ref)");
  }

  // Test 8: Post-Confirm Action
  if (externalRef) {
    console.log("\n8. Testing /api/public/work/[external_ref]/respond (schedule_follow_up)...");
    const followupRes = await fetchJSON(`${BASE_URL}/api/public/work/${externalRef}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "schedule_follow_up",
        actor_role: "counterparty",
      }),
    });
    assert(followupRes.ok, "public/work/respond (follow-up) returns 200", followupRes.error);
  } else {
    console.log("\n8. Skipping follow-up test (no external_ref)");
  }

  // Test 9: Export Record (requires auth - skip if no session)
  if (WORKSPACE_ID) {
    console.log("\n9. Testing /api/operational/export-record...");
    const exportRes = await fetchJSON(`${BASE_URL}/api/operational/export-record?workspace_id=${WORKSPACE_ID}`);
    if (exportRes.ok) {
      assert(true, "export-record returns 200");
      if (exportRes.data) {
        const data = exportRes.data as Record<string, unknown>;
        assert(Array.isArray(data.orientation), "export-record has orientation array");
        assert(Array.isArray(data.continuation), "export-record has continuation array");
        assert(Array.isArray(data.responsibilities), "export-record has responsibilities array");
        assert(Array.isArray(data.amendments), "export-record has amendments array");
        const violations = checkDoctrineSafe(data);
        assert(violations.length === 0, "export-record is doctrine-safe", violations.join(", "));
      }
    } else {
      assert(
        exportRes.error?.includes("Unauthorized") || exportRes.error?.includes("401"),
        "export-record requires auth (expected)",
        exportRes.error
      );
    }
  } else {
    console.log("\n9. Skipping export-record test (WORKSPACE_ID not set)");
  }

  // Test 10: Why Pay
  if (WORKSPACE_ID) {
    console.log("\n10. Testing /api/operational/why-pay...");
    const whyPayRes = await fetchJSON(`${BASE_URL}/api/operational/why-pay?workspace_id=${WORKSPACE_ID}`);
    if (whyPayRes.ok) {
      assert(true, "why-pay returns 200");
      if (whyPayRes.data) {
        const data = whyPayRes.data as Record<string, unknown>;
        assert(Array.isArray(data.lines), "why-pay has lines array");
        const violations = checkDoctrineSafe(data);
        assert(violations.length === 0, "why-pay is doctrine-safe", violations.join(", "));
      }
    } else {
      assert(
        whyPayRes.error?.includes("Unauthorized") || whyPayRes.error?.includes("401"),
        "why-pay requires auth (expected)",
        whyPayRes.error
      );
    }
  } else {
    console.log("\n10. Skipping why-pay test (WORKSPACE_ID not set)");
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("Test Summary");
  console.log("=".repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${results.length}`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}${r.error ? `: ${r.error}` : ""}`);
    });
    process.exit(1);
  }

  console.log("\n✅ All tests passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
