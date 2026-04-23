/**
 * Contact/lead field mapping engine for CRM integrations (Task 18).
 * Revenue Operator fields -> CRM fields; default mappings; transformation rules; test with sample data.
 *
 * Phase 78 Task 9.3: CrmProviderId is now defined in @/lib/crm/providers
 * (single source of truth). This file re-exports it so existing importers
 * of @/lib/integrations/field-mapper keep working.
 */


import { SUPPORTED_CRM_PROVIDERS, isSupportedCrmProvider, type CrmProviderId } from "@/lib/crm/providers";

// Re-export for the many existing callers that pull CrmProviderId out of field-mapper.
export { SUPPORTED_CRM_PROVIDERS, isSupportedCrmProvider, type CrmProviderId };

export interface FieldDef {
  key: string;
  label: string;
  type: "string" | "phone" | "email" | "number" | "date" | "boolean" | "picklist";
}

/** Revenue Operator lead/contact fields available for mapping. */
export const REVENUE_OPERATOR_FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "company", label: "Company", type: "string" },
  { key: "state", label: "Status / State", type: "picklist" },
  { key: "metadata", label: "Custom (metadata)", type: "string" },
];

/** Common CRM field options per provider (label + API key). */
export const CRM_FIELDS_BY_PROVIDER: Record<CrmProviderId, FieldDef[]> = {
  salesforce: [
    { key: "FirstName", label: "First Name", type: "string" },
    { key: "LastName", label: "Last Name", type: "string" },
    { key: "Email", label: "Email", type: "email" },
    { key: "Phone", label: "Phone", type: "phone" },
    { key: "Company", label: "Company", type: "string" },
    { key: "Status", label: "Status", type: "picklist" },
    { key: "LeadSource", label: "Lead Source", type: "string" },
  ],
  hubspot: [
    { key: "firstname", label: "First Name", type: "string" },
    { key: "lastname", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "company", label: "Company", type: "string" },
    { key: "lifecyclestage", label: "Lifecycle Stage", type: "picklist" },
    { key: "lead_status", label: "Lead Status", type: "picklist" },
  ],
  zoho_crm: [
    { key: "First_Name", label: "First Name", type: "string" },
    { key: "Last_Name", label: "Last Name", type: "string" },
    { key: "Email", label: "Email", type: "email" },
    { key: "Phone", label: "Phone", type: "phone" },
    { key: "Company", label: "Company", type: "string" },
    { key: "Lead_Status", label: "Lead Status", type: "picklist" },
  ],
  pipedrive: [
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "org_name", label: "Organization", type: "string" },
    { key: "status", label: "Status", type: "picklist" },
  ],
  gohighlevel: [
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "companyName", label: "Company", type: "string" },
    { key: "source", label: "Source", type: "string" },
  ],
  google_contacts: [
    { key: "names.displayName", label: "Display name", type: "string" },
    { key: "names.givenName", label: "First Name", type: "string" },
    { key: "names.familyName", label: "Last Name", type: "string" },
    { key: "emailAddresses.value", label: "Email", type: "email" },
    { key: "phoneNumbers.value", label: "Phone", type: "phone" },
    { key: "organizations.name", label: "Company", type: "string" },
  ],
  microsoft_365: [
    { key: "givenName", label: "First Name", type: "string" },
    { key: "surname", label: "Last Name", type: "string" },
    { key: "mail", label: "Email", type: "email" },
    { key: "mobilePhone", label: "Phone", type: "phone" },
    { key: "companyName", label: "Company", type: "string" },
  ],
  airtable: [
    { key: "Name", label: "Name", type: "string" },
    { key: "Email", label: "Email", type: "email" },
    { key: "Phone", label: "Phone", type: "phone" },
    { key: "Company", label: "Company", type: "string" },
    { key: "Status", label: "Status", type: "picklist" },
  ],
  close: [
    { key: "name", label: "Name", type: "string" },
    { key: "contacts.emails.email", label: "Email", type: "email" },
    { key: "contacts.phones.phone", label: "Phone", type: "phone" },
    { key: "url", label: "Website", type: "string" },
    { key: "status_id", label: "Status", type: "picklist" },
  ],
  follow_up_boss: [
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "emails.value", label: "Email", type: "email" },
    { key: "phones.value", label: "Phone", type: "phone" },
    { key: "source", label: "Source", type: "string" },
    { key: "stage", label: "Stage", type: "picklist" },
  ],
  active_campaign: [
    { key: "firstName", label: "First Name", type: "string" },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "fieldValues", label: "Custom fields", type: "string" },
  ],
  copper: [
    { key: "name", label: "Name", type: "string" },
    { key: "emails.email", label: "Email", type: "email" },
    { key: "phone_numbers.number", label: "Phone", type: "phone" },
    { key: "company_name", label: "Company", type: "string" },
    { key: "status", label: "Status", type: "picklist" },
  ],
  monday_crm: [
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "company", label: "Company", type: "string" },
    { key: "status", label: "Status", type: "picklist" },
  ],
  freshsales: [
    { key: "first_name", label: "First Name", type: "string" },
    { key: "last_name", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "email" },
    { key: "mobile_number", label: "Mobile", type: "phone" },
    { key: "company", label: "Company", type: "string" },
    { key: "lead_stage_id", label: "Stage", type: "picklist" },
  ],
  attio: [
    { key: "name", label: "Name", type: "string" },
    { key: "email_addresses", label: "Email", type: "email" },
    { key: "phone_numbers", label: "Phone", type: "phone" },
    { key: "company", label: "Company", type: "string" },
  ],
  keap: [
    { key: "given_name", label: "First Name", type: "string" },
    { key: "family_name", label: "Last Name", type: "string" },
    { key: "email_addresses.email", label: "Email", type: "email" },
    { key: "phone_numbers.number", label: "Phone", type: "phone" },
    { key: "company.company_name", label: "Company", type: "string" },
  ],
  google_sheets: [
    { key: "Name", label: "Name", type: "string" },
    { key: "Email", label: "Email", type: "email" },
    { key: "Phone", label: "Phone", type: "phone" },
    { key: "Company", label: "Company", type: "string" },
    { key: "Status", label: "Status", type: "picklist" },
    { key: "Notes", label: "Notes", type: "string" },
  ],
};

