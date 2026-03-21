import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId =
    req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: leads, error } = await db
    .from("leads")
    .select(
      `
      id, name, email, phone, company, state, last_activity_at, metadata
    `,
    )
    .eq("workspace_id", workspaceId)
    .order("last_activity_at", { ascending: false })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }

  const rows = (leads ?? []) as Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    state: string;
    last_activity_at: string;
    metadata?: { source?: string; service_requested?: string; notes?: string; score?: number } | null;
  }>;

  const header = [
    "Lead ID",
    "Name",
    "Phone",
    "Email",
    "Status",
    "Source",
    "Service requested",
    "Score",
    "Last activity at",
    "Notes",
  ];

  const safe = (value: unknown) => {
    if (value == null) return "";
    const str = String(value);
    const cleaned = str.replace(/"/g, '""').replace(/\r?\n/g, " ");
    return `"${cleaned}"`;
  };

  const csvLines = [
    header.join(","),
    ...rows.map((l) => {
      const meta = l.metadata ?? {};
      return [
        safe(l.id),
        safe(l.name ?? ""),
        safe(l.phone ?? ""),
        safe(l.email ?? ""),
        safe(l.state ?? ""),
        safe(meta.source ?? ""),
        safe(meta.service_requested ?? ""),
        meta.score ?? "",
        safe(l.last_activity_at ?? ""),
        safe(meta.notes ?? ""),
      ].join(",");
    }),
  ].join("\n");

  return new Response(csvLines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recall-touch-leads.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

