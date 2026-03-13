import { NextRequest } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authSession = await getSession(req);
  const workspaceId =
    req.nextUrl.searchParams.get("workspace_id") || authSession?.workspaceId;
  if (!workspaceId) {
    return new Response("workspace_id required", { status: 400 });
  }
  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const db = getDb();
  const { data: sessions, error } = await db
    .from("call_sessions")
    .select(
      `
      id, lead_id, matched_lead_id, outcome, started_at, ended_at,
      workspace_id, provider, call_started_at, call_ended_at,
      transcript_text, summary
    `,
    )
    .eq("workspace_id", workspaceId)
    .order("started_at", { ascending: false })
    .limit(1000);

  if (error) {
    return new Response("Failed to load calls", { status: 500 });
  }

  const rows = (sessions ?? []) as Array<{
    id: string;
    call_started_at?: string | null;
    call_ended_at?: string | null;
    outcome?: string | null;
    provider?: string | null;
    transcript_text?: string | null;
    summary?: string | null;
  }>;

  const header = [
    "Call ID",
    "Started at",
    "Ended at",
    "Duration (seconds)",
    "Outcome",
    "Provider",
    "Summary",
    "Transcript (truncated)",
  ];

  const csvLines = [
    header.join(","),
    ...rows.map((c) => {
      const start = c.call_started_at ?? null;
      const end = c.call_ended_at ?? null;
      const duration =
        start && end
          ? Math.max(
              0,
              Math.floor(
                (new Date(end).getTime() - new Date(start).getTime()) / 1000,
              ),
            )
          : 0;

      const safe = (value: unknown) => {
        if (value == null) return "";
        const str = String(value);
        const cleaned = str.replace(/"/g, '""').replace(/\r?\n/g, " ");
        return `"${cleaned}"`;
      };

      return [
        safe(c.id),
        safe(c.call_started_at ?? ""),
        safe(c.call_ended_at ?? ""),
        duration,
        safe(c.outcome ?? ""),
        safe(c.provider ?? ""),
        safe(c.summary ?? ""),
        safe((c.transcript_text ?? "").slice(0, 4000)),
      ].join(",");
    }),
  ].join("\n");

  return new Response(csvLines, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recall-touch-calls.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

