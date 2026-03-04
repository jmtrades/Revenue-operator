/**
 * Mock data for /app/compliance — Compliance and governance dashboard.
 * Frontend-only; no backend.
 */

export type ComplianceStatus = "compliant" | "partial" | "non_compliant";

export interface ComplianceStandard {
  id: string;
  name: string;
  status: ComplianceStatus;
  lastAuditDate: string | null;
  nextReviewDate: string | null;
  /** For partial: target completion date */
  targetDate?: string | null;
  /** For partial: progress 0–100 */
  progressPercent?: number;
}

export const MOCK_COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  {
    id: "tcpa",
    name: "TCPA",
    status: "compliant",
    lastAuditDate: "2026-02-15",
    nextReviewDate: "2026-08-15",
  },
  {
    id: "hipaa",
    name: "HIPAA",
    status: "compliant",
    lastAuditDate: "2026-01-20",
    nextReviewDate: "2026-07-20",
  },
  {
    id: "gdpr",
    name: "GDPR",
    status: "compliant",
    lastAuditDate: "2026-03-01",
    nextReviewDate: "2026-09-01",
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    status: "compliant",
    lastAuditDate: "2025-12-10",
    nextReviewDate: "2026-12-10",
  },
  {
    id: "pci",
    name: "PCI-DSS",
    status: "partial",
    lastAuditDate: null,
    nextReviewDate: null,
    targetDate: "2026-04-30",
    progressPercent: 65,
  },
  {
    id: "ccpa",
    name: "CCPA",
    status: "compliant",
    lastAuditDate: "2026-02-01",
    nextReviewDate: "2026-08-01",
  },
];

export type ConsentMode = "one-party" | "two-party";

export interface RecordingPolicies {
  consentMode: ConsentMode;
  retentionDays: number;
  piiRedaction: boolean;
  autoTranscribe: boolean;
  consentAnnouncement: string;
}

export const MOCK_RECORDING_POLICIES: RecordingPolicies = {
  consentMode: "two-party",
  retentionDays: 90,
  piiRedaction: true,
  autoTranscribe: true,
  consentAnnouncement:
    "This call may be recorded for quality assurance and training purposes.",
};

export const RETENTION_OPTIONS = [30, 60, 90, 180, 365] as const;

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
}

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: "al-1", timestamp: "2026-03-03T14:32:00Z", user: "Jane Smith", action: "Updated agent greeting", resource: "Agent: Sarah", ipAddress: "192.168.1.10" },
  { id: "al-2", timestamp: "2026-03-03T13:15:00Z", user: "Admin", action: "Exported call recording", resource: "Call #4821", ipAddress: "10.0.0.5" },
  { id: "al-3", timestamp: "2026-03-03T11:00:00Z", user: "Jane Smith", action: "Changed retention policy", resource: "Recording policies", ipAddress: "192.168.1.10" },
  { id: "al-4", timestamp: "2026-03-02T16:45:00Z", user: "Admin", action: "Added team member", resource: "Team", ipAddress: "10.0.0.5" },
  { id: "al-5", timestamp: "2026-03-02T15:20:00Z", user: "Jane Smith", action: "Revoked API key", resource: "API Key: Staging", ipAddress: "192.168.1.10" },
  { id: "al-6", timestamp: "2026-03-02T12:00:00Z", user: "Admin", action: "Downloaded audit report", resource: "Audit log", ipAddress: "10.0.0.5" },
  { id: "al-7", timestamp: "2026-03-01T17:30:00Z", user: "Jane Smith", action: "Updated consent announcement", resource: "Recording policies", ipAddress: "192.168.1.10" },
  { id: "al-8", timestamp: "2026-03-01T09:15:00Z", user: "Admin", action: "Enabled PII redaction", resource: "Recording policies", ipAddress: "10.0.0.5" },
  { id: "al-9", timestamp: "2026-02-28T14:00:00Z", user: "Jane Smith", action: "Created new webhook", resource: "Webhook: Zapier", ipAddress: "192.168.1.10" },
  { id: "al-10", timestamp: "2026-02-28T11:22:00Z", user: "Admin", action: "Updated agent greeting", resource: "Agent: Alex", ipAddress: "10.0.0.5" },
  { id: "al-11", timestamp: "2026-02-27T16:00:00Z", user: "Jane Smith", action: "Exported call recording", resource: "Call #4792", ipAddress: "192.168.1.10" },
  { id: "al-12", timestamp: "2026-02-27T10:00:00Z", user: "Admin", action: "Changed retention policy", resource: "Recording policies", ipAddress: "10.0.0.5" },
  { id: "al-13", timestamp: "2026-02-26T15:45:00Z", user: "Jane Smith", action: "Added knowledge entry", resource: "Knowledge: Business Hours", ipAddress: "192.168.1.10" },
  { id: "al-14", timestamp: "2026-02-26T09:30:00Z", user: "Admin", action: "Revoked API key", resource: "API Key: Old Production", ipAddress: "10.0.0.5" },
  { id: "al-15", timestamp: "2026-02-25T17:00:00Z", user: "Jane Smith", action: "Downloaded audit report", resource: "Audit log", ipAddress: "192.168.1.10" },
  { id: "al-16", timestamp: "2026-02-25T14:20:00Z", user: "Admin", action: "Updated agent greeting", resource: "Agent: Sarah", ipAddress: "10.0.0.5" },
  { id: "al-17", timestamp: "2026-02-24T11:00:00Z", user: "Jane Smith", action: "Disabled auto-transcription", resource: "Recording policies", ipAddress: "192.168.1.10" },
  { id: "al-18", timestamp: "2026-02-24T08:00:00Z", user: "Admin", action: "Re-enabled auto-transcription", resource: "Recording policies", ipAddress: "10.0.0.5" },
  { id: "al-19", timestamp: "2026-02-23T16:30:00Z", user: "Jane Smith", action: "Added team member", resource: "Team", ipAddress: "192.168.1.10" },
  { id: "al-20", timestamp: "2026-02-23T10:15:00Z", user: "Admin", action: "Exported call recording", resource: "Call #4750", ipAddress: "10.0.0.5" },
];
