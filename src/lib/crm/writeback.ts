/**
 * src/lib/crm/writeback.ts — Outbound CRM mutations. (Phase 78 / Task 9.2)
 *
 * Problem this file solves
 * ------------------------
 * The pull side (`src/lib/integrations/crm-pull.ts`) reads contacts from
 * 17 providers and ingests them into `leads`. There is an older
 * `src/lib/integrations/crm-clients.ts` that can push a single "create"
 * of a contact for each of the 17 providers, but it:
 *
 *   - merges create + update into one "push" (callers can't express
 *     "I want to update contact X" without hoping the provider treats
 *     the payload as an upsert),
 *   - has no concept of appending an ACTIVITY (note, call log, meeting
 *     record) to an existing contact — the UX claim "we sync outcomes
 *     back to your CRM" has no implementation behind it,
 *   - doesn't surface a clean "not supported" status; unsupported
 *     providers silently get a fetch call that then 4xx's with a
 *     provider-specific error.
 *
 * This file adds a small, stable contract — `createContact`,
 * `updateContact`, `appendActivity` — with real implementations for
 * the three biggest destinations (HubSpot, Salesforce, Pipedrive) and
 * an explicit `writeback_unsupported` status for the rest. That's the
 * "minimum viable" scope for Task 9.2: the 14 other providers stay
 * feature-gated off until each gets its own per-provider write-back
 * branch. Callers can rely on the result shape to drive a clear UX
 * state ("HubSpot: ✓ logged. Airtable: write-back not yet supported").
 *
 * Why not extend crm-clients.ts directly?
 * ---------------------------------------
 * `crm-clients.ts` is the internal upsert-on-push helper used by the
 * old ingest path. Its contract is "given a payload shaped for my
 * provider, push it". The contract here is one level up: "given a
 * normalized `ContactWriteInput`, do the right thing." This module
 * owns the normalization (name split, email/phone arrayification for
 * Pipedrive, Salesforce `Company` default, etc.) so callers never have
 * to know provider-specific field names.
 */

import { log } from "@/lib/logger";
import type { CrmProviderId } from "@/lib/integrations/field-mapper";
import type { CrmTokens } from "@/lib/integrations/token-refresh";

// ─── Public types ──────────────────────────────────────────────────────

export interface ContactWriteInput {
  /** Primary identifier — always preferred when present. */
  email?: string;
  /** E.164-formatted phone. */
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  /** Free-form extras; provider-specific semantics. */
  custom?: Record<string, unknown>;
}

export interface ActivityInput {
  kind: "note" | "call" | "meeting" | "email";
  subject?: string;
  body?: string;
  occurredAt?: Date;
  /** Duration in seconds, relevant for call/meeting. */
  durationSec?: number;
  /** The contact's ID in the provider's namespace. REQUIRED — the
   * whole point of this surface is "associate this activity with that
   * contact". Callers who don't have the external ID yet need to
   * `createContact` first and thread the returned `externalId` through. */
  externalContactId: string;
}

export interface WriteResult {
  ok: boolean;
  /** On success, the provider's ID for the newly-created/updated record. */
  externalId?: string;
  /** On failure, a human-readable reason. The string `writeback_unsupported`
   * is reserved for the feature-gated branch and should drive UX
   * messaging ("not yet supported for this provider") rather than an
   * error toast. */
  error?: string;
}

/** Providers with a real write-back implementation. Expand this set
 * as per-provider branches land. Drives the feature-gate check and
 * exposes to callers so they can (e.g.) hide the "sync to CRM" button
 * for non-supported connections. */
export const WRITEBACK_SUPPORTED_PROVIDERS: ReadonlySet<CrmProviderId> = new Set([
  "hubspot",
  "salesforce",
  "pipedrive",
]);

// ─── Public surface ────────────────────────────────────────────────────

