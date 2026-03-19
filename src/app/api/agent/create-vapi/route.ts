import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSession } from "@/lib/auth/request-session";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { agent_id?: unknown } | null;
    const agentId =
      typeof body?.agent_id === "string" && body.agent_id.trim().length > 0 ? body.agent_id.trim() : null;

    if (!agentId) {
      return NextResponse.json({ error: "agent_id required" }, { status: 400 });
    }

    // Deprecated: the Vapi voice system is no longer supported.
    return NextResponse.json(
      { error: "Vapi integration has been deprecated. Use Recall voice system." },
      { status: 410 },
    );
  } catch (error) {
    if (error instanceof Error) Sentry.captureException(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
