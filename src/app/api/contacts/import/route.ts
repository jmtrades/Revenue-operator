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
import { E164_REGEX } from "@/lib/security/phone";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/http/csrf";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { parseCsvWithHeaders } from "@/lib/csv/parser";
import { log } from "@/lib/logger";

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

      // Phase 78 Task 10.4: RFC-4180 parser handles quoted newlines correctly
      // (an address cell with an embedded \n no longer shreds the row).
      const csvRows = parseCsvWithHeaders(text);

      // Enforce max batch size
      if (csvRows.length > MAX_BATCH_SIZE) {
        return NextResponse.json(
          { error: `CSV exceeds maximum of ${MAX_BATCH_SIZE} rows. Please split into smaller batches.` },
          { status: 400 }
        );
      }

      rows = csvRows.map((r) => ({
        name: r.name || r.full_name || r.contact_name || r.first_name || r.lead_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || "",
        phone: r.phone || r.phone_number || r.contact_phone || r.mobile || r.phone_mobile || r.cell || r.cell_phone || r.telephone || "",
        email: r.email || r.email_address || r.contact_email || r.e_mail || "",
        company: r.company || r.organization || r.business_name || r.company_name || "",
        notes: r.notes || r.comments || r.description || r.note || "",
      }));
    } catch (e) {
      if (e instanceof Error && e.message.includes("exceeds maximum")) {
        return NextResponse.json({ error: e.message }, { status: 400 });
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
  log("info", "contacts.import.started", { workspace_id: workspaceId, total_rows: valid.length });

  // Deduplicate: collect all phones and emails from the import batch.
  // Phase 78/Phase 3 (D7a): filter to strict E.164 before `.in(...)`
  // interpolation — `normalizePhoneE164` returns raw fallback for malformed
  // input, which would otherwise leak into the PostgREST filter string.
  const normalizedPhones = valid
    .map((r) => normalizePhoneE164(r.phone))
    .filter((v): v is string => !!v && E164_REGEX.test(v));
  const normalizedEmails = valid.map((r) => r.email).filter(Boolean) as string[];

  // Fetch existing leads by phone or email to prevent duplicates
  const existingPhones = new Set<string>();
  const existingEmails = new Set<string>();

  if (normalizedPhones.length > 0) {
    const { data: phoneDups } = await db
      .from("leads")
      .select("phone")
      .eq("workspace_id", workspaceId)
      .in("phone", normalizedPhones);
    for (const r of (phoneDups ?? []) as Array<{ phone?: string }>) {
      if (r.phone) existingPhones.add(r.phone);
    }
  }
  if (normalizedEmails.length > 0) {
    const { data: emailDups } = await db
      .from("leads")
      .select("email")
      .eq("workspace_id", workspaceId)
      .in("email", normalizedEmails);
    for (const r of (emailDups ?? []) as Array<{ email?: string }>) {
      if (r.email) existingEmails.add(r.email.toLowerCase());
    }
  }

  let duplicateCount = 0;
  const toInsert = valid
    .map((r) => {
      const phone = normalizePhoneE164(r.phone);
      const email = r.email?.toLowerCase() ?? null;
      if (phone && existingPhones.has(phone)) { duplicateCount++; return null; }
      if (email && existingEmails.has(email)) { duplicateCount++; return null; }
      return {
        workspace_id: workspaceId,
        name: r.name,
        phone,
        email: r.email,
        company: r.company,
        state: "NEW",
        metadata: { source: "csv_import", notes: r.notes, score: 40 },
      };
    })
    .filter(Boolean);

  if (toInsert.length === 0) {
    log("info", "contacts.import.all_duplicates", { workspace_id: workspaceId, duplicates: duplicateCount });
    return NextResponse.json({
      imported: 0,
      duplicates: duplicateCount,
      skipped: rows.length - valid.length,
      errors: errors.slice(0, 10),
      total_processed: rows.length,
    });
  }

  const { data, error: dbErr } = await runWithWriteContextAsync("api", async () =>
    db.from("leads").insert(toInsert).select("id")
  );
  if (dbErr) {
    log("error", "contacts.import.db_error", { workspace_id: workspaceId, error: (dbErr as { message?: string }).message ?? String(dbErr) });
    return NextResponse.json({ error: "Could not process contact data. Please try again." }, { status: 500 });
  }
  const imported = Array.isArray(data) ? data.length : 0;

  // Autonomous Brain: compute initial intelligence for imported contacts (non-blocking)
  if (Array.isArray(data) && data.length > 0) {
    void (async () => {
      try {
        const { computeLeadIntelligence, persistLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
        for (const row of data.slice(0, 30) as Array<{ id: string }>) {
          try {
            const intelligence = await computeLeadIntelligence(workspaceId, row.id);
            await persistLeadIntelligence(intelligence);
          } catch {
            // Non-blocking per lead — cron will catch up
          }
        }
      } catch {
        // Non-blocking
      }
    })();
  }

  // Auto-enroll in active campaigns: if workspace has active outbound campaigns, add imported leads
  if (Array.isArray(data) && data.length > 0) {
    void (async () => {
      try {
        const { data: activeCampaigns } = await db
          .from("outbound_campaigns")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .eq("auto_enroll_new_leads", true)
          .limit(5);
        if (activeCampaigns && activeCampaigns.length > 0) {
          const leadIds = (data as Array<{ id: string }>).map((r) => r.id);
          for (const campaign of activeCampaigns as Array<{ id: string }>) {
            const enrollRows = leadIds.map((leadId) => ({
              campaign_id: campaign.id,
              lead_id: leadId,
              status: "pending",
            }));
            await db.from("campaign_leads").insert(enrollRows);
          }
          log("info", "contacts.import.auto_enrolled", {
            workspace_id: workspaceId,
            campaigns: activeCampaigns.length,
            leads: leadIds.length,
          });
        }
      } catch {
        // Non-blocking — campaign enrollment is a bonus
      }
    })();
  }

  log("info", "contacts.import.completed", { workspace_id: workspaceId, imported, duplicates: duplicateCount, validation_errors: errors.length });

  return NextResponse.json({
    imported,
    duplicates: duplicateCount,
    skipped: valid.length - imported - duplicateCount,
    errors: errors.slice(0, 10),
    total_processed: rows.length,
  });
}
