/**
 * CRM provider API clients for pushing contacts/leads.
 * Each provider has a `pushContact` function that creates or updates a contact
 * in the external CRM using their REST API.
 */

import { log } from "@/lib/logger";
import type { CrmProviderId } from "./field-mapper";
import type { CrmTokens } from "./token-refresh";

export interface PushResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Push a contact/lead payload to the specified CRM provider.
 */
export async function pushContactToCrm(
  provider: CrmProviderId,
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  const handler = PROVIDER_HANDLERS[provider];
  if (!handler) {
    return { ok: false, error: `No handler for provider: ${provider}` };
  }

  try {
    return await handler(tokens, payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("error", "crm_push.unexpected_error", { provider, error: message });
    return { ok: false, error: message };
  }
}

// ─── HubSpot ───────────────────────────────────────────────────────────

async function pushToHubSpot(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // HubSpot Contacts API v3 — Create a contact
  // https://developers.hubspot.com/docs/api/crm/contacts
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: payload }),
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 409) {
    // Contact already exists — try to find and update
    const email = payload.email as string | undefined;
    if (email) {
      return updateHubSpotContact(tokens, email, payload);
    }
    return { ok: false, error: "Contact already exists and no email provided for update" };
  }

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.hubspot_create_failed", { status: res.status, error: errBody.slice(0, 300) });
    return { ok: false, error: `HubSpot API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

async function updateHubSpotContact(
  tokens: CrmTokens,
  email: string,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Search for existing contact by email
  const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filterGroups: [{
        filters: [{ propertyName: "email", operator: "EQ", value: email }],
      }],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!searchRes.ok) {
    return { ok: false, error: `HubSpot search failed (${searchRes.status})` };
  }

  const searchData = (await searchRes.json()) as { results?: Array<{ id: string }> };
  const contactId = searchData.results?.[0]?.id;
  if (!contactId) {
    return { ok: false, error: "Contact exists but could not be found by email" };
  }

  // Update the existing contact
  const updateRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: payload }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!updateRes.ok) {
    const errBody = await updateRes.text();
    return { ok: false, error: `HubSpot update failed (${updateRes.status}): ${errBody.slice(0, 200)}` };
  }

  return { ok: true, externalId: contactId };
}

// ─── Salesforce ────────────────────────────────────────────────────────

async function pushToSalesforce(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Salesforce REST API — Create a Lead
  // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_sobject_create.htm
  const instanceUrl = tokens.instance_url ?? "https://login.salesforce.com";
  const apiUrl = `${instanceUrl}/services/data/v59.0/sobjects/Lead`;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.salesforce_create_failed", { status: res.status, error: errBody.slice(0, 300) });

    // If duplicate detected, try upsert by email
    if (res.status === 400 && errBody.includes("DUPLICATE")) {
      const email = payload.Email as string | undefined;
      if (email) {
        return upsertSalesforceLead(tokens, email, payload, instanceUrl);
      }
    }

    return { ok: false, error: `Salesforce API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

async function upsertSalesforceLead(
  tokens: CrmTokens,
  email: string,
  payload: Record<string, unknown>,
  instanceUrl: string
): Promise<PushResult> {
  // Upsert by Email field
  const apiUrl = `${instanceUrl}/services/data/v59.0/sobjects/Lead/Email/${encodeURIComponent(email)}`;

  const res = await fetch(apiUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `Salesforce upsert failed (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, externalId: data.id ?? email };
}

// ─── Zoho CRM ──────────────────────────────────────────────────────────

async function pushToZoho(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Zoho CRM API v2 — Insert/Upsert Leads
  // https://www.zoho.com/crm/developer/docs/api/v2/upsert-records.html
  const res = await fetch("https://www.zohoapis.com/crm/v2/Leads/upsert", {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: [payload],
      duplicate_check_fields: ["Email"],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.zoho_create_failed", { status: res.status, error: errBody.slice(0, 300) });
    return { ok: false, error: `Zoho CRM API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as {
    data?: Array<{ details?: { id?: string }; status?: string; message?: string }>;
  };
  const record = data.data?.[0];
  if (record?.status === "error") {
    return { ok: false, error: record.message ?? "Zoho insert failed" };
  }
  return { ok: true, externalId: record?.details?.id };
}

// ─── Pipedrive ─────────────────────────────────────────────────────────

async function pushToPipedrive(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Pipedrive API — Add a Person
  // https://developers.pipedrive.com/docs/api/v1/Persons#addPerson
  // Pipedrive requires email and phone as arrays of objects
  const pipedrivePayload: Record<string, unknown> = { ...payload };
  if (payload.email) {
    pipedrivePayload.email = [{ value: payload.email, primary: true, label: "work" }];
  }
  if (payload.phone) {
    pipedrivePayload.phone = [{ value: payload.phone, primary: true, label: "work" }];
  }

  const res = await fetch("https://api.pipedrive.com/v1/persons", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pipedrivePayload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.pipedrive_create_failed", { status: res.status, error: errBody.slice(0, 300) });
    return { ok: false, error: `Pipedrive API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { data?: { id?: number }; success?: boolean };
  if (!data.success) {
    return { ok: false, error: "Pipedrive create failed" };
  }
  return { ok: true, externalId: data.data?.id?.toString() };
}

// ─── GoHighLevel ───────────────────────────────────────────────────────

async function pushToGoHighLevel(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // GoHighLevel API v2 — Create or Update Contact
  // https://highlevel.stoplight.io/docs/integrations/
  const res = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.gohighlevel_create_failed", { status: res.status, error: errBody.slice(0, 300) });
    return { ok: false, error: `GoHighLevel API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { contact?: { id?: string } };
  return { ok: true, externalId: data.contact?.id };
}

// ─── Google Contacts (People API) ──────────────────────────────────────

async function pushToGoogleContacts(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Google People API — Create Contact
  // https://developers.google.com/people/api/rest/v1/people/createContact
  // Convert flat payload to Google People API format
  const personPayload: Record<string, unknown> = {};

  if (payload["names.givenName"] || payload["names.familyName"]) {
    personPayload.names = [{
      givenName: payload["names.givenName"] ?? "",
      familyName: payload["names.familyName"] ?? "",
    }];
  }
  if (payload["emailAddresses.value"]) {
    personPayload.emailAddresses = [{
      value: payload["emailAddresses.value"],
      type: "work",
    }];
  }
  if (payload["phoneNumbers.value"]) {
    personPayload.phoneNumbers = [{
      value: payload["phoneNumbers.value"],
      type: "work",
    }];
  }
  if (payload["organizations.name"]) {
    personPayload.organizations = [{
      name: payload["organizations.name"],
    }];
  }

  const res = await fetch(
    "https://people.googleapis.com/v1/people:createContact",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(personPayload),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.google_contacts_failed", { status: res.status, error: errBody.slice(0, 300) });
    return { ok: false, error: `Google Contacts API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { resourceName?: string };
  return { ok: true, externalId: data.resourceName };
}

// ─── Microsoft 365 (Graph API) ─────────────────────────────────────────

async function pushToMicrosoft365(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Microsoft Graph API — Create Contact
  // https://learn.microsoft.com/en-us/graph/api/user-post-contacts
  const graphPayload: Record<string, unknown> = { ...payload };

  // Microsoft Graph expects emailAddresses as an array
  if (payload.mail) {
    graphPayload.emailAddresses = [{
      address: payload.mail,
      name: payload.givenName ?? "",
    }];
    delete graphPayload.mail;
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphPayload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.microsoft_create_failed", { status: res.status, error: errBody.slice(0, 300) });
    return { ok: false, error: `Microsoft Graph API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { id?: string };
  return { ok: true, externalId: data.id };
}

// ─── Airtable ───────────────────────────────────────────────────────────

async function pushToAirtable(
  tokens: CrmTokens,
  payload: Record<string, unknown>
): Promise<PushResult> {
  // Airtable API — Create a Record
  // https://airtable.com/developers/web/api/create-records
  // Read base_id/table_name from tokens metadata (per-workspace), fallback to env vars
  const baseId = tokens.metadata?.base_id ?? process.env.AIRTABLE_BASE_ID;
  const tableName = tokens.metadata?.table_name ?? process.env.AIRTABLE_TABLE_NAME ?? "Contacts";

  if (!baseId) {
    return { ok: false, error: "Airtable base ID not configured. Go to Settings → Integrations → Airtable → Configure to set your Base ID." };
  }

  // Airtable expects fields wrapped in a "fields" object
  // Map common contact fields to Airtable field names
  const fields: Record<string, unknown> = {};
  if (payload.name || payload.Name) fields["Name"] = payload.name ?? payload.Name;
  if (payload.email || payload.Email) fields["Email"] = payload.email ?? payload.Email;
  if (payload.phone || payload.Phone) fields["Phone"] = payload.phone ?? payload.Phone;
  if (payload.company || payload.Company) fields["Company"] = payload.company ?? payload.Company;
  if (payload.status || payload.Status) fields["Status"] = payload.status ?? payload.Status;

  // Pass through any other fields directly
  for (const [key, value] of Object.entries(payload)) {
    if (!["name", "Name", "email", "Email", "phone", "Phone", "company", "Company", "status", "Status"].includes(key)) {
      fields[key] = value;
    }
  }

  const res = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{ fields }],
        typecast: true, // Automatically convert field values to the correct type
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    log("error", "crm_push.airtable_create_failed", { status: res.status, error: errBody.slice(0, 300) });

    // If record already exists (via automation/webhook), try to find and update
    if (res.status === 422 && errBody.includes("INVALID_REQUEST")) {
      return { ok: false, error: `Airtable API error (${res.status}): ${errBody.slice(0, 200)}` };
    }

    return { ok: false, error: `Airtable API error (${res.status}): ${errBody.slice(0, 200)}` };
  }

  const data = (await res.json()) as { records?: Array<{ id?: string }> };
  const recordId = data.records?.[0]?.id;
  return { ok: true, externalId: recordId };
}

// ─── Provider handler map ──────────────────────────────────────────────

const PROVIDER_HANDLERS: Record<
  CrmProviderId,
  (tokens: CrmTokens, payload: Record<string, unknown>) => Promise<PushResult>
> = {
  hubspot: pushToHubSpot,
  salesforce: pushToSalesforce,
  zoho_crm: pushToZoho,
  pipedrive: pushToPipedrive,
  gohighlevel: pushToGoHighLevel,
  google_contacts: pushToGoogleContacts,
  microsoft_365: pushToMicrosoft365,
  airtable: pushToAirtable,
};
