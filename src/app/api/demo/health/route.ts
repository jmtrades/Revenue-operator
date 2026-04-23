/**
 * GET /api/demo/health — Diagnostic endpoint to check Telnyx Call Control configuration.
 * Returns status of all required environment variables and tests the Telnyx API connection.
 * Protected: only accessible with the correct admin token or from localhost.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    // Auth check — require admin token or query param
    const authHeader = req.headers.get("authorization");
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (!adminToken) {
      return NextResponse.json({ error: "Admin endpoint — ADMIN_API_TOKEN not configured" }, { status: 401 });
    }
    const isAuthed = authHeader === `Bearer ${adminToken}`;
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token");
    const hasQueryToken = queryToken === adminToken;

    if (!isAuthed && !hasQueryToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const checks: Record<string, { status: string; detail?: string }> = {};

  // 1. Check TELNYX_API_KEY — never expose key material
  const apiKey = process.env.TELNYX_API_KEY;
  checks.TELNYX_API_KEY = apiKey
    ? { status: "ok", detail: "Configured" }
    : { status: "missing", detail: "Not set in environment" };

  // 2. Check TELNYX_CONNECTION_ID — redact the actual value
  const connectionId = process.env.TELNYX_CONNECTION_ID;
  checks.TELNYX_CONNECTION_ID = connectionId
    ? { status: "ok", detail: "Configured" }
    : { status: "missing", detail: "Not set in environment" };

  // 3. Check TELNYX_PHONE_NUMBER — redact actual number
  const phoneNumber = process.env.TELNYX_PHONE_NUMBER;
  checks.TELNYX_PHONE_NUMBER = phoneNumber
    ? { status: "ok", detail: "Configured" }
    : { status: "warning", detail: "Not set — will try DB fallback" };

  // 4. Check WEBHOOK_BASE_URL / APP_URL — only show domain, not full URL
  const webhookUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  checks.WEBHOOK_URL = webhookUrl
    ? { status: "ok", detail: "Configured" }
    : { status: "warning", detail: "Not explicitly set" };

  // 5. Test Telnyx API connectivity (list phone numbers)
  if (apiKey) {
    try {
      const res = await fetch("https://api.telnyx.com/v2/phone_numbers?page[size]=1", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const data = await res.json();
        const count = data?.meta?.total_results ?? "unknown";
        checks.TELNYX_API_CONNECTIVITY = {
          status: "ok",
          detail: `API reachable, ${count} phone numbers on account`,
        };
      } else {
        const errorData = await res.json().catch(() => ({}));
        log("warn", "demo.health.telnyx-api-error", { status: res.status, error: errorData });
        checks.TELNYX_API_CONNECTIVITY = {
          status: "error",
          detail: `HTTP ${res.status}: (check logs for details)`,
        };
      }
    } catch (err) {
      log("error", "demo.health.telnyx-connectivity-error", { error: String(err) });
      checks.TELNYX_API_CONNECTIVITY = {
        status: "error",
        detail: `Network error (check logs for details)`,
      };
    }
  }

  // 6. Test Call Control connection — try all 3 Telnyx connection types
  if (apiKey && connectionId) {
    const endpoints = [
      { type: "Call Control App", path: `/call_control_applications/${connectionId}` },
      { type: "Credential Connection", path: `/credential_connections/${connectionId}` },
      { type: "FQDN Connection", path: `/fqdn_connections/${connectionId}` },
    ];

    let found = false;
    for (const ep of endpoints) {
      try {
        const res = await fetch(`https://api.telnyx.com/v2${ep.path}`, {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = await res.json();
          const name = data?.data?.connection_name || data?.data?.application_name || data?.data?.id;
          checks.TELNYX_CONNECTION = {
            status: "ok",
            detail: `${ep.type}: ${name || connectionId}`,
          };
          found = true;
          break;
        }
      } catch {
        // try next
      }
    }

    if (!found) {
      // Try to list all Call Control Applications to suggest the right ID
      try {
        const listRes = await fetch("https://api.telnyx.com/v2/call_control_applications?page[size]=5", {
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const apps = (listData?.data || []) as Array<{ id?: string; application_name?: string; active?: boolean }>;
          if (apps.length > 0) {
            const appList = apps.map((a) => `${a.id} (${a.application_name || "unnamed"}, active=${a.active})`).join("; ");
            checks.TELNYX_CONNECTION = {
              status: "error",
              detail: `Connection ID ${connectionId} not found. Available Call Control Apps: ${appList}`,
            };
          } else {
            checks.TELNYX_CONNECTION = {
              status: "error",
              detail: `Connection ID ${connectionId} not found. No Call Control Applications exist on this account — create one at portal.telnyx.com > Voice > Call Control Applications`,
            };
          }
        } else {
          checks.TELNYX_CONNECTION = {
            status: "error",
            detail: `Connection ID ${connectionId} not found across all connection types (credential, FQDN, call_control). Verify in Telnyx portal.`,
          };
        }
      } catch {
        checks.TELNYX_CONNECTION = {
          status: "error",
          detail: `Connection ID ${connectionId} not found. Could not list alternatives.`,
        };
      }
    }
  }

  // 7. Check DB fallback phone number
  if (!phoneNumber) {
    try {
      const db = (await import("@/lib/db/queries")).getDb();
      const DEMO_WORKSPACE = process.env.DEMO_WORKSPACE_ID ?? "";

      const { data: cfg } = await db
        .from("phone_configs")
        .select("proxy_number")
        .eq("workspace_id", DEMO_WORKSPACE)
        .eq("status", "active")
        .maybeSingle();

      const dbNumber = (cfg as { proxy_number?: string } | null)?.proxy_number;

      if (dbNumber) {
        checks.DB_PHONE_FALLBACK = {
          status: "ok",
          detail: `Found in phone_configs: ${dbNumber}`,
        };
      } else {
        const { data: pn } = await db
          .from("phone_numbers")
          .select("phone_number")
          .eq("workspace_id", DEMO_WORKSPACE)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        const dbNum2 = (pn as { phone_number?: string } | null)?.phone_number;
        checks.DB_PHONE_FALLBACK = dbNum2
          ? { status: "ok", detail: `Found in phone_numbers: ${dbNum2}` }
          : { status: "error", detail: `No active phone number in DB for workspace ${DEMO_WORKSPACE || "(not set)"}` };
      }
    } catch (err) {
      checks.DB_PHONE_FALLBACK = {
        status: "error",
        detail: "DB connectivity check failed",
      };
    }
  }

    const allOk = Object.values(checks).every(
      (c) => c.status === "ok" || c.status === "warning",
    );

    return NextResponse.json({
      healthy: allOk,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (err) {
    log("error", "demo.health.GET", { error: String(err) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
