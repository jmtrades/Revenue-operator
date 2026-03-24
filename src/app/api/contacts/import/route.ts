/**
 * POST /api/contacts/import — Bulk create contacts from CSV/JSON (e.g. name, phone, email).
 * Works identically to /api/leads/import but targets the contacts endpoint.
 * Contacts and leads share the same underlying table (leads table).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";

/**
 * Simple CSV parser that handles quoted fields and commas
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header row
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

  // Parse data rows
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  const contentType = req.headers.get("content-type") || "";
  let rows: Array<{ name?: string; phone?: string; email?: string; company?: string; notes?: string }> = [];

  // Check if CSV or form data
  if (contentType.includes("multipart/form-data") || contentType.includes("text/csv")) {
    try {
      const text = await req.text();
      const csvRows = parseCSV(text);
      rows = csvRows.map((r) => ({
        name: r.name || r.full_name || r.contact_name || "",
        phone: r.phone || r.phone_number || r.contact_phone || "",
        email: r.email || r.email_address || r.contact_email || "",
        company: r.company || r.organization || r.business_name || "",
        notes: r.notes || r.comments || r.description || "",
      }));
    } catch {
      return NextResponse.json({ error: "Invalid CSV format" }, { status: 400 });
    }
  } else {
    // JSON format
    let body: { contacts?: Array<{ name?: string; phone?: string; email?: string; company?: string; notes?: string }> };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    rows = Array.isArray(body.contacts) ? body.contacts : [];
  }

  const valid = rows
    .map((r) => ({
      name: (r.name ?? "").toString().trim(),
      phone: (r.phone ?? "").toString().trim().replace(/\s/g, ""),
      email: (r.email ?? "").toString().trim() || null,
      company: (r.company ?? "").toString().trim() || null,
      notes: (r.notes ?? "").toString().trim() || null,
    }))
    .filter((r) => {
      // Validate: name required, phone must contain only digits and be 10-15 chars
      if (r.name.length === 0) return false;
      const digits = r.phone.replace(/\D/g, "");
      return /^\d+$/.test(digits) && digits.length >= 10 && digits.length <= 15;
    });

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid contacts (need name and phone with at least 10 digits)" }, { status: 400 });
  }

  const db = getDb();
  const toInsert = valid.map((r) => ({
    workspace_id: workspaceId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    company: r.company,
    status: "NEW",
    metadata: { source: "csv_import", notes: r.notes, score: 40 },
  }));

  const { data, error } = await db.from("leads").insert(toInsert).select("id");
  if (error) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  const imported = Array.isArray(data) ? data.length : 0;
  return NextResponse.json({ imported, skipped: valid.length - imported });
}
