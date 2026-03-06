/**
 * Admin CSV export: signups. Allowed only when session user email === ADMIN_EMAIL.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();

async function isAdmin(req: NextRequest): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  const session = await getSession(req);
  if (!session?.userId) return false;
  try {
    const db = getDb();
    const { data } = await db.from("users").select("email").eq("id", session.userId).single();
    const email = (data as { email?: string } | null)?.email ?? null;
    return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const headers = ["name", "business_name", "email", "phone", "industry", "website", "status", "created_at"];
  let rows: string[][] = [];
  try {
    const db = getDb();
    const { data } = await db.from("signups").select("name, business_name, email, phone, industry, website, status, created_at").order("created_at", { ascending: false });
    rows = (data ?? []).map((r: Record<string, unknown>) =>
      headers.map((h) => escapeCsvCell(String(r[h] ?? "")))
    );
  } catch {
    // table may not exist
  }
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="recall-touch-signups-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