export type TransformationType = "format_phone" | "map_status" | "concatenate" | "none";

export interface MapEntry {
  rtField: string;
  crmField: string;
  transformation?: TransformationType;
  /** For map_status: { "NEW": "new", "CONTACTED": "contacted", ... } */
  statusMap?: Record<string, string>;
  /** For concatenate: ordered list of RT fields to join (e.g. ["FirstName", "LastName"] for CRM full name). */
  concatFields?: string[];
}

export interface FieldMappingConfig {
  mappings: MapEntry[];
  /** Custom RT field keys (from metadata) that user added. */
  customRtFields?: string[];
  /** Custom CRM field keys that user added. */
  customCrmFields?: Array<{ key: string; label: string }>;
}

/** Default mappings: Revenue Operator â CRM for each provider. */
export function getDefaultMappings(provider: CrmProviderId): MapEntry[] {
  const defaults: Record<CrmProviderId, MapEntry[]> = {
    salesforce: [
      { rtField: "name", crmField: "FirstName", transformation: "none" },
      { rtField: "email", crmField: "Email", transformation: "none" },
      { rtField: "phone", crmField: "Phone", transformation: "format_phone" },
      { rtField: "company", crmField: "Company", transformation: "none" },
      { rtField: "state", crmField: "Status", transformation: "map_status", statusMap: { NEW: "Open", CONTACTED: "Contacted", QUALIFIED: "Qualified", WON: "Closed Won", LOST: "Closed Lost" } },
    ],
    hubspot: [
      { rtField: "name", crmField: "firstname", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
      { rtField: "company", crmField: "company", transformation: "none" },
      { rtField: "state", crmField: "lead_status", transformation: "map_status", statusMap: { NEW: "NEW", CONTACTED: "OPEN", QUALIFIED: "OPEN", WON: "WON", LOST: "LOST" } },
    ],
    zoho_crm: [
      { rtField: "name", crmField: "First_Name", transformation: "none" },
      { rtField: "email", crmField: "Email", transformation: "none" },
      { rtField: "phone", crmField: "Phone", transformation: "format_phone" },
      { rtField: "company", crmField: "Company", transformation: "none" },
      { rtField: "state", crmField: "Lead_Status", transformation: "map_status", statusMap: { NEW: "Not Contacted", CONTACTED: "Contacted", QUALIFIED: "Qualified", WON: "Converted", LOST: "Lost" } },
    ],
    pipedrive: [
      { rtField: "name", crmField: "name", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
      { rtField: "company", crmField: "org_name", transformation: "none" },
      { rtField: "state", crmField: "status", transformation: "map_status", statusMap: { NEW: "open", CONTACTED: "open", QUALIFIED: "won", WON: "won", LOST: "lost" } },
    ],
    gohighlevel: [
      { rtField: "name", crmField: "firstName", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
      { rtField: "company", crmField: "companyName", transformation: "none" },
    ],
    google_contacts: [
      { rtField: "name", crmField: "names.displayName", transformation: "none" },
      { rtField: "email", crmField: "emailAddresses.value", transformation: "none" },
      { rtField: "phone", crmField: "phoneNumbers.value", transformation: "format_phone" },
      { rtField: "company", crmField: "organizations.name", transformation: "none" },
    ],
    microsoft_365: [
      { rtField: "name", crmField: "givenName", transformation: "none" },
      { rtField: "email", crmField: "mail", transformation: "none" },
      { rtField: "phone", crmField: "mobilePhone", transformation: "format_phone" },
      { rtField: "company", crmField: "companyName", transformation: "none" },
    ],
    airtable: [
      { rtField: "name", crmField: "Name", transformation: "none" },
      { rtField: "email", crmField: "Email", transformation: "none" },
      { rtField: "phone", crmField: "Phone", transformation: "format_phone" },
      { rtField: "company", crmField: "Company", transformation: "none" },
      { rtField: "state", crmField: "Status", transformation: "map_status", statusMap: { NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", WON: "Won", LOST: "Lost" } },
    ],
    close: [
      { rtField: "name", crmField: "name", transformation: "none" },
      { rtField: "email", crmField: "contacts.emails.email", transformation: "none" },
      { rtField: "phone", crmField: "contacts.phones.phone", transformation: "format_phone" },
      { rtField: "company", crmField: "name", transformation: "none" },
    ],
    follow_up_boss: [
      { rtField: "name", crmField: "firstName", transformation: "none" },
      { rtField: "email", crmField: "emails.value", transformation: "none" },
      { rtField: "phone", crmField: "phones.value", transformation: "format_phone" },
    ],
    active_campaign: [
      { rtField: "name", crmField: "firstName", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
    ],
    copper: [
      { rtField: "name", crmField: "name", transformation: "none" },
      { rtField: "email", crmField: "emails.email", transformation: "none" },
      { rtField: "phone", crmField: "phone_numbers.number", transformation: "format_phone" },
      { rtField: "company", crmField: "company_name", transformation: "none" },
    ],
    monday_crm: [
      { rtField: "name", crmField: "name", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
      { rtField: "company", crmField: "company", transformation: "none" },
    ],
    freshsales: [
      { rtField: "name", crmField: "first_name", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "mobile_number", transformation: "format_phone" },
      { rtField: "company", crmField: "company", transformation: "none" },
    ],
    attio: [
      { rtField: "name", crmField: "name", transformation: "none" },
      { rtField: "email", crmField: "email_addresses", transformation: "none" },
      { rtField: "phone", crmField: "phone_numbers", transformation: "format_phone" },
      { rtField: "company", crmField: "company", transformation: "none" },
    ],
    keap: [
      { rtField: "name", crmField: "given_name", transformation: "none" },
      { rtField: "email", crmField: "email_addresses.email", transformation: "none" },
      { rtField: "phone", crmField: "phone_numbers.number", transformation: "format_phone" },
      { rtField: "company", crmField: "company.company_name", transformation: "none" },
    ],
    google_sheets: [
      { rtField: "name", crmField: "Name", transformation: "none" },
      { rtField: "email", crmField: "Email", transformation: "none" },
      { rtField: "phone", crmField: "Phone", transformation: "format_phone" },
      { rtField: "company", crmField: "Company", transformation: "none" },
      { rtField: "state", crmField: "Status", transformation: "map_status", statusMap: { NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", WON: "Won", LOST: "Lost" } },
    ],
  };
  return defaults[provider] ?? [];
}

/** Format phone to E.164-like (digits only, optional + prefix). */
export function formatPhone(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return s;
  if (digits.length >= 10 && digits.length <= 15) {
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  }
  return s;
}

/** Map Revenue Operator state to CRM status using statusMap. */
export function mapStatus(value: unknown, statusMap: Record<string, string> | undefined): string {
  if (!statusMap || value == null) return String(value ?? "");
  const key = String(value).toUpperCase();
  return statusMap[key] ?? statusMap[String(value)] ?? String(value);
}

/** Apply a single transformation. */
export function applyTransformation(
  value: unknown,
  entry: MapEntry,
  fullLead: Record<string, unknown>
): unknown {
  switch (entry.transformation) {
    case "format_phone":
      return formatPhone(value);
    case "map_status":
      return mapStatus(value, entry.statusMap);
    case "concatenate":
      if (Array.isArray(entry.concatFields)) {
        return entry.concatFields.map((f) => fullLead[f] ?? "").filter(Boolean).join(" ") || value;
      }
      return value;
    default:
      return value ?? "";
  }
}

/** Lead-like record (Revenue Operator shape). */
export type LeadRecord = Record<string, unknown> & {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  state?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Apply mapping config to a lead; returns CRM-shaped object. */
export function applyMapping(lead: LeadRecord, config: FieldMappingConfig): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const entry of config.mappings) {
    let value: unknown = lead[entry.rtField];
    if (entry.rtField === "metadata" && entry.concatFields?.length) {
      const meta = lead.metadata as Record<string, unknown> | null | undefined;
      value = meta && entry.concatFields[0] ? meta[entry.concatFields[0]] : value;
    }
    const transformed = applyTransformation(value, entry, lead as Record<string, unknown>);
    if (transformed !== "" && transformed != null) {
      out[entry.crmField] = transformed;
    }
  }
  return out;
}

/** Result of testing mapping with sample data. */
export interface TestMappingResult {
  output: Record<string, unknown>;
  errors: string[];
}

/** Test mapping with sample lead; returns output and any validation errors. */
export function testMapping(
  sampleLead: LeadRecord,
  config: FieldMappingConfig
): TestMappingResult {
  const errors: string[] = [];
  try {
    const output = applyMapping(sampleLead, config);
    if (Object.keys(output).length === 0) {
      errors.push("No fields would be sent. Add at least one mapping.");
    }
    return { output, errors };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { output: {}, errors };
  }
}

/** Default sample lead for testing. */
export const SAMPLE_LEAD: LeadRecord = {
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "+1 555-123-4567",
  company: "Acme Inc",
  state: "CONTACTED",
  metadata: {},
};

// ---------------------------------------------------------------------------
// Inbound (CRM → Revenue Operator) reverse mapping
// ---------------------------------------------------------------------------

/** Reverse status map: CRM status value → RO state. */
function reverseStatusMap(statusMap: Record<string, string> | undefined): Record<string, string> {
  if (!statusMap) return {};
  const out: Record<string, string> = {};
  for (const [rtKey, crmVal] of Object.entries(statusMap)) {
    out[String(crmVal).toLowerCase()] = rtKey.toLowerCase();
  }
  return out;
}

/**
 * Extract a nested value from an object using a dot-path key
 * (e.g. "names.givenName" from Google Contacts payload).
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    // Handle arrays — take first element
    if (Array.isArray(current)) {
      current = current[0];
      if (current == null || typeof current !== "object") return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Apply reverse mapping: CRM webhook payload → Revenue Operator lead fields.
 * Uses the same mapping config but reads crmField → roField.
 */
export function applyReverseMapping(
  crmPayload: Record<string, unknown>,
  config: FieldMappingConfig
): Partial<LeadRecord> {
  const out: Record<string, unknown> = {};
  for (const entry of config.mappings) {
    const rawValue = getNestedValue(crmPayload, entry.crmField);
    if (rawValue == null || rawValue === "") continue;

    let value: unknown = rawValue;
    switch (entry.transformation) {
      case "format_phone":
        value = formatPhone(rawValue);
        break;
      case "map_status": {
        const reversed = reverseStatusMap(entry.statusMap);
        const lookup = String(rawValue).toLowerCase();
        value = reversed[lookup] ?? String(rawValue).toLowerCase();
        break;
      }
      case "concatenate":
        // For inbound concatenation is just pass-through
        value = String(rawValue);
        break;
      default:
        value = rawValue;
    }

    if (value !== "" && value != null) {
      out[entry.rtField] = value;
    }
  }
  return out as Partial<LeadRecord>;
}

/**
 * Normalize a CRM webhook payload into a flat object suitable for reverse mapping.
 * Handles provider-specific wrapper structures (HubSpot properties, Salesforce sobject, etc.).
 */
export function normalizeCrmPayload(
  provider: CrmProviderId,
  rawPayload: Record<string, unknown>
): Record<string, unknown> {
  switch (provider) {
    case "hubspot": {
      // HubSpot sends { properties: { email: "x", phone: "y", ... } }
      const props = rawPayload.properties as Record<string, unknown> | undefined;
      return props ?? rawPayload;
    }
    case "salesforce": {
      // Salesforce sends the sobject directly or wrapped in { new: { ... } }
      const newObj = rawPayload.new as Record<string, unknown> | undefined;
      return newObj ?? rawPayload;
    }
    case "zoho_crm": {
      // Zoho sends { data: [{ ... }] } for webhooks
      const data = rawPayload.data;
      if (Array.isArray(data) && data.length > 0) return data[0] as Record<string, unknown>;
      return rawPayload;
    }
    case "pipedrive": {
      // Pipedrive sends { current: { ... }, previous: { ... } }
      const current = rawPayload.current as Record<string, unknown> | undefined;
      return current ?? rawPayload;
    }
    case "gohighlevel": {
      // GHL sends contact directly or { contact: { ... } }
      const contact = rawPayload.contact as Record<string, unknown> | undefined;
      return contact ?? rawPayload;
    }
    case "google_contacts": {
      // Google sends person resource directly
      return rawPayload;
    }
    case "microsoft_365": {
      // Microsoft sends the contact object directly
      return rawPayload;
    }
    case "airtable": {
      // Airtable sends { fields: { ... } }
      const fields = rawPayload.fields as Record<string, unknown> | undefined;
      return fields ?? rawPayload;
    }
    default:
      return rawPayload;
  }
}
