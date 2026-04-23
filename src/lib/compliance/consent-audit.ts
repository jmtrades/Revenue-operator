/**
 * Phase 13c — Consent audit log.
 *
 * Regulator-grade consent proof. Every time a lead grants, revokes, reaffirms,
 * or has their consent imported / expired, we write one row here with enough
 * evidence to survive a TCPA complaint, a TSR audit, a CASL enquiry, or a
 * GDPR data-subject request.
 *
 * Pure: the public functions accept a ConsentAuditWriter so tests can run
 * without Supabase. A Supabase-backed writer is provided at the bottom.
 */

export type ConsentAction =
  | "grant"
  | "revoke"
  | "reaffirm"
  | "expired"
  | "imported"
  | "bounced_out";

export type ConsentChannel =
  | "voice"
  | "sms"
  | "email"
  | "web_form"
  | "api"
  | "import"
  | "manual"
  | "chat";

export type ConsentMethod =
  | "double_opt_in"
  | "single_opt_in"
  | "verbal_yes"
  | "signature"
  | "checkbox"
  | "link_click"
  | "list_unsubscribe"
  | "inbound_reply"
  | "in_call_verbal"
  | "form_submission"
  | "api_call"
  | "bulk_import"
  | "manual_entry"
  | "bounced"
  | "complaint";

export type ConsentContactType = "phone" | "email" | "both";

export interface ConsentAuditRow {
  workspace_id: string;
  lead_id?: string | null;
  contact_type: ConsentContactType;
  phone_number?: string | null;
  email_lower?: string | null;
  action: ConsentAction;
  channel: ConsentChannel;
  method: ConsentMethod;
  source?: string | null;
  scope?: string | null;
  evidence_type?: string | null;
  evidence_value?: Record<string, unknown>;
  user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  notes?: string | null;
  occurred_at: string;
  expires_at?: string | null;
}

export interface ConsentAuditWriter {
  insertConsentAudit: (row: ConsentAuditRow) => Promise<{ id: string | null }>;
  listConsentAudit: (query: {
    workspaceId: string;
    leadId?: string | null;
    phoneNumber?: string | null;
    emailLower?: string | null;
    limit?: number;
  }) => Promise<ConsentAuditRow[]>;
}

/** Normalize a phone number to digits-only. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

/** Normalize an email to trimmed lowercase. */
export function normalizeEmailLower(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return v.includes("@") ? v : null;
}

/** Build a valid audit row from caller input, filling sane defaults. */
export function buildConsentAuditRow(params: {
  workspaceId: string;
  leadId?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  action: ConsentAction;
  channel: ConsentChannel;
  method: ConsentMethod;
  source?: string | null;
  scope?: string | null;
  evidence?: { type?: string; value?: Record<string, unknown> };
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  notes?: string | null;
  occurredAt?: string | null;
  expiresAt?: string | null;
}): ConsentAuditRow {
  const phone = normalizePhone(params.phoneNumber);
  const email = normalizeEmailLower(params.email);

  let contactType: ConsentContactType;
  if (phone && email) contactType = "both";
  else if (email) contactType = "email";
  else contactType = "phone";

  return {
    workspace_id: params.workspaceId,
    lead_id: params.leadId ?? null,
    contact_type: contactType,
    phone_number: phone,
    email_lower: email,
    action: params.action,
    channel: params.channel,
    method: params.method,
    source: params.source ?? null,
    scope: params.scope ?? "workspace_all",
    evidence_type: params.evidence?.type ?? null,
    evidence_value: params.evidence?.value ?? {},
    user_id: params.userId ?? null,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
    notes: params.notes ?? null,
    occurred_at: params.occurredAt ?? new Date().toISOString(),
    expires_at: params.expiresAt ?? null,
  };
}

