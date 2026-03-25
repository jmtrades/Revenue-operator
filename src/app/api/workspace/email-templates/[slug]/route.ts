/**
 * GET /api/workspace/email-templates/[slug] — Get one template.
 * PATCH /api/workspace/email-templates/[slug] — Update template.
 * DELETE /api/workspace/email-templates/[slug] — Delete template.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { getTemplate } from "@/lib/integrations/email";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const { slug } = await params;
  const template = await getTemplate(session.workspaceId, slug);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrPatch = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPatch) return authErrPatch;

  const { slug } = await params;
  let body: { name?: string; subject?: string; html_body?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const updates: { name?: string; subject?: string; html_body?: string; updated_at: string } = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.subject === "string") updates.subject = body.subject.trim();
  if (typeof body.html_body === "string") updates.html_body = body.html_body;

  const { data, error } = await db
    .from("email_templates")
    .update(updates)
    .eq("workspace_id", session.workspaceId)
    .eq("slug", slug)
    .select("id, slug, name, subject, html_body, created_at, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrDel = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrDel) return authErrDel;

  const { slug } = await params;
  const db = getDb();
  const { error } = await db.from("email_templates").delete().eq("workspace_id", session.workspaceId).eq("slug", slug);
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
