/**
 * GET /api/workspace/email-queue — Recent email deliveries (delivery log) for workspace.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limitParam ?? "", 10) || DEFAULT_LIMIT));
  const status = req.nextUrl.searchParams.get("status"); // optional filter: pending | sent | failed

  const db = getDb();
  let q = db
    .from("email_send_queue")
    .select("id, to_email, subject, status, external_id, template_slug, error_message, sent_at, created_at")
    .eq("workspace_id", session.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status === "pending" || status === "sent" || status === "failed") {
    q = q.eq("status", status);
  }
  const { data, error: dbErr } = await q;

  if (dbErr) return NextResponse.json({ error: "Could not update workspace settings. Please try again." }, { status: 500 });
  const list = (data ?? []) as {
    id: string;
    to_email: string;
    subject: string;
    status: string;
    external_id: string | null;
    template_slug: string | null;
    error_message: string | null;
    sent_at: string | null;
    created_at: string;
  }[];
  const deliveries = list.map((d) => ({
    id: d.id,
    to_email: d.to_email,
    subject: d.subject,
    status: d.status,
    external_id: d.external_id,
    error_message: d.error_message,
    sent_at: d.sent_at,
    created_at: d.created_at,
    template_slug: d.template_slug,
  }));
  return NextResponse.json({ deliveries });
}
