/**
 * Inbound CRM pull — read contacts / leads FROM the connected CRM INTO
 * Recall-Touch. This is the ingestion-first direction operators care about:
 * "I connected HubSpot, now everyone who already existed should show up here".
 *
 * Each puller is a pure function that:
 *   - Calls the provider's list-contacts endpoint
 *   - Paginates using a provider-specific cursor (stored in connection metadata)
 *   - Returns raw payloads + externalId — NORMALIZATION happens downstream so
 *     we can evolve the lead schema without touching every puller.
 *
 * The orchestrator in `/api/integrations/pull` drives these in a loop:
 *   while (!done) { pull → upsert → persist cursor → sleep }
 *
 * Every puller runs with an AbortSignal.timeout so a stuck upstream can't
 * wedge the backfill worker forever.
 */

import { log } from "@/lib/logger";
import type { CrmProviderId } from "./field-mapper";
import type { CrmTokens } from "./token-refresh";

export interface PullOptions {
  /** Opaque cursor persisted between calls. null on first call. */
  cursor: string | null;
  /** Max records per batch. Each provider caps this differently; we pick a safe default. */
  limit: number;
}

export interface PulledRecord {
  /** Provider's primary key — used as `external_id` on the lead row. */
  externalId: string;
  /** Raw payload exactly as the provider returned it (minus pagination wrapper). */
  raw: Record<string, unknown>;
}

export interface PullResult {
  records: PulledRecord[];
  /** null when the provider signals end-of-stream. Otherwise pass back on next call. */
  nextCursor: string | null;
  /** Provider-reported total count, if known (HubSpot, Airtable, etc. don't report this). */
  totalCount?: number;
}

const PULL_TIMEOUT_MS = 30_000;
const DEFAULT_LIMIT = 100;

/** Read meta value safely — metadata is a loose Record<string,string>. */
function meta(tokens: CrmTokens, key: string): string | undefined {
  const v = tokens.metadata?.[key];
  return typeof v === "string" ? v : undefined;
}

async function jsonFetch<T = unknown>(
  url: string,
  init: RequestInit,
  provider: CrmProviderId,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`${provider} pull failed: ${res.status} ${text.slice(0, 200)}`);
    log("warn", "crm_pull.http_error", { provider, status: res.status });
    throw err;
  }
  return (await res.json()) as T;
}

// ─── HubSpot ────────────────────────────────────────────────────────────
// GET /crm/v3/objects/contacts?limit=100&after={cursor}&properties=...
async function pullFromHubSpot(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const props = ["firstname", "lastname", "email", "phone", "company", "lifecyclestage", "lead_status"].join(",");
  const params = new URLSearchParams({
    limit: String(opts.limit),
    properties: props,
    ...(opts.cursor ? { after: opts.cursor } : {}),
  });
  const data = await jsonFetch<{
    results: Array<{ id: string; properties: Record<string, unknown> }>;
    paging?: { next?: { after: string } };
  }>(
    `https://api.hubapi.com/crm/v3/objects/contacts?${params}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    "hubspot",
  );
  return {
    records: data.results.map((r) => ({ externalId: r.id, raw: { id: r.id, ...r.properties } })),
    nextCursor: data.paging?.next?.after ?? null,
  };
}

// ─── Salesforce ─────────────────────────────────────────────────────────
// SOQL against Lead + Contact via /services/data/vXX.0/query
async function pullFromSalesforce(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  if (!tokens.instance_url) throw new Error("Salesforce connection missing instance_url");
  // If cursor is provided it's the full nextRecordsUrl returned by the API.
  const url = opts.cursor
    ? `${tokens.instance_url}${opts.cursor}`
    : `${tokens.instance_url}/services/data/v59.0/query?q=${encodeURIComponent(
        `SELECT Id, FirstName, LastName, Email, Phone, Company, Status FROM Lead LIMIT ${opts.limit}`,
      )}`;
  const data = await jsonFetch<{
    records: Array<Record<string, unknown> & { Id: string }>;
    done: boolean;
    nextRecordsUrl?: string;
  }>(url, { headers: { Authorization: `Bearer ${tokens.access_token}` } }, "salesforce");
  return {
    records: data.records.map((r) => ({ externalId: String(r.Id), raw: r })),
    nextCursor: data.done ? null : data.nextRecordsUrl ?? null,
  };
}

// ─── Zoho CRM ───────────────────────────────────────────────────────────
// GET www.zohoapis.com/crm/v2/Contacts?page=1&per_page=200
async function pullFromZoho(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const page = opts.cursor ? Number(opts.cursor) : 1;
  const params = new URLSearchParams({ page: String(page), per_page: String(Math.min(opts.limit, 200)) });
  const base = tokens.instance_url || "https://www.zohoapis.com";
  const data = await jsonFetch<{
    data?: Array<Record<string, unknown> & { id: string }>;
    info?: { more_records: boolean };
  }>(
    `${base}/crm/v2/Contacts?${params}`,
    { headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` } },
    "zoho_crm",
  );
  const records = (data.data ?? []).map((r) => ({ externalId: String(r.id), raw: r }));
  return { records, nextCursor: data.info?.more_records ? String(page + 1) : null };
}

