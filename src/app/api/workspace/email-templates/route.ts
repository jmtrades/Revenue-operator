/**
 * GET /api/workspace/email-templates — List email templates for workspace.
 * POST /api/workspace/email-templates — Create template (slug, name, subject, html_body).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErr = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data } = await db
    .from("email_templates")
    .select("id, slug, name, subject, html_body, created_at, updated_at")
    .eq("workspace_id", session.workspaceId)
    .order("slug");

  const list = (data ?? []) as { id: string; slug: string; name: string; subject: string; html_body: string; created_at: string; updated_at: string }[];
  return NextResponse.json({ templates: list });
}

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;


  const session = await getSession(req);
  if (!session?.workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authErrPost = await requireWorkspaceAccess(req, session.workspaceId);
  if (authErrPost) return authErrPost;

  let body: { slug: string; name: string; subject: string; html_body: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase().replace(/\s+/g, "_") : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html_body = typeof body.html_body === "string" ? body.html_body : "";
  if (!slug || !name) return NextResponse.json({ error: "slug and name required" }, { status: 400 });

  // Validate size limits
  if (name.length > 255) {
    return NextResponse.json({ error: "Template name must be 255 characters or less" }, { status: 400 });
  }
  if (subject.length > 500) {
    return NextResponse.json({ error: "Subject must be 500 characters or less" }, { status: 400 });
  }
  if (html_body.length > 1048576) {
    return NextResponse.json({ error: "HTML body must be 1MB (1,048,576 characters) or less" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("email_templates")
    .insert({
      workspace_id: session.workspaceId,
      slug,
      name,
      subject: subject || name,
      html_body: html_body || "",
      created_at: now,
      updated_at: now,
    })
    .select("id, slug, name, subject, html_body, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Template slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ template: data });
}
