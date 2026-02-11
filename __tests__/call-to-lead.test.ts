import { describe, it, expect, vi } from "vitest";

let calendarLeadId: string | null = null;
let emailMatch: string | null = null;

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({
        eq: (col: string, val: string) => {
          if (col === "id") {
            calendarLeadId = val;
            return {
              eq: () => ({
                single: () =>
                  Promise.resolve(
                    val ? { data: { id: val } } : { data: null }
                  ),
              }),
            };
          }
          return {
            ilike: () => ({
              limit: () => ({
                single: () =>
                  Promise.resolve(
                    emailMatch ? { data: { id: emailMatch } } : { data: null }
                  ),
              }),
            }),
            not: () => ({
              then: (fn: (r: { data: unknown[] }) => unknown) =>
                fn({ data: [] }),
            }),
            gte: () => Promise.resolve({ data: [] }),
          };
        },
      }),
    }),
  }),
}));

import { matchCallToLead } from "@/lib/zoom/call-to-lead";

describe("call-to-lead matching", () => {
  beforeEach(() => {
    calendarLeadId = null;
    emailMatch = null;
  });

  it("matches by calendar when calendarLeadId provided", async () => {
    const result = await matchCallToLead("ws-1", {
      calendarLeadId: "lead-calendar-1",
    });
    expect(result.method).toBe("calendar");
    expect(result.lead_id).toBe("lead-calendar-1");
    expect(result.confidence).toBe(1);
  });

  it("matches by email when participant email matches", async () => {
    emailMatch = "lead-email-1";
    const result = await matchCallToLead("ws-1", {
      participantEmails: ["alice@example.com"],
    });
    expect(result.method).toBe("email");
    expect(result.lead_id).toBe("lead-email-1");
  });

  it("returns unmatched when no match", async () => {
    const result = await matchCallToLead("ws-1", {
      participantEmails: ["unknown@example.com"],
    });
    expect(result.method).toBe("unmatched");
    expect(result.lead_id).toBeNull();
  });

  it("returns valid result shape", async () => {
    const result = await matchCallToLead("ws-1", {});
    expect(result).toHaveProperty("lead_id");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("method");
    expect(["calendar", "email", "phone", "name_fuzzy", "unmatched"]).toContain(
      result.method
    );
  });
});
