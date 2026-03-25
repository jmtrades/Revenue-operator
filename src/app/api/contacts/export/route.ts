import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { checkRateLimit } from "@/lib/rate-limit";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

function toCsvValue(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.userId || !session.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await checkRateLimit(`contacts-export:${session.workspaceId}`, 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const db = getDb();
    const { data, error } = await db
      .from("leads")
      .select("first_name,last_name,phone,email,state,tags,total_revenue_attributed,created_at,last_activity_at")
      .eq("workspace_id", session.workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const rows = (data ?? []) as Array<{
      first_name?: string | null;
      last_name?: string | null;
      phone?: string | null;
      email?: string | null;
      state?: string | null;
      tags?: string[] | null;
      total_revenue_attributed?: number | null;
      created_at?: string | null;
      last_activity_at?: string | null;
    }>;

    const header = [
      "name",
      "phone",
      "email",
      "state",
      "tags",
      "total_revenue_attributed",
      "created_at",
      "last_activity_at",
    ];
    const lines = [header.join(",")];
    for (const row of rows) {
      const fullName = [row.first_name ?? "", row.last_name ?? ""].join(" ").trim();
      lines.push(
        [
          toCsvValue(fullName),
          toCsvValue(row.phone ?? ""),
          toCsvValue(row.email ?? ""),
          toCsvValue(row.state ?? ""),
          toCsvValue((row.tags ?? []).join("|")),
          toCsvValue(row.total_revenue_attributed ?? 0),
          toCsvValue(row.created_at ?? ""),
          toCsvValue(row.last_activity_at ?? ""),
        ].join(","),
      );
    }

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to export contacts" }, { status: 500 });
  }
}

