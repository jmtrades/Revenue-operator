/**
 * Phase 27 — GDPR/CCPA/CPRA data subject request handler.
 */

import { describe, it, expect } from "vitest";
import {
  openDsrRequest,
  requestVerification,
  completeVerification,
  beginProcessing,
  applyExtension,
  denyForExemption,
  completeDsr,
  withdrawDsr,
  overdueMilliseconds,
  buildPortableExport,
  type DsrRequest,
} from "../src/lib/compliance/data-subject-request";

const NOW = "2026-04-22T12:00:00.000Z";

function requestOf(overrides: Partial<DsrRequest> = {}): DsrRequest {
  return {
    id: "dsr-1",
    type: "access",
    subject: {
      subjectIdentifier: "alice@example.com",
      subjectEmail: "alice@example.com",
      regime: "gdpr",
    },
    receivedAt: NOW,
    ...overrides,
  };
}

describe("openDsrRequest", () => {
  it("sets status to received", () => {
    const s = openDsrRequest(requestOf());
    expect(s.status).toBe("received");
  });

  it("sets GDPR deadline to +30 days", () => {
    const s = openDsrRequest(requestOf());
    expect(s.responseDeadline).toBe("2026-05-22T12:00:00.000Z");
  });

  it("sets CCPA deadline to +45 days", () => {
    const s = openDsrRequest(
      requestOf({ subject: { ...requestOf().subject, regime: "ccpa" } }),
    );
    expect(s.responseDeadline).toBe("2026-06-06T12:00:00.000Z");
  });

  it("records receipt in audit log", () => {
    const s = openDsrRequest(requestOf());
    expect(s.auditLog[0].event).toBe("received");
    expect(s.auditLog[0].detail).toContain("type=access");
  });
});

describe("verification flow", () => {
  it("moves to pending_verification on request", () => {
    const s = requestVerification(openDsrRequest(requestOf()), NOW);
    expect(s.status).toBe("pending_verification");
  });

  it("moves to verified on successful email challenge", () => {
    const s = completeVerification(
      requestVerification(openDsrRequest(requestOf()), NOW),
      { method: "email_challenge", verifiedAt: NOW },
      NOW,
    );
    expect(s.status).toBe("verified");
  });

  it("moves to denied_unverifiable when verification fails", () => {
    const s = completeVerification(
      requestVerification(openDsrRequest(requestOf()), NOW),
      { method: "none", failureReason: "did not respond" },
      NOW,
    );
    expect(s.status).toBe("denied_unverifiable");
  });
});

describe("processing flow", () => {
  it("beginProcessing only works when verified", () => {
    const unverified = openDsrRequest(requestOf());
    const rejected = beginProcessing(unverified, NOW);
    expect(rejected.status).toBe("received"); // did not transition

    const verified = completeVerification(
      requestVerification(unverified, NOW),
      { method: "email_challenge", verifiedAt: NOW },
      NOW,
    );
    const started = beginProcessing(verified, NOW);
    expect(started.status).toBe("in_progress");
  });

  it("completeDsr marks completed", () => {
    const started = beginProcessing(
      completeVerification(
        requestVerification(openDsrRequest(requestOf()), NOW),
        { method: "email_challenge", verifiedAt: NOW },
        NOW,
      ),
      NOW,
    );
    const done = completeDsr(started, NOW, "export shipped");
    expect(done.status).toBe("completed");
  });

  it("withdrawDsr marks withdrawn", () => {
    const s = withdrawDsr(openDsrRequest(requestOf()), NOW);
    expect(s.status).toBe("withdrawn");
  });
});

describe("deadline extensions", () => {
  it("extends GDPR by +60 days", () => {
    const s = applyExtension(openDsrRequest(requestOf()), null, NOW);
    expect(s.extendedDeadline).toBe("2026-07-21T12:00:00.000Z"); // 30 + 60 = 90
    expect(s.status).toBe("extended");
  });

  it("extends CCPA by +45 days (total 90)", () => {
    const ccpa = openDsrRequest(
      requestOf({ subject: { ...requestOf().subject, regime: "ccpa" } }),
    );
    const s = applyExtension(ccpa, null, NOW);
    expect(s.extendedDeadline).toBe("2026-07-21T12:00:00.000Z"); // 45 + 45 = 90
  });
});

describe("exemptions", () => {
  it("denyForExemption records the exemption code", () => {
    const s = denyForExemption(
      openDsrRequest(requestOf({ type: "deletion" })),
      { code: "legal_hold", explanation: "active litigation hold" },
      NOW,
    );
    expect(s.status).toBe("denied_exemption");
    expect(s.exemption?.code).toBe("legal_hold");
  });
});

describe("overdueMilliseconds", () => {
  it("returns negative when in-window", () => {
    const s = openDsrRequest(requestOf());
    const ms = overdueMilliseconds(s, "2026-05-01T12:00:00.000Z");
    expect(ms).toBeLessThan(0);
  });

  it("returns positive when overdue", () => {
    const s = openDsrRequest(requestOf());
    const ms = overdueMilliseconds(s, "2026-06-01T12:00:00.000Z");
    expect(ms).toBeGreaterThan(0);
  });

  it("respects extended deadline when set", () => {
    const extended = applyExtension(openDsrRequest(requestOf()), null, NOW);
    const ms = overdueMilliseconds(extended, "2026-06-01T12:00:00.000Z");
    expect(ms).toBeLessThan(0); // still in extended window
  });
});

describe("buildPortableExport", () => {
  it("produces a JSON-serializable export package", () => {
    const s = openDsrRequest(requestOf({ type: "portability" }));
    const exp = buildPortableExport(s, {
      includePersonalData: {
        profile: { email: "alice@example.com", name: "Alice" },
        orders: [{ id: "o1", total: 99 }],
      },
    });
    expect(exp.subjectIdentifier).toBe("alice@example.com");
    expect(exp.regime).toBe("gdpr");
    expect(exp.dataCategories).toEqual(["profile", "orders"]);
    // Verify serializable
    expect(() => JSON.stringify(exp)).not.toThrow();
  });

  it("includes audit trail when provided", () => {
    const s = openDsrRequest(requestOf());
    const exp = buildPortableExport(s, {
      includePersonalData: {},
      includeAuditTrail: [
        { at: NOW, event: "received" },
        { at: NOW, event: "verified" },
      ],
    });
    expect(exp.auditTrail).toHaveLength(2);
  });
});
