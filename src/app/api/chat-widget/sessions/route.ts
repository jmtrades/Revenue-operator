export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";
import { assertSameOrigin } from "@/lib/http/csrf";
import { log } from "@/lib/logger";

interface ChatSession {
  id: string;
  workspace_id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_token: string;
  status: string;
  unread_count: number;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/chat-widget/sessions
 * List active chat sessions for a workspace (requires workspace auth)
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const status = req.nextUrl.searchParams.get("status") || "active";

  try {
    const db = getDb();
    let query = db
      .from("chat_widget_sessions")
      .select(
        `
        id,
        workspace_id,
        visitor_name,
        visitor_email,
        visitor_token,
        status,
        unread_count,
        resolved_at,
        created_at,
        updated_at
      `
      )
      .eq("workspace_id", session.workspaceId);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data } = await query.order("created_at", { ascending: false });

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    log("error", "[chat-widget/sessions GET]", { error: error });
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat-widget/sessions
 * Create a new chat session (public endpoint for visitors)
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  // Rate limit: 10 new sessions per minute per IP (prevents abuse from public endpoint)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`chat-widget-session:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a moment." },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as {
      workspace_id: string;
      visitor_name: string;
      visitor_email?: string;
    };

    const { workspace_id, visitor_name, visitor_email } = body;

    if (!workspace_id || !visitor_name?.trim()) {
      return NextResponse.json(
        { error: "workspace_id and visitor_name are required" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const trimmedName = visitor_name.trim().slice(0, 200);
    const trimmedEmail = visitor_email?.trim().slice(0, 320) || null;

    // Basic email format check if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Generate unique visitor token
    const visitorToken = crypto.randomBytes(16).toString("hex");

    // Actual columns: workspace_id, visitor_name, visitor_email, visitor_token, status, unread_count
    const { data, error } = await db
      .from("chat_widget_sessions")
      .insert({
        workspace_id,
        visitor_name: trimmedName,
        visitor_email: trimmedEmail,
        visitor_token: visitorToken,
        status: "active",
        unread_count: 0,
      })
      .select()
      .single();

    if (error) {
      log("error", "[chat-widget/sessions POST]", { error: error });
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    log("error", "[chat-widget/sessions POST]", { error: error });
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
