/**
 * Phase 78 / Task 9.2 — CRM write-back contract.
 *
 * Defect (P0-25): the pull side (`crm-pull.ts`) can ingest from 17
 * providers, but the only write-back in the codebase is the internal
 * lead-upsert path — there is no supported way to push a new contact
 * back to the CRM the lead came from, nor to append a note / call /
 * meeting activity record. That leaves every "closed the loop" UX
 * claim (sync outcomes back to HubSpot, log call notes to Salesforce)
 * without an implementation.
 *
 * Fix under test:
 *   `src/lib/crm/writeback.ts` exposes:
 *     - createContact(provider, tokens, input): Promise<WriteResult>
 *     - updateContact(provider, tokens, externalId, input): Promise<WriteResult>
 *     - appendActivity(provider, tokens, input): Promise<WriteResult>
 *
 *   Supported providers (real impl): hubspot, salesforce, pipedrive.
 *   Unsupported providers return { ok: false, error: "writeback_unsupported" }
 *   without making a network call — i.e., feature-gated off rather than
 *   silently ignored, so callers can surface a clear status.
 *
 * This test uses `global.fetch = vi.fn()` with scripted responses to
 * verify endpoint, method, auth header, and body shape for each
 * supported provider × each verb. Unsupported providers are verified
 * by asserting `fetch` is never called.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const modulePath = path.join(repoRoot, "src/lib/crm/writeback.ts");

// ---------------------------------------------------------------------------
// Module surface.
// ---------------------------------------------------------------------------
describe("Phase 78 Task 9.2 — writeback module surface", () => {
  it("src/lib/crm/writeback.ts exists", () => {
    expect(fs.existsSync(modulePath)).toBe(true);
  });

  it("exports createContact, updateContact, appendActivity", async () => {
    const mod = await import("@/lib/crm/writeback");
    expect(typeof mod.createContact).toBe("function");
    expect(typeof mod.updateContact).toBe("function");
    expect(typeof mod.appendActivity).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Behavior tests — fetch-mocked.
// ---------------------------------------------------------------------------

type FetchCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

let fetchCalls: FetchCall[] = [];
let fetchResponses: Array<{ status: number; body: unknown }> = [];

beforeEach(() => {
  fetchCalls = [];
  fetchResponses = [];
  global.fetch = vi.fn(async (input: unknown, init?: unknown) => {
    const url = typeof input === "string" ? input : String(input);
    const i = (init ?? {}) as {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    };
    let parsedBody: unknown = undefined;
    if (typeof i.body === "string") {
      try {
        parsedBody = JSON.parse(i.body);
      } catch {
        parsedBody = i.body;
      }
    }
    fetchCalls.push({
      url,
      method: (i.method ?? "GET").toUpperCase(),
      headers: i.headers ?? {},
      body: parsedBody,
    });
    const resp = fetchResponses.shift() ?? { status: 200, body: {} };
    // Status codes 204/205/304 MUST have a null body per the Fetch spec.
    const noBody = resp.status === 204 || resp.status === 205 || resp.status === 304;
    return new Response(noBody ? null : JSON.stringify(resp.body), {
      status: resp.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const HS_TOKENS = { access_token: "hs_tok", refresh_token: "r", expires_at: null };
const SF_TOKENS = {
  access_token: "sf_tok",
  refresh_token: "r",
  expires_at: null,
  instance_url: "https://acme.my.salesforce.com",
};
const PD_TOKENS = { access_token: "pd_tok", refresh_token: "r", expires_at: null };

describe("Phase 78 Task 9.2 — createContact", () => {
  it("HubSpot — POSTs to /crm/v3/objects/contacts with properties payload", async () => {
    const { createContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 201, body: { id: "hs-999" } });

    const res = await createContact("hubspot", HS_TOKENS, {
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+15551234567",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("hs-999");
    expect(fetchCalls).toHaveLength(1);
    const call = fetchCalls[0];
    expect(call.url).toBe("https://api.hubapi.com/crm/v3/objects/contacts");
    expect(call.method).toBe("POST");
    expect(call.headers.Authorization).toBe("Bearer hs_tok");
    expect((call.body as { properties: Record<string, string> }).properties.email).toBe(
      "ada@example.com",
    );
    expect(
      (call.body as { properties: Record<string, string> }).properties.firstname,
    ).toBe("Ada");
    expect(
      (call.body as { properties: Record<string, string> }).properties.lastname,
    ).toBe("Lovelace");
  });

  it("Salesforce — POSTs to /sobjects/Lead on the instance URL", async () => {
    const { createContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 201, body: { id: "sf-L001" } });

    const res = await createContact("salesforce", SF_TOKENS, {
      email: "alan@example.com",
      firstName: "Alan",
      lastName: "Turing",
      company: "Bletchley",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("sf-L001");
    expect(fetchCalls[0].url).toBe(
      "https://acme.my.salesforce.com/services/data/v59.0/sobjects/Lead",
    );
    expect(fetchCalls[0].method).toBe("POST");
    const body = fetchCalls[0].body as Record<string, string>;
    expect(body.Email).toBe("alan@example.com");
    expect(body.FirstName).toBe("Alan");
    expect(body.LastName).toBe("Turing");
    expect(body.Company).toBe("Bletchley");
  });

  it("Pipedrive — POSTs to /v1/persons with email/phone arrayified", async () => {
    const { createContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({
      status: 201,
      body: { success: true, data: { id: 42 } },
    });

    const res = await createContact("pipedrive", PD_TOKENS, {
      email: "grace@example.com",
      firstName: "Grace",
      lastName: "Hopper",
      phone: "+15550000000",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("42");
    expect(fetchCalls[0].url).toBe("https://api.pipedrive.com/v1/persons");
    const body = fetchCalls[0].body as {
      name?: string;
      email?: Array<{ value: string }>;
      phone?: Array<{ value: string }>;
    };
    expect(body.name).toBe("Grace Hopper");
    expect(body.email?.[0]?.value).toBe("grace@example.com");
    expect(body.phone?.[0]?.value).toBe("+15550000000");
  });

  it("unsupported provider returns writeback_unsupported without fetch", async () => {
    const { createContact } = await import("@/lib/crm/writeback");
    const res = await createContact("google_sheets", HS_TOKENS, {
      email: "x@example.com",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("writeback_unsupported");
    expect(fetchCalls).toHaveLength(0);
  });

  it("propagates 4xx error body back to caller", async () => {
    const { createContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({
      status: 409,
      body: { message: "Contact already exists" },
    });
    const res = await createContact("hubspot", HS_TOKENS, {
      email: "dup@example.com",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/409/);
  });
});

describe("Phase 78 Task 9.2 — updateContact", () => {
  it("HubSpot — PATCHes /crm/v3/objects/contacts/:id with properties payload", async () => {
    const { updateContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 200, body: { id: "hs-999" } });

    const res = await updateContact("hubspot", HS_TOKENS, "hs-999", {
      phone: "+15559999999",
    });

    expect(res.ok).toBe(true);
    expect(fetchCalls[0].url).toBe(
      "https://api.hubapi.com/crm/v3/objects/contacts/hs-999",
    );
    expect(fetchCalls[0].method).toBe("PATCH");
    expect(
      (fetchCalls[0].body as { properties: Record<string, string> }).properties.phone,
    ).toBe("+15559999999");
  });

  it("Salesforce — PATCHes /sobjects/Lead/:id (no body in 204 response)", async () => {
    const { updateContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 204, body: {} });

    const res = await updateContact("salesforce", SF_TOKENS, "sf-L001", {
      title: "VP Engineering",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("sf-L001");
    expect(fetchCalls[0].url).toBe(
      "https://acme.my.salesforce.com/services/data/v59.0/sobjects/Lead/sf-L001",
    );
    expect(fetchCalls[0].method).toBe("PATCH");
    expect((fetchCalls[0].body as Record<string, string>).Title).toBe("VP Engineering");
  });

  it("Pipedrive — PUTs /v1/persons/:id", async () => {
    const { updateContact } = await import("@/lib/crm/writeback");
    fetchResponses.push({
      status: 200,
      body: { success: true, data: { id: 42 } },
    });

    const res = await updateContact("pipedrive", PD_TOKENS, "42", {
      firstName: "Grace",
      lastName: "Hopper-Murray",
    });

    expect(res.ok).toBe(true);
    expect(fetchCalls[0].url).toBe("https://api.pipedrive.com/v1/persons/42");
    expect(fetchCalls[0].method).toBe("PUT");
    expect((fetchCalls[0].body as Record<string, string>).name).toBe(
      "Grace Hopper-Murray",
    );
  });

  it("unsupported provider returns writeback_unsupported without fetch", async () => {
    const { updateContact } = await import("@/lib/crm/writeback");
    const res = await updateContact("close", HS_TOKENS, "id", {
      email: "x@example.com",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("writeback_unsupported");
    expect(fetchCalls).toHaveLength(0);
  });
});

describe("Phase 78 Task 9.2 — appendActivity", () => {
  it("HubSpot — POSTs a note engagement and associates to contact", async () => {
    const { appendActivity } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 201, body: { id: "eng-abc" } });

    const res = await appendActivity("hubspot", HS_TOKENS, {
      kind: "note",
      subject: "Demo call",
      body: "Prospect wants pricing by Friday.",
      externalContactId: "hs-999",
      occurredAt: new Date("2026-04-22T12:00:00Z"),
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("eng-abc");
    // Notes live on the notes object type in CRM v3.
    expect(fetchCalls[0].url).toBe("https://api.hubapi.com/crm/v3/objects/notes");
    expect(fetchCalls[0].method).toBe("POST");
    const body = fetchCalls[0].body as {
      properties: { hs_note_body?: string; hs_timestamp?: string };
      associations?: Array<{
        to: { id: string };
        types: Array<{ associationTypeId: number }>;
      }>;
    };
    expect(body.properties.hs_note_body).toContain("pricing by Friday");
    expect(body.properties.hs_timestamp).toBe("2026-04-22T12:00:00.000Z");
    expect(body.associations?.[0]?.to?.id).toBe("hs-999");
  });

  it("Salesforce — POSTs a Task record linked to the Lead via WhoId", async () => {
    const { appendActivity } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 201, body: { id: "sf-task-1" } });

    const res = await appendActivity("salesforce", SF_TOKENS, {
      kind: "call",
      subject: "Follow-up call",
      body: "Discussed renewal terms.",
      externalContactId: "sf-L001",
      durationSec: 720,
    });

    expect(res.ok).toBe(true);
    expect(fetchCalls[0].url).toBe(
      "https://acme.my.salesforce.com/services/data/v59.0/sobjects/Task",
    );
    const body = fetchCalls[0].body as Record<string, unknown>;
    expect(body.WhoId).toBe("sf-L001");
    expect(body.Subject).toBe("Follow-up call");
    expect(body.Description).toBe("Discussed renewal terms.");
    expect(body.Status).toBe("Completed");
    expect(body.CallDurationInSeconds).toBe(720);
  });

  it("Pipedrive — POSTs /v1/activities with person_id and type", async () => {
    const { appendActivity } = await import("@/lib/crm/writeback");
    fetchResponses.push({
      status: 201,
      body: { success: true, data: { id: 77 } },
    });

    const res = await appendActivity("pipedrive", PD_TOKENS, {
      kind: "meeting",
      subject: "Intro meeting",
      externalContactId: "42",
    });

    expect(res.ok).toBe(true);
    expect(res.externalId).toBe("77");
    expect(fetchCalls[0].url).toBe("https://api.pipedrive.com/v1/activities");
    const body = fetchCalls[0].body as Record<string, unknown>;
    expect(body.person_id).toBe(42);
    expect(body.type).toBe("meeting");
    expect(body.subject).toBe("Intro meeting");
  });

  it("unsupported provider returns writeback_unsupported without fetch", async () => {
    const { appendActivity } = await import("@/lib/crm/writeback");
    const res = await appendActivity("airtable", HS_TOKENS, {
      kind: "note",
      body: "x",
      externalContactId: "rec-1",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("writeback_unsupported");
    expect(fetchCalls).toHaveLength(0);
  });

  it("propagates 5xx error body back to caller", async () => {
    const { appendActivity } = await import("@/lib/crm/writeback");
    fetchResponses.push({ status: 503, body: { error: "upstream unavailable" } });
    const res = await appendActivity("hubspot", HS_TOKENS, {
      kind: "note",
      body: "test",
      externalContactId: "hs-1",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/503/);
  });
});