export async function createContact(
  provider: CrmProviderId,
  tokens: CrmTokens,
  input: ContactWriteInput,
): Promise<WriteResult> {
  if (!WRITEBACK_SUPPORTED_PROVIDERS.has(provider)) return unsupported();
  try {
    switch (provider) {
      case "hubspot":
        return await hubspotCreateContact(tokens, input);
      case "salesforce":
        return await salesforceCreateContact(tokens, input);
      case "pipedrive":
        return await pipedriveCreateContact(tokens, input);
      default:
        return unsupported();
    }
  } catch (err) {
    return caught("createContact", provider, err);
  }
}

export async function updateContact(
  provider: CrmProviderId,
  tokens: CrmTokens,
  externalId: string,
  input: ContactWriteInput,
): Promise<WriteResult> {
  if (!WRITEBACK_SUPPORTED_PROVIDERS.has(provider)) return unsupported();
  try {
    switch (provider) {
      case "hubspot":
        return await hubspotUpdateContact(tokens, externalId, input);
      case "salesforce":
        return await salesforceUpdateContact(tokens, externalId, input);
      case "pipedrive":
        return await pipedriveUpdateContact(tokens, externalId, input);
      default:
        return unsupported();
    }
  } catch (err) {
    return caught("updateContact", provider, err);
  }
}

export async function appendActivity(
  provider: CrmProviderId,
  tokens: CrmTokens,
  input: ActivityInput,
): Promise<WriteResult> {
  if (!WRITEBACK_SUPPORTED_PROVIDERS.has(provider)) return unsupported();
  try {
    switch (provider) {
      case "hubspot":
        return await hubspotAppendActivity(tokens, input);
      case "salesforce":
        return await salesforceAppendActivity(tokens, input);
      case "pipedrive":
        return await pipedriveAppendActivity(tokens, input);
      default:
        return unsupported();
    }
  } catch (err) {
    return caught("appendActivity", provider, err);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────

function unsupported(): WriteResult {
  return { ok: false, error: "writeback_unsupported" };
}

function caught(op: string, provider: CrmProviderId, err: unknown): WriteResult {
  const message = err instanceof Error ? err.message : String(err);
  log("error", "crm_writeback.unexpected_error", { op, provider, error: message });
  return { ok: false, error: message };
}

function fullName(input: ContactWriteInput): string | undefined {
  const parts = [input.firstName, input.lastName].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length ? parts.join(" ") : undefined;
}

async function readErrBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 200);
  } catch {
    return "";
  }
}

// ─── HubSpot ───────────────────────────────────────────────────────────

const HS_BASE = "https://api.hubapi.com";

// HubSpot's "association type id" for note→contact. Constant in their
// v3 schema (see https://developers.hubspot.com/docs/api/crm/associations).
const HS_NOTE_TO_CONTACT_ASSOC_TYPE_ID = 202;

function hsAuth(tokens: CrmTokens) {
  return {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  };
}

function hsContactProperties(input: ContactWriteInput): Record<string, unknown> {
  const properties: Record<string, unknown> = { ...(input.custom ?? {}) };
  if (input.email) properties.email = input.email;
  if (input.phone) properties.phone = input.phone;
  if (input.firstName) properties.firstname = input.firstName;
  if (input.lastName) properties.lastname = input.lastName;
  if (input.company) properties.company = input.company;
  if (input.title) properties.jobtitle = input.title;
  return properties;
}