// ─── Pipedrive ──────────────────────────────────────────────────────────
// GET api.pipedrive.com/v1/persons?start=0&limit=100
async function pullFromPipedrive(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const start = opts.cursor ? Number(opts.cursor) : 0;
  const domain = meta(tokens, "domain") || "api";
  const data = await jsonFetch<{
    data: Array<{ id: number; name: string; email?: Array<{ value: string }>; phone?: Array<{ value: string }>; org_name?: string }> | null;
    additional_data?: { pagination?: { more_items_in_collection?: boolean; next_start?: number } };
  }>(
    `https://${domain}.pipedrive.com/api/v1/persons?start=${start}&limit=${opts.limit}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    "pipedrive",
  );
  const records = (data.data ?? []).map((r) => ({
    externalId: String(r.id),
    raw: r as unknown as Record<string, unknown>,
  }));
  const nextStart = data.additional_data?.pagination?.more_items_in_collection
    ? data.additional_data.pagination.next_start
    : null;
  return { records, nextCursor: nextStart != null ? String(nextStart) : null };
}

// ─── GoHighLevel ────────────────────────────────────────────────────────
// GET services.leadconnectorhq.com/contacts/?locationId=...&limit=100&startAfterId=
async function pullFromGoHighLevel(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const locationId = meta(tokens, "locationId");
  if (!locationId) throw new Error("GoHighLevel connection missing locationId");
  const params = new URLSearchParams({
    locationId,
    limit: String(opts.limit),
    ...(opts.cursor ? { startAfterId: opts.cursor } : {}),
  });
  const data = await jsonFetch<{
    contacts: Array<Record<string, unknown> & { id: string }>;
    meta?: { nextPageUrl?: string; startAfterId?: string };
  }>(
    `https://services.leadconnectorhq.com/contacts/?${params}`,
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    },
    "gohighlevel",
  );
  return {
    records: (data.contacts ?? []).map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: data.meta?.startAfterId ?? null,
  };
}

