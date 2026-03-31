export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

interface WidgetConfig {
  enabled: boolean;
  accent_color: string;
  position: string;
  greeting_message: string;
  agent_name: string;
  avatar_url?: string;
  auto_open_delay: number;
}

/**
 * GET /api/chat-widget/config?workspace_id=xxx
 * Returns widget configuration for a workspace (public access via workspace_id param)
 */
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id query parameter required" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const { data } = await db
      .from("chat_widget_config")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    const config = data as WidgetConfig | null;

    if (!config) {
      return NextResponse.json(
        {
          enabled: false,
          accent_color: "#3b82f6",
          position: "bottom-right",
          greeting_message: "Hi! How can we help you today?",
          agent_name: "Support Agent",
          avatar_url: null,
          auto_open_delay: 0,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    log("error", "[chat-widget/config GET]", { error: error });
    return NextResponse.json(
      { error: "Failed to fetch widget config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-widget/config
 * Update widget configuration (requires workspace auth)
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  try {
    const body = (await req.json()) as Partial<WidgetConfig>;
    const db = getDb();

    const { data: existing } = await db
      .from("chat_widget_config")
      .select("id")
      .eq("workspace_id", session.workspaceId)
      .maybeSingle();

    const updatePayload = {
      enabled: body.enabled ?? undefined,
      accent_color: body.accent_color ?? undefined,
      position: body.position ?? undefined,
      greeting_message: body.greeting_message ?? undefined,
      agent_name: body.agent_name ?? undefined,
      avatar_url: body.avatar_url ?? undefined,
      auto_open_delay: body.auto_open_delay ?? undefined,
      updated_at: new Date().toISOString(),
    };

    Object.keys(updatePayload).forEach(
      (key) =>
        updatePayload[key as keyof typeof updatePayload] === undefined &&
        delete updatePayload[key as keyof typeof updatePayload]
    );

    if (existing) {
      const { data } = await db
        .from("chat_widget_config")
        .update(updatePayload)
        .eq("workspace_id", session.workspaceId)
        .select()
        .single();

      return NextResponse.json(data, { status: 200 });
    } else {
      const { data } = await db
        .from("chat_widget_config")
        .insert({
          workspace_id: session.workspaceId,
          enabled: body.enabled ?? false,
          accent_color: body.accent_color ?? "#3b82f6",
          position: body.position ?? "bottom-right",
          greeting_message: body.greeting_message ?? "Hi! How can we help you today?",
          agent_name: body.agent_name ?? "Support Agent",
          avatar_url: body.avatar_url ?? null,
          auto_open_delay: body.auto_open_delay ?? 0,
        })
        .select()
        .single();

      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    log("error", "[chat-widget/config POST]", { error: error });
    return NextResponse.json(
      { error: "Failed to update widget config" },
      { status: 500 }
    );
  }
}