/** Append a new consent event. Returns the new row id (if returned by the writer). */
export async function recordConsentEvent(
  row: ConsentAuditRow,
  writer: ConsentAuditWriter,
): Promise<{ id: string | null }> {
  if (!row.phone_number && !row.email_lower) {
    // Must have at least one contact identifier for the entry to be useful.
    return { id: null };
  }
  return writer.insertConsentAudit(row);
}

/** Convenience wrappers for the two most common flows. */
export async function recordConsentGrant(
  params: Omit<Parameters<typeof buildConsentAuditRow>[0], "action">,
  writer: ConsentAuditWriter,
): Promise<{ id: string | null }> {
  return recordConsentEvent(
    buildConsentAuditRow({ ...params, action: "grant" }),
    writer,
  );
}

export async function recordConsentRevoke(
  params: Omit<Parameters<typeof buildConsentAuditRow>[0], "action">,
  writer: ConsentAuditWriter,
): Promise<{ id: string | null }> {
  return recordConsentEvent(
    buildConsentAuditRow({ ...params, action: "revoke" }),
    writer,
  );
}

/** Is this contact currently consented? Pure — takes a list of rows in time order. */
export function currentConsentStatus(
  rows: ConsentAuditRow[],
  now: Date = new Date(),
): { consented: boolean; lastAction: ConsentAction | null; lastAt: string | null } {
  if (!rows.length) return { consented: false, lastAction: null, lastAt: null };

  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at),
  );

  let consented = false;
  let lastAction: ConsentAction | null = null;
  let lastAt: string | null = null;
  for (const r of sorted) {
    if (r.expires_at && Date.parse(r.expires_at) < now.getTime()) {
      // Expired entries don't change state unless the caller already marked
      // them expired.
      if (r.action !== "expired") continue;
    }
    lastAction = r.action;
    lastAt = r.occurred_at;
    switch (r.action) {
      case "grant":
      case "reaffirm":
      case "imported":
        consented = true;
        break;
      case "revoke":
      case "bounced_out":
      case "expired":
        consented = false;
        break;
    }
  }
  return { consented, lastAction, lastAt };
}

/**
 * Structural shape we rely on from the Supabase client. Only `from` is
 * exercised; the downstream chainable builders are inferred via `unknown` +
 * runtime casts so we stay off `any` without pulling Supabase generics in.
 */
type ConsentAuditDbClient = {
  from: (table: string) => unknown;
};

type MaybeSingleResult = {
  data: unknown;
  error: { message?: string } | null;
};
type ChainableBuilder = {
  select: (cols: string) => ChainableBuilder;
  insert: (row: unknown) => ChainableBuilder;
  eq: (col: string, val: unknown) => ChainableBuilder;
  order: (col: string, opts: { ascending: boolean }) => ChainableBuilder;
  limit: (n: number) => ChainableBuilder;
  maybeSingle: () => Promise<MaybeSingleResult>;
  then: Promise<MaybeSingleResult>["then"];
};

/** Supabase-backed writer. Kept out of the pure module. */
export function createSupabaseConsentAuditWriter(
  db: ConsentAuditDbClient
): ConsentAuditWriter {
  const table = (name: string) => db.from(name) as unknown as ChainableBuilder;
  return {
    async insertConsentAudit(row) {
      const { data } = await table("consent_audit_log")
        .insert(row)
        .select("id")
        .maybeSingle();
      return { id: (data as { id?: string } | null)?.id ?? null };
    },
    async listConsentAudit(query) {
      let q = table("consent_audit_log")
        .select("*")
        .eq("workspace_id", query.workspaceId)
        .order("occurred_at", { ascending: false })
        .limit(query.limit ?? 100);
      if (query.leadId) q = q.eq("lead_id", query.leadId);
      if (query.phoneNumber) q = q.eq("phone_number", query.phoneNumber);
      if (query.emailLower) q = q.eq("email_lower", query.emailLower);
      const { data } = (await q) as { data: unknown };
      return (data as ConsentAuditRow[] | null) ?? [];
    },
  };
}
