/**
 * Contact/lead field mapping engine for CRM integrations (Task 18).
 * Recall Touch fields ↔ CRM fields; default mappings; transformation rules; test with sample data.
 */

export type CrmProviderId =
  | "salesforce"
  | "hubspot"
  | "zoho_crm"
  | "pipedrive"
  | "gohighlevel"
  | "google_contacts"
  | "microsoft_365";

export interface FieldDef {
  key: string;
  label: string;
  type: "string" | "phone" | "email" | "number" | "date" | "boolean" | "picklist";
}

/** Recall Touch lead/contact fields available for mapping. */
export const RECALL_TOUCH_FIELDS: FieldDef[] = [
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

/** Default mappings: Recall Touch → CRM for each provider. */
export function getDefaultMappings(provider: CrmProviderId): MapEntry[] {
  const defaults: Record<CrmProviderId, MapEntry[]> = {
    salesforce: [
      { rtField: "name", crmField: "LastName", transformation: "none" },
      { rtField: "email", crmField: "Email", transformation: "none" },
      { rtField: "phone", crmField: "Phone", transformation: "format_phone" },
      { rtField: "company", crmField: "Company", transformation: "none" },
      { rtField: "state", crmField: "Status", transformation: "map_status", statusMap: { NEW: "Open", CONTACTED: "Contacted", QUALIFIED: "Qualified", WON: "Closed Won", LOST: "Closed Lost" } },
    ],
    hubspot: [
      { rtField: "name", crmField: "lastname", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
      { rtField: "company", crmField: "company", transformation: "none" },
      { rtField: "state", crmField: "lead_status", transformation: "map_status", statusMap: { NEW: "NEW", CONTACTED: "OPEN", QUALIFIED: "OPEN", WON: "WON", LOST: "LOST" } },
    ],
    zoho_crm: [
      { rtField: "name", crmField: "Last_Name", transformation: "none" },
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
      { rtField: "name", crmField: "lastName", transformation: "none" },
      { rtField: "email", crmField: "email", transformation: "none" },
      { rtField: "phone", crmField: "phone", transformation: "format_phone" },
      { rtField: "company", crmField: "companyName", transformation: "none" },
    ],
    google_contacts: [
      { rtField: "name", crmField: "names.familyName", transformation: "none" },
      { rtField: "email", crmField: "emailAddresses.value", transformation: "none" },
      { rtField: "phone", crmField: "phoneNumbers.value", transformation: "format_phone" },
      { rtField: "company", crmField: "organizations.name", transformation: "none" },
    ],
    microsoft_365: [
      { rtField: "name", crmField: "surname", transformation: "none" },
      { rtField: "email", crmField: "mail", transformation: "none" },
      { rtField: "phone", crmField: "mobilePhone", transformation: "format_phone" },
      { rtField: "company", crmField: "companyName", transformation: "none" },
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

/** Map Recall Touch state to CRM status using statusMap. */
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

/** Lead-like record (Recall Touch shape). */
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
