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
import { normalizePhoneE164 } from "@/lib/phone/normalize";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

/**
 * CSV parser that properly handles quoted fields with commas
 * Supports both single and double quoted fields
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
  );

  // Parse data rows
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").trim();
    });
    return row;
  });
}

/**
 * Parse a single CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar && nextChar !== quoteChar) {
      inQuotes = false;
    } else if (inQuotes && char === quoteChar && nextChar === quoteChar) {
      // Escaped quote
      current += char;
      i++;
    } else if (!inQuotes && char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_SIZE = 10000;

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  const workspaceId = session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const err = await requireWorkspaceAccess(req, workspaceId);
  if (err) return err;

  // Rate limiting: 3 requests per minute per workspace for bulk imports
  const rl = await checkRateLimit(`contacts:import:${workspaceId}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Check content length
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  const contentType = req.headers.get("content-type") || "";
  let rows: Array<{ name?: string; phone?: string; email?: string; company?: string; notes?: string }> = [];

  // Check if CSV or form data
  if (contentType.includes("multipart/form-data") || contentType.includes("text/csv")) {
    try {
      const text = await req.text();

      // Validate file size in case content-length was missing
      const textSize = new Blob([text]).size;
      if (textSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        );
      }

      const csvRows = parseCSV(text);

      // Enforce max batch size
      if (csvRows.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          { error: `CSV exceeds maximum of ${MAX_BATCH_SIZE} rows. Please split into smaller batches.` },
          { status: 400 }
        );
      }

      rows = csvRows.map((r) => ({
        name: r.name || r.full_name || r.contact_name || "",
        phone: r.phone || r.phone_number || r.contact_phone || "",
        email: r.email || r.email_address || r.contact_email || "",
        company: r.company || r.organization || r.business_name || "",
        notes: r.notes || r.comments || r.description || "",
      }));
    } catch (e) {
      if (e instanceof Error && e.message.includes("exceeds maximum")) {
        return NextResponse.json({ error: "File exceeds maximum allowed size" }, { status: 400 });
      }
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

    if (rows.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch exceeds maximum of ${MAX_BATCH_SIZE} contacts. Please split into smaller batches.` },
        { status: 400 }
      );
    }
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const valid = rows
    .map((r, idx) => ({
      index: idx,
      name: (r.name ?? "").toString().trim(),
      phone: (r.phone ?? "").toString().trim().replace(/\s/g, ""),
      email: (r.email ?? "").toString().trim() || null,
      company: (r.company ?? "").toString().trim() || null,
      notes: (r.notes ?? "").toString().trim() || null,
    }))
    .filter((r) => {
      // Validate: name required, phone must contain only digits and be 10-15 chars
      if (r.name.length === 0) {
        errors.push({ row: r.index + 1, reason: "Missing name" });
        return false;
      }
      const digits = r.phone.replace(/\D/g, "");
      if (!/^\d+$/.test(digits) || digits.length < 10 || digits.length > 15) {
        errors.push({ row: r.index + 1, reason: "Invalid phone number" });
        return false;
      }
      // Validate email format if provided
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
        errors.push({ row: r.index + 1, reason: "Invalid email format" });
        return false;
      }
      return true;
    });

  if (valid.length === 0) {
    return NextResponse.json(
      { imported: 0, skipped: rows.length, errors: errors.slice(0, 10) },
      { status: 400 }
    );
  }

  const db = getDb();
  const toInsert = valid.map((r) => ({
    workspace_id: workspaceId,
    name: r.name,
    phone: normalizePhoneE164(r.phone),
    email: r.email,
    company: r.company,
    state: "NEW",
    metadata: { source: "csv_import", notes: r.notes, score: 40 },
  }));

  const insertResult = await runWithWriteContextAsync("api", async () =>
    db.from("leads").insert(toInsert).select("id")
  ) as { data?: { id: string }[] | null; error?: unknown };
  if (insertResult.error) return NextResponse.json({ error: "Could not process contact data. Please try again." }, { status: 500 });
  const imported = Array.isArray(insertResult.data) ? insertResult.data.length : 0;

  return NextResponse.json({
    imported,
    skipped: valid.length - imported,
    errors: errors.slice(0, 10), // Return first 10 errors for feedback
    total_processed: rows.length,
  });
}
