export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

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

  const db = getDb();
  const { data: settings, error: settingsError } = await db
    .from("workspace_settings")
    .select("key, value")
    .eq("workspace_id", workspaceId)
    .in("key", [
      "ai_score_on_call_complete",
      "ai_score_on_message_received",
      "ai_score_on_appointment_booked",
      "ai_rescore_interval_hours",
    ]);

  if (settingsError) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }

  const settingMap = (settings ?? []).reduce(
    (acc: Record<string, string>, s: { key: string; value: string | null }) => {
      if (s.value !== null) {
        acc[s.key] = s.value;
      }
      return acc;
    },
    {}
  );

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

  const db = getDb();

  const settingUpserts = [
    {
      workspace_id: workspaceId,
      key: "ai_score_on_call_complete",
      value: String(body.score_on_call_complete ?? DEFAULT_RULES.score_on_call_complete),
    },
    {
      workspace_id: workspaceId,
      key: "ai_score_on_message_received",
      value: String(
        body.score_on_message_received ?? DEFAULT_RULES.score_on_message_received
      ),
    },
    {
      workspace_id: workspaceId,
      key: "ai_score_on_appointment_booked",
      value: String(
        body.score_on_appointment_booked ?? DEFAULT_RULES.score_on_appointment_booked
      ),
    },
    {
      workspace_id: workspaceId,
      key: "ai_rescore_interval_hours",
      value: String(
        body.rescore_interval_hours ?? DEFAULT_RULES.rescore_interval_hours
      ),
    },
  ];

  const { error: upsertError } = await db
    .from("workspace_settings")
    .upsert(settingUpserts, { onConflict: "workspace_id,key" });

  if (upsertError) {
    console.error("[AI Score Rules] Upsert error:", upsertError);
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
