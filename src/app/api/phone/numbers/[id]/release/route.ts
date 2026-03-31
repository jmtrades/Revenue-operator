/**
 * POST /api/phone/numbers/[id]/release — Release (deactivate) a number from the workspace.
 * Fails if the number is assigned to an active agent (unassign in Agents first).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getTelephonyService } from "@/lib/telephony";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Look up a Telnyx phone number resource ID by its E.164 number.
 * Used as a fallback when provider_sid contains the order ID instead of the phone number ID.
 */
async function resolvePhoneNumberId(phoneNumberE164: string): Promise<string | null> {
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL("https://api.telnyx.com/v2/phone_numbers");
    url.searchParams.set("filter[phone_number]", phoneNumberE164);
    url.searchParams.set("page[size]", "1");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    return json.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.userId || !session?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { id: numberId } = await ctx.params;
  const db = getDb();

  const { data: row } = await db
    .from("phone_numbers")
    .select("id, workspace_id, phone_number, assigned_agent_id, status, provider_sid")
    .eq("id", numberId)
    .eq("workspace_id", session.workspaceId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Number not found" }, { status: 404 });
  }

  const number = row as { assigned_agent_id: string | null; provider_sid: string | null };
  const assignedAgentId = number.assigned_agent_id;
  if (assignedAgentId) {
    const { data: agent } = await db
      .from("agents")
      .select("id, is_active")
      .eq("id", assignedAgentId)
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    const isActive = (agent as { is_active?: boolean } | null)?.is_active ?? false;
    if (isActive) {
      return NextResponse.json(
        { error: "Unassign this number from the agent in Agents settings before releasing." },
        { status: 400 }
      );
    }
  }

  // Release from provider FIRST, before updating database
  const providerSid = number.provider_sid;
  const phoneE164 = (row as { phone_number?: string }).phone_number;
  if (providerSid) {
    const telephony = getTelephonyService();
    try {
      const result = await telephony.releaseNumber(providerSid);
      if ("error" in result && phoneE164) {
        // provider_sid might be an order ID (not phone number ID) — look up by E.164
        console.warn("[release] Direct release failed, resolving phone number ID by E.164:", phoneE164);
        const resolved = await resolvePhoneNumberId(phoneE164);
        if (resolved) {
          const retry = await telephony.releaseNumber(resolved);
          if ("error" in retry) {
            log("error", "[release] Retry failed:", { error: retry.error });
            return NextResponse.json(
              { error: "Failed to release number from provider. Please try again.", details: retry.error },
              { status: 500 }
            );
          }
        } else {
          // Number may already be released on Telnyx side — proceed with DB cleanup
          console.warn("[release] Could not resolve phone number ID — may already be released on Telnyx");
        }
      }
    } catch (e) {
      log("error", "Failed to release number from provider:", { error: e });
      return NextResponse.json(
        { error: "Failed to release number from provider. Please try again.", details: String(e) },
        { status: 500 }
      );
    }
  }

  // Update database AFTER provider release succeeds
  const { error } = await db
    .from("phone_numbers")
    .update({
      status: "released",
      assigned_agent_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", numberId)
    .eq("workspace_id", session.workspaceId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // If this was the primary number in phone_configs, clear or switch to another active number
  const releasedPhone = (row as { phone_number?: string }).phone_number;
  if (releasedPhone) {
    const { data: configRow } = await db
      .from("phone_configs")
      .select("proxy_number")
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();
    const currentProxy = (configRow as { proxy_number?: string } | null)?.proxy_number;
    const normalizedReleased = releasedPhone.replace(/\s/g, "");
    const normalizedProxy = (currentProxy ?? "").replace(/\s/g, "");
    if (normalizedProxy && normalizedReleased && normalizedProxy === normalizedReleased) {
      const { data: otherNumber } = await db
        .from("phone_numbers")
        .select("phone_number")
        .eq("workspace_id", session.workspaceId)
        .eq("status", "active")
        .neq("id", numberId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNumber = (otherNumber as { phone_number?: string } | null)?.phone_number ?? null;
      await db
        .from("phone_configs")
        .update({
          proxy_number: nextNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace_id", session.workspaceId);
    }
  }

  return NextResponse.json({ ok: true });
}
