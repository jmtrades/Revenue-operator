export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getWorkspaceSettings, setWorkspaceSettings } from "@/lib/db/workspace-settings";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

export interface AutoScoringRules {
  score_on_call_complete: boolean;
  score_on_message_received: boolean;
  score_on_appointment_booked: boolean;
  rescore_interval_hours: number;
}

const DEFAULT_RULES: AutoScoringRules = {
  score_on_call_complete: true,
  score_on_message_received: false,
  score_on_appointment_booked: true,
  rescore_interval_hours: 24,
};

export async function GET(req: NextRequest) {
  const authSession = await getSession(req);
  const workspaceId =
    req.nextUrl.searchParams.get("workspace_id") || authSession?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id required" },
      { status: 400 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  let settingMap: Record<string, string>;
  try {
    settingMap = await getWorkspaceSettings(workspaceId, [
      "ai_score_on_call_complete",
      "ai_score_on_message_received",
      "ai_score_on_appointment_booked",
      "ai_rescore_interval_hours",
    ]);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }

  const rules: AutoScoringRules = {
    score_on_call_complete:
      settingMap["ai_score_on_call_complete"] === "true"
        ? true
        : DEFAULT_RULES.score_on_call_complete,
    score_on_message_received:
      settingMap["ai_score_on_message_received"] === "true"
        ? true
        : DEFAULT_RULES.score_on_message_received,
    score_on_appointment_booked:
      settingMap["ai_score_on_appointment_booked"] === "true"
        ? true
        : DEFAULT_RULES.score_on_appointment_booked,
    rescore_interval_hours:
      parseInt(settingMap["ai_rescore_interval_hours"] ?? "", 10) ||
      DEFAULT_RULES.rescore_interval_hours,
  };

  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const authSession = await getSession(req);
  const workspaceId =
    req.nextUrl.searchParams.get("workspace_id") || authSession?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id required" },
      { status: 400 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  let body: Partial<AutoScoringRules>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await setWorkspaceSettings(workspaceId, {
      ai_score_on_call_complete: String(body.score_on_call_complete ?? DEFAULT_RULES.score_on_call_complete),
      ai_score_on_message_received: String(body.score_on_message_received ?? DEFAULT_RULES.score_on_message_received),
      ai_score_on_appointment_booked: String(body.score_on_appointment_booked ?? DEFAULT_RULES.score_on_appointment_booked),
      ai_rescore_interval_hours: String(body.rescore_interval_hours ?? DEFAULT_RULES.rescore_interval_hours),
    });
  } catch (upsertError) {
    log("error", "[AI Score Rules] Upsert error:", { error: upsertError });
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  const rules: AutoScoringRules = {
    score_on_call_complete:
      body.score_on_call_complete ?? DEFAULT_RULES.score_on_call_complete,
    score_on_message_received:
      body.score_on_message_received ?? DEFAULT_RULES.score_on_message_received,
    score_on_appointment_booked:
      body.score_on_appointment_booked ?? DEFAULT_RULES.score_on_appointment_booked,
    rescore_interval_hours:
      body.rescore_interval_hours ?? DEFAULT_RULES.rescore_interval_hours,
  };

  return NextResponse.json(rules);
}