// ─── Google Contacts (People API) ───────────────────────────────────────
// GET people.googleapis.com/v1/people/me/connections?pageSize=100&pageToken=...
async function pullFromGoogleContacts(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const params = new URLSearchParams({
    pageSize: String(Math.min(opts.limit, 1000)),
    personFields: "names,emailAddresses,phoneNumbers,organizations",
    ...(opts.cursor ? { pageToken: opts.cursor } : {}),
  });
  const data = await jsonFetch<{
    connections?: Array<Record<string, unknown> & { resourceName: string }>;
    nextPageToken?: string;
  }>(
    `https://people.googleapis.com/v1/people/me/connections?${params}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    "google_contacts",
  );
  return {
    records: (data.connections ?? []).map((r) => ({
      externalId: String(r.resourceName),
      raw: r,
    })),
    nextCursor: data.nextPageToken ?? null,
  };
}

// ─── Microsoft 365 (Graph API) ──────────────────────────────────────────
// GET graph.microsoft.com/v1.0/me/contacts?$top=100&$skiptoken=...
async function pullFromMicrosoft365(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const url = opts.cursor
    ? opts.cursor
    : `https://graph.microsoft.com/v1.0/me/contacts?$top=${opts.limit}`;
  const data = await jsonFetch<{
    value: Array<Record<string, unknown> & { id: string }>;
    "@odata.nextLink"?: string;
  }>(url, { headers: { Authorization: `Bearer ${tokens.access_token}` } }, "microsoft_365");
  return {
    records: (data.value ?? []).map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: data["@odata.nextLink"] ?? null,
  };
}

// ─── Airtable ───────────────────────────────────────────────────────────
// GET api.airtable.com/v0/{baseId}/{tableName}?pageSize=100&offset=...
async function pullFromAirtable(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const baseId = meta(tokens, "baseId");
  const tableName = meta(tokens, "tableName") || "Contacts";
  if (!baseId) throw new Error("Airtable connection missing baseId");
  const params = new URLSearchParams({
    pageSize: String(Math.min(opts.limit, 100)),
    ...(opts.cursor ? { offset: opts.cursor } : {}),
  });
  const data = await jsonFetch<{
    records: Array<{ id: string; fields: Record<string, unknown> }>;
    offset?: string;
  }>(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    "airtable",
  );
  return {
    records: data.records.map((r) => ({ externalId: r.id, raw: { id: r.id, fields: r.fields } })),
    nextCursor: data.offset ?? null,
  };
}

// ─── Close ──────────────────────────────────────────────────────────────
// GET api.close.com/api/v1/lead/?_limit=100&_skip=N  — Basic auth w/ API key
async function pullFromClose(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const skip = opts.cursor ? Number(opts.cursor) : 0;
  const basic = Buffer.from(`${tokens.access_token}:`).toString("base64");
  const data = await jsonFetch<{
    data: Array<Record<string, unknown> & { id: string }>;
    has_more: boolean;
  }>(
    `https://api.close.com/api/v1/lead/?_limit=${opts.limit}&_skip=${skip}`,
    { headers: { Authorization: `Basic ${basic}` } },
    "close",
  );
  return {
    records: data.data.map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: data.has_more ? String(skip + opts.limit) : null,
  };
}

// ─── Follow Up Boss ─────────────────────────────────────────────────────
// GET api.followupboss.com/v1/people?offset=N&limit=100  — Basic auth
async function pullFromFollowUpBoss(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const offset = opts.cursor ? Number(opts.cursor) : 0;
  const basic = Buffer.from(`${tokens.access_token}:`).toString("base64");
  const data = await jsonFetch<{
    people: Array<Record<string, unknown> & { id: number }>;
    _metadata?: { total: number; limit: number; offset: number };
  }>(
    `https://api.followupboss.com/v1/people?offset=${offset}&limit=${opts.limit}`,
    {
      headers: {
        Authorization: `Basic ${basic}`,
        "X-System": "Recall-Touch",
        "X-System-Key": meta(tokens, "system_key") ?? "",
      },
    },
    "follow_up_boss",
  );
  const total = data._metadata?.total ?? 0;
  const nextOffset = offset + data.people.length;
  return {
    records: data.people.map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: nextOffset < total ? String(nextOffset) : null,
    totalCount: total,
  };
}

// ─── ActiveCampaign ─────────────────────────────────────────────────────
// GET {account_url}/api/3/contacts?limit=100&offset=N  — Api-Token header
async function pullFromActiveCampaign(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const accountUrl = tokens.instance_url || meta(tokens, "account_url");
  if (!accountUrl) throw new Error("ActiveCampaign connection missing account_url");
  const offset = opts.cursor ? Number(opts.cursor) : 0;
  const data = await jsonFetch<{
    contacts: Array<Record<string, unknown> & { id: string }>;
    meta?: { total: string };
  }>(
    `${accountUrl}/api/3/contacts?limit=${opts.limit}&offset=${offset}`,
    { headers: { "Api-Token": tokens.access_token } },
    "active_campaign",
  );
  const total = Number(data.meta?.total ?? 0);
  const nextOffset = offset + data.contacts.length;
  return {
    records: data.contacts.map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: nextOffset < total ? String(nextOffset) : null,
    totalCount: total,
  };
}

// ─── Copper ─────────────────────────────────────────────────────────────
// POST api.copper.com/developer_api/v1/people/search  — X-PW-* headers
async function pullFromCopper(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const userEmail = meta(tokens, "user_email");
  if (!userEmail) throw new Error("Copper connection missing user_email");
  const page = opts.cursor ? Number(opts.cursor) : 1;
  const body = JSON.stringify({ page_number: page, page_size: Math.min(opts.limit, 200), sort_by: "name" });
  const res = await fetch("https://api.copper.com/developer_api/v1/people/search", {
    method: "POST",
    headers: {
      "X-PW-AccessToken": tokens.access_token,
      "X-PW-Application": "developer_api",
      "X-PW-UserEmail": userEmail,
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`copper pull failed: ${res.status}`);
  const data = (await res.json()) as Array<Record<string, unknown> & { id: number }>;
  return {
    records: data.map((r) => ({ externalId: String(r.id), raw: r })),
    // Copper paginates by count — when a page returns less than page_size, we're done.
    nextCursor: data.length === Math.min(opts.limit, 200) ? String(page + 1) : null,
  };
}

// ─── Monday CRM ─────────────────────────────────────────────────────────
// GraphQL: items_page on the contacts board, with pagination via `cursor`.
async function pullFromMondayCrm(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const boardId = meta(tokens, "board_id");
  if (!boardId) throw new Error("Monday CRM connection missing board_id");
  const query = opts.cursor
    ? `query { next_items_page(limit: ${opts.limit}, cursor: "${opts.cursor}") { cursor items { id name column_values { id text } } } }`
    : `query { boards(ids: ${boardId}) { items_page(limit: ${opts.limit}) { cursor items { id name column_values { id text } } } } }`;
  const data = await jsonFetch<{
    data?: {
      boards?: Array<{ items_page: { cursor: string | null; items: Array<{ id: string; name: string; column_values: Array<{ id: string; text: string }> }> } }>;
      next_items_page?: { cursor: string | null; items: Array<{ id: string; name: string; column_values: Array<{ id: string; text: string }> }> };
    };
  }>(
    "https://api.monday.com/v2",
    {
      method: "POST",
      headers: { Authorization: tokens.access_token, "Content-Type": "application/json", "API-Version": "2024-01" },
      body: JSON.stringify({ query }),
    },
    "monday_crm",
  );
  const page = opts.cursor ? data.data?.next_items_page : data.data?.boards?.[0]?.items_page;
  const items = page?.items ?? [];
  return {
    records: items.map((r) => ({ externalId: String(r.id), raw: r as unknown as Record<string, unknown> })),
    nextCursor: page?.cursor ?? null,
  };
}

// ─── Freshsales ─────────────────────────────────────────────────────────
// GET {domain}.myfreshworks.com/crm/sales/api/contacts?page=N&per_page=100 — Token header
async function pullFromFreshsales(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const domain = meta(tokens, "domain");
  if (!domain) throw new Error("Freshsales connection missing domain");
  const page = opts.cursor ? Number(opts.cursor) : 1;
  const data = await jsonFetch<{
    contacts: Array<Record<string, unknown> & { id: number }>;
    meta?: { total_pages?: number; total?: number };
  }>(
    `https://${domain}.myfreshworks.com/crm/sales/api/contacts?page=${page}&per_page=${Math.min(opts.limit, 100)}`,
    { headers: { Authorization: `Token token=${tokens.access_token}`, Accept: "application/json" } },
    "freshsales",
  );
  const totalPages = data.meta?.total_pages ?? page;
  return {
    records: (data.contacts ?? []).map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: page < totalPages ? String(page + 1) : null,
    totalCount: data.meta?.total,
  };
}

// ─── Attio ──────────────────────────────────────────────────────────────
// POST api.attio.com/v2/objects/people/records/query  — Bearer
async function pullFromAttio(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const offset = opts.cursor ? Number(opts.cursor) : 0;
  const res = await fetch("https://api.attio.com/v2/objects/people/records/query", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ limit: Math.min(opts.limit, 500), offset }),
    signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`attio pull failed: ${res.status}`);
  const data = (await res.json()) as {
    data: Array<Record<string, unknown> & { id: { record_id: string } }>;
  };
  return {
    records: data.data.map((r) => ({ externalId: String(r.id.record_id), raw: r })),
    // Attio returns fewer than `limit` on the final page; use that as our end-signal.
    nextCursor: data.data.length === Math.min(opts.limit, 500) ? String(offset + data.data.length) : null,
  };
}

// ─── Keap (Infusionsoft) ────────────────────────────────────────────────
// GET api.infusionsoft.com/crm/rest/v1/contacts?limit=100&offset=N
async function pullFromKeap(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const offset = opts.cursor ? Number(opts.cursor) : 0;
  const data = await jsonFetch<{
    contacts: Array<Record<string, unknown> & { id: number }>;
    count: number;
    next?: string;
  }>(
    `https://api.infusionsoft.com/crm/rest/v1/contacts?limit=${opts.limit}&offset=${offset}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: "application/json" } },
    "keap",
  );
  const nextOffset = offset + data.contacts.length;
  return {
    records: data.contacts.map((r) => ({ externalId: String(r.id), raw: r })),
    nextCursor: data.next ? String(nextOffset) : null,
    totalCount: data.count,
  };
}

// ─── Google Sheets ──────────────────────────────────────────────────────
// GET sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}
// Treat row index as externalId — idempotent under re-pulls if rows don't shift.
async function pullFromGoogleSheets(tokens: CrmTokens, opts: PullOptions): Promise<PullResult> {
  const spreadsheetId = meta(tokens, "spreadsheet_id");
  const range = meta(tokens, "range") || "Contacts!A:G";
  if (!spreadsheetId) throw new Error("Google Sheets connection missing spreadsheet_id");

  // Sheets has no native pagination — we pull the whole range once, then mark done.
  // Cursor semantics here: null on first call, "done" after.
  if (opts.cursor === "done") return { records: [], nextCursor: null };

  const data = await jsonFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    "google_sheets",
  );
  const rows = data.values ?? [];
  if (rows.length === 0) return { records: [], nextCursor: null };

  // First row is header. Map remaining rows into objects keyed by header.
  const header = rows[0]!.map((h) => String(h).trim());
  const records: PulledRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const obj: Record<string, unknown> = {};
    header.forEach((key, idx) => {
      if (key) obj[key] = row[idx] ?? null;
    });
    records.push({ externalId: `${spreadsheetId}:row:${i}`, raw: obj });
  }
  return { records, nextCursor: "done", totalCount: records.length };
}

// ─── Dispatcher ─────────────────────────────────────────────────────────
const PULL_HANDLERS: Record<CrmProviderId, (tokens: CrmTokens, opts: PullOptions) => Promise<PullResult>> = {
  hubspot: pullFromHubSpot,
  salesforce: pullFromSalesforce,
  zoho_crm: pullFromZoho,
  pipedrive: pullFromPipedrive,
  gohighlevel: pullFromGoHighLevel,
  google_contacts: pullFromGoogleContacts,
  microsoft_365: pullFromMicrosoft365,
  airtable: pullFromAirtable,
  close: pullFromClose,
  follow_up_boss: pullFromFollowUpBoss,
  active_campaign: pullFromActiveCampaign,
  copper: pullFromCopper,
  monday_crm: pullFromMondayCrm,
  freshsales: pullFromFreshsales,
  attio: pullFromAttio,
  keap: pullFromKeap,
  google_sheets: pullFromGoogleSheets,
};

/**
 * Public entry point — route handlers and schedulers call this.
 * Looks up the provider's handler; throws a clear error if the provider is
 * unknown (which should be caught at compile time by the exhaustive Record).
 */
export async function pullContactsFromCrm(
  provider: CrmProviderId,
  tokens: CrmTokens,
  opts: Partial<PullOptions> = {},
): Promise<PullResult> {
  const handler = PULL_HANDLERS[provider];
  if (!handler) throw new Error(`Unknown CRM provider: ${provider}`);
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), 500);
  return handler(tokens, { cursor: opts.cursor ?? null, limit });
}
