/**
 * GET /api/workspace/email-templates/[slug] — Get one template.
 * PATCH /api/workspace/email-templates/[slug] — Update template.
 * DELETE /api/workspace/email-templates/[slug] — Delete template.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { getTemplate } from "@/lib/integrations/email";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { slug } = await params;
  let body: { name?: string; subject?: string; body_html?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const updates: { name?: string; subject?: string; body_html?: string; updated_at: string } = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.subject === "string") updates.subject = body.subject.trim();
  if (typeof body.body_html === "string") updates.body_html = body.body_html;

  const { data, error } = await db
    .from("email_templates")
    .update(updates)
    .eq("workspace_id", session.workspaceId)
    .eq("slug", slug)
    .select("id, slug, name, subject, body_html, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const db = getDb();
  const { error } = await db.from("email_templates").delete().eq("workspace_id", session.workspaceId).eq("slug", slug);
  if (error) return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
