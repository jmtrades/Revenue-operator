/**
 * POST /api/leads/import — Bulk create leads from CSV/JSON (e.g. name, phone, email).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  let body: { leads?: Array<{ name?: string; phone?: string; email?: string; service_requested?: string; notes?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const rows = Array.isArray(body.leads) ? body.leads : [];
  const valid = rows
    .map((r) => ({
      name: (r.name ?? "").toString().trim(),
      phone: (r.phone ?? "").toString().trim().replace(/\s/g, ""),
      email: (r.email ?? "").toString().trim() || null,
      service_requested: (r.service_requested ?? "").toString().trim() || null,
      notes: (r.notes ?? "").toString().trim() || null,
    }))
    .filter((r) => {
      // Validate: name required, phone must contain only digits and be 10-15 chars
      if (r.name.length === 0) return false;
      const digits = r.phone.replace(/\D/g, "");
      return /^\d+$/.test(digits) && digits.length >= 10 && digits.length <= 15;
    });

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid leads (need name and phone with at least 10 digits)" }, { status: 400 });
  }

  const db = getDb();
  const toInsert = valid.map((r) => ({
    workspace_id: workspaceId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    company: r.service_requested,
    state: "new",
    metadata: { source: "csv_import", service_requested: r.service_requested, notes: r.notes, score: 40 },
  }));

  const { data, error } = await db.from("leads").insert(toInsert).select("id");
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  const imported = Array.isArray(data) ? data.length : 0;
  return NextResponse.json({ imported, skipped: valid.length - imported });
}