async function hubspotCreateContact(
  tokens: CrmTokens,
  input: ContactWriteInput,
): Promise<WriteResult> {
  const res = await fetch(`${HS_BASE}/crm/v3/objects/contacts`, {
    method: "POST",
    headers: hsAuth(tokens),
    body: JSON.stringify({ properties: hsContactProperties(input) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return { ok: false, error: `HubSpot createContact (${res.status}): ${await readErrBody(res)}` };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

async function hubspotUpdateContact(
  tokens: CrmTokens,
  externalId: string,
  input: ContactWriteInput,
): Promise<WriteResult> {
  const res = await fetch(
    `${HS_BASE}/crm/v3/objects/contacts/${encodeURIComponent(externalId)}`,
    {
      method: "PATCH",
      headers: hsAuth(tokens),
      body: JSON.stringify({ properties: hsContactProperties(input) }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    return { ok: false, error: `HubSpot updateContact (${res.status}): ${await readErrBody(res)}` };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, externalId: data.id ?? externalId };
}

async function hubspotAppendActivity(
  tokens: CrmTokens,
  input: ActivityInput,
): Promise<WriteResult> {
  // For simplicity we write every activity kind as a HubSpot Note
  // engagement with a prefixed subject. Calls/meetings have dedicated
  // engagement types; those can be added as per-kind branches later
  // without breaking the contract.
  const body = [input.subject ? `[${input.subject}]` : null, input.body ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const timestamp = (input.occurredAt ?? new Date()).toISOString();
  const res = await fetch(`${HS_BASE}/crm/v3/objects/notes`, {
    method: "POST",
    headers: hsAuth(tokens),
    body: JSON.stringify({
      properties: {
        hs_note_body: body,
        hs_timestamp: timestamp,
      },
      associations: [
        {
          to: { id: input.externalContactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: HS_NOTE_TO_CONTACT_ASSOC_TYPE_ID,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `HubSpot appendActivity (${res.status}): ${await readErrBody(res)}`,
    };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

// ─── Salesforce ────────────────────────────────────────────────────────

function sfBase(tokens: CrmTokens): string {
  return tokens.instance_url ?? "https://login.salesforce.com";
}

function sfAuth(tokens: CrmTokens) {
  return {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  };
}

function sfLeadPayload(input: ContactWriteInput): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...(input.custom ?? {}) };
  if (input.email) payload.Email = input.email;
  if (input.phone) payload.Phone = input.phone;
  if (input.firstName) payload.FirstName = input.firstName;
  if (input.lastName) payload.LastName = input.lastName;
  // Salesforce requires `Company` on Lead creation; callers without a
  // company name get a placeholder so the create doesn't 400.
  payload.Company = input.company ?? (payload.Company as string | undefined) ?? "Unknown";
  if (input.title) payload.Title = input.title;
  return payload;
}

async function salesforceCreateContact(
  tokens: CrmTokens,
  input: ContactWriteInput,
): Promise<WriteResult> {
  const res = await fetch(`${sfBase(tokens)}/services/data/v59.0/sobjects/Lead`, {
    method: "POST",
    headers: sfAuth(tokens),
    body: JSON.stringify(sfLeadPayload(input)),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `Salesforce createContact (${res.status}): ${await readErrBody(res)}`,
    };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

async function salesforceUpdateContact(
  tokens: CrmTokens,
  externalId: string,
  input: ContactWriteInput,
): Promise<WriteResult> {
  // Salesforce PATCH on a specific Lead. Returns 204 No Content on
  // success — don't attempt to parse a body.
  const payload: Record<string, unknown> = {};
  if (input.email) payload.Email = input.email;
  if (input.phone) payload.Phone = input.phone;
  if (input.firstName) payload.FirstName = input.firstName;
  if (input.lastName) payload.LastName = input.lastName;
  if (input.company) payload.Company = input.company;
  if (input.title) payload.Title = input.title;
  if (input.custom) Object.assign(payload, input.custom);

  const res = await fetch(
    `${sfBase(tokens)}/services/data/v59.0/sobjects/Lead/${encodeURIComponent(externalId)}`,
    {
      method: "PATCH",
      headers: sfAuth(tokens),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    return {
      ok: false,
      error: `Salesforce updateContact (${res.status}): ${await readErrBody(res)}`,
    };
  }
  return { ok: true, externalId };
}

async function salesforceAppendActivity(
  tokens: CrmTokens,
  input: ActivityInput,
): Promise<WriteResult> {
  const payload: Record<string, unknown> = {
    Subject: input.subject ?? defaultSubjectFor(input.kind),
    Description: input.body ?? "",
    WhoId: input.externalContactId,
    Status: "Completed",
    ActivityDate: (input.occurredAt ?? new Date()).toISOString().slice(0, 10),
  };
  if (input.kind === "call" && typeof input.durationSec === "number") {
    payload.CallDurationInSeconds = input.durationSec;
  }
  // Salesforce TaskType picklist includes "Call", "Email", "Meeting", etc.
  payload.TaskSubtype = input.kind === "call" ? "Call" :
    input.kind === "email" ? "Email" :
      input.kind === "meeting" ? "Meeting" : "Task";

  const res = await fetch(
    `${sfBase(tokens)}/services/data/v59.0/sobjects/Task`,
    {
      method: "POST",
      headers: sfAuth(tokens),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) {
    return {
      ok: false,
      error: `Salesforce appendActivity (${res.status}): ${await readErrBody(res)}`,
    };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

// ─── Pipedrive ─────────────────────────────────────────────────────────

const PD_BASE = "https://api.pipedrive.com/v1";

function pdAuth(tokens: CrmTokens) {
  return {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  };
}

function pdPersonPayload(input: ContactWriteInput): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...(input.custom ?? {}) };
  const name = fullName(input);
  if (name) payload.name = name;
  if (input.email) payload.email = [{ value: input.email, primary: true, label: "work" }];
  if (input.phone) payload.phone = [{ value: input.phone, primary: true, label: "work" }];
  if (input.company) payload.org_id = payload.org_id ?? input.company;
  if (input.title) payload.job_title = input.title;
  return payload;
}

async function pipedriveCreateContact(
  tokens: CrmTokens,
  input: ContactWriteInput,
): Promise<WriteResult> {
  const res = await fetch(`${PD_BASE}/persons`, {
    method: "POST",
    headers: pdAuth(tokens),
    body: JSON.stringify(pdPersonPayload(input)),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `Pipedrive createContact (${res.status}): ${await readErrBody(res)}`,
    };
  }
  const data = (await res.json()) as {
    success?: boolean;
    data?: { id?: number };
  };
  if (!data.success) {
    return { ok: false, error: "Pipedrive createContact returned success=false" };
  }
  return { ok: true, externalId: data.data?.id?.toString() };
}

async function pipedriveUpdateContact(
  tokens: CrmTokens,
  externalId: string,
  input: ContactWriteInput,
): Promise<WriteResult> {
  const res = await fetch(`${PD_BASE}/persons/${encodeURIComponent(externalId)}`, {
    method: "PUT",
    headers: pdAuth(tokens),
    body: JSON.stringify(pdPersonPayload(input)),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `Pipedrive updateContact (${res.status}): ${await readErrBody(res)}`,
    };
  }
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { id?: number };
  };
  return { ok: true, externalId: data.data?.id?.toString() ?? externalId };
}

async function pipedriveAppendActivity(
  tokens: CrmTokens,
  input: ActivityInput,
): Promise<WriteResult> {
  const personId = Number.parseInt(input.externalContactId, 10);
  if (!Number.isFinite(personId)) {
    return { ok: false, error: "Pipedrive appendActivity: externalContactId must be numeric" };
  }
  const payload: Record<string, unknown> = {
    type: input.kind, // Pipedrive accepts "call", "meeting", "email", "task"
    subject: input.subject ?? defaultSubjectFor(input.kind),
    note: input.body ?? undefined,
    person_id: personId,
    done: 1,
    due_date: (input.occurredAt ?? new Date()).toISOString().slice(0, 10),
  };
  if (typeof input.durationSec === "number") {
    // Pipedrive wants HH:MM:SS duration.
    const s = Math.max(0, Math.floor(input.durationSec));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    payload.duration = `${hh}:${mm}:${ss}`;
  }
  const res = await fetch(`${PD_BASE}/activities`, {
    method: "POST",
    headers: pdAuth(tokens),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    return {
      ok: false,
      error: `Pipedrive appendActivity (${res.status}): ${await readErrBody(res)}`,
    };
  }
  const data = (await res.json()) as {
    success?: boolean;
    data?: { id?: number };
  };
  if (!data.success) {
    return { ok: false, error: "Pipedrive appendActivity returned success=false" };
  }
  return { ok: true, externalId: data.data?.id?.toString() };
}

function defaultSubjectFor(kind: ActivityInput["kind"]): string {
  switch (kind) {
    case "call":
      return "Call";
    case "meeting":
      return "Meeting";
    case "email":
      return "Email";
    case "note":
    default:
      return "Note";
  }
}
