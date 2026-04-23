/**
 * Phase 13c — Consent audit log tests (pure).
 */

import { describe, it, expect } from "vitest";
import {
  buildConsentAuditRow,
  currentConsentStatus,
  normalizeEmailLower,
  normalizePhone,
  recordConsentEvent,
  recordConsentGrant,
  recordConsentRevoke,
  type ConsentAuditRow,
  type ConsentAuditWriter,
} from "../src/lib/compliance/consent-audit";

function makeFakeWriter(): ConsentAuditWriter & { rows: ConsentAuditRow[] } {
  const rows: ConsentAuditRow[] = [];
  return {
    rows,
    async insertConsentAudit(row) {
      rows.push({ ...row });
      return { id: `row-${rows.length}` };
    },
    async listConsentAudit(query) {
      return rows.filter((r) => {
        if (r.workspace_id !== query.workspaceId) return false;
        if (query.leadId && r.lead_id !== query.leadId) return false;
        if (query.phoneNumber && r.phone_number !== query.phoneNumber) return false;
        if (query.emailLower && r.email_lower !== query.emailLower) return false;
        return true;
      });
    },
  };
}

describe("consent-audit.normalizePhone", () => {
  it("strips non-digits and requires at least 10 digits", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("15551234567");
    expect(normalizePhone("555-1234")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("consent-audit.normalizeEmailLower", () => {
  it("trims/lowercases and requires @", () => {
    expect(normalizeEmailLower("  Taylor@Acme.CO ")).toBe("taylor@acme.co");
    expect(normalizeEmailLower("not-an-email")).toBeNull();
    expect(normalizeEmailLower(null)).toBeNull();
  });
});

describe("consent-audit.buildConsentAuditRow", () => {
  it("builds a phone-only row", () => {
    const r = buildConsentAuditRow({
      workspaceId: "ws-1",
      phoneNumber: "+1 (555) 123-4567",
      action: "grant",
      channel: "voice",
      method: "verbal_yes",
    });
    expect(r.contact_type).toBe("phone");
    expect(r.phone_number).toBe("15551234567");
    expect(r.email_lower).toBeNull();
    expect(r.scope).toBe("workspace_all");
  });

  it("builds an email-only row", () => {
    const r = buildConsentAuditRow({
      workspaceId: "ws-1",
      email: "Taylor@Acme.co",
      action: "grant",
      channel: "email",
      method: "double_opt_in",
    });
    expect(r.contact_type).toBe("email");
    expect(r.email_lower).toBe("taylor@acme.co");
  });

  it("builds a both-contacts row", () => {
    const r = buildConsentAuditRow({
      workspaceId: "ws-1",
      phoneNumber: "5551234567",
      email: "t@a.co",
      action: "grant",
      channel: "web_form",
      method: "checkbox",
    });
    expect(r.contact_type).toBe("both");
  });

  it("defaults occurred_at to now", () => {
    const before = Date.now();
    const r = buildConsentAuditRow({
      workspaceId: "ws-1",
      email: "a@b.co",
      action: "grant",
      channel: "email",
      method: "single_opt_in",
    });
    const after = Date.now();
    const ts = Date.parse(r.occurred_at);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 1000);
  });
});

describe("consent-audit.recordConsentEvent", () => {
  it("refuses to insert a row with no contact identifier", async () => {
    const w = makeFakeWriter();
    const r = await recordConsentEvent(
      buildConsentAuditRow({
        workspaceId: "ws-1",
        action: "grant",
        channel: "manual",
        method: "manual_entry",
      }),
      w,
    );
    expect(r.id).toBeNull();
    expect(w.rows.length).toBe(0);
  });

  it("inserts a row with a phone number", async () => {
    const w = makeFakeWriter();
    const r = await recordConsentEvent(
      buildConsentAuditRow({
        workspaceId: "ws-1",
        phoneNumber: "5551234567",
        action: "grant",
        channel: "voice",
        method: "verbal_yes",
      }),
      w,
    );
    expect(r.id).not.toBeNull();
    expect(w.rows.length).toBe(1);
  });
});

describe("consent-audit.recordConsentGrant / Revoke", () => {
  it("records a grant → revoke sequence", async () => {
    const w = makeFakeWriter();
    await recordConsentGrant(
      {
        workspaceId: "ws-1",
        leadId: "lead-1",
        phoneNumber: "5551234567",
        channel: "web_form",
        method: "double_opt_in",
        evidence: { type: "form_id", value: { form: "f-1", ip: "1.1.1.1" } },
      },
      w,
    );
    await recordConsentRevoke(
      {
        workspaceId: "ws-1",
        leadId: "lead-1",
        phoneNumber: "5551234567",
        channel: "voice",
        method: "in_call_verbal",
      },
      w,
    );
    expect(w.rows.length).toBe(2);
    expect(w.rows[0]!.action).toBe("grant");
    expect(w.rows[1]!.action).toBe("revoke");
  });
});

describe("consent-audit.currentConsentStatus", () => {
  function row(action: ConsentAuditRow["action"], occurred: string, expires?: string): ConsentAuditRow {
    return {
      workspace_id: "ws-1",
      contact_type: "phone",
      phone_number: "5551234567",
      action,
      channel: "voice",
      method: "verbal_yes",
      occurred_at: occurred,
      expires_at: expires ?? null,
    };
  }

  it("returns false with no history", () => {
    const s = currentConsentStatus([]);
    expect(s.consented).toBe(false);
  });

  it("grant → consented", () => {
    const s = currentConsentStatus([row("grant", "2026-04-20T12:00:00.000Z")]);
    expect(s.consented).toBe(true);
    expect(s.lastAction).toBe("grant");
  });

  it("grant then revoke → not consented", () => {
    const s = currentConsentStatus([
      row("grant", "2026-04-20T12:00:00.000Z"),
      row("revoke", "2026-04-22T12:00:00.000Z"),
    ]);
    expect(s.consented).toBe(false);
    expect(s.lastAction).toBe("revoke");
  });

  it("revoke then reaffirm → consented again", () => {
    const s = currentConsentStatus([
      row("grant", "2026-04-20T12:00:00.000Z"),
      row("revoke", "2026-04-21T12:00:00.000Z"),
      row("reaffirm", "2026-04-22T12:00:00.000Z"),
    ]);
    expect(s.consented).toBe(true);
    expect(s.lastAction).toBe("reaffirm");
  });

  it("expired grant → not consented", () => {
    const past = new Date("2026-04-22T12:00:00.000Z");
    const s = currentConsentStatus(
      [row("grant", "2025-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")],
      past,
    );
    expect(s.consented).toBe(false);
  });

  it("bounced_out → not consented", () => {
    const s = currentConsentStatus([
      row("grant", "2026-04-01T12:00:00.000Z"),
      row("bounced_out", "2026-04-22T12:00:00.000Z"),
    ]);
    expect(s.consented).toBe(false);
    expect(s.lastAction).toBe("bounced_out");
  });
});
