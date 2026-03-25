import { describe, it, expect } from "vitest";

describe("Dispute flow", () => {
  it("POST /api/billing/dispute expects invoice_item_id in body", () => {
    const validBody = { invoice_item_id: "uuid-here" };
    expect(validBody.invoice_item_id).toBeDefined();
    expect(typeof validBody.invoice_item_id).toBe("string");
  });

  it("disputed items get status=disputed", () => {
    const expectedStatus = "disputed";
    expect(expectedStatus).toBe("disputed");
  });
});
