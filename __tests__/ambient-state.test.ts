/**
 * Contract: ambient-state API returns only line + institutional_state; line ≤90 chars; no forbidden words.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireWorkspaceAccess = vi.fn();
const mockGetDb = vi.fn();
const mockProcessMaintainsOperation = vi.fn();
const mockGetInstitutionalState = vi.fn();

vi.mock("@/lib/auth/workspace-access", () => ({
  requireWorkspaceAccess: (req: NextRequest, wid: string) => mockRequireWorkspaceAccess(req, wid),
}));
vi.mock("@/lib/db/queries", () => ({ getDb: () => mockGetDb() }));
vi.mock("@/lib/operability-anchor", () => ({
  processMaintainsOperation: (wid: string) => mockProcessMaintainsOperation(wid),
}));
vi.mock("@/lib/institutional-state", () => ({
  getInstitutionalState: (wid: string) => mockGetInstitutionalState(wid),
}));

const FORBIDDEN = /\b(you|your|we|us|click|optimize|ROI|KPI|dashboard|assistant|metric|percentage)\b/gi;

describe("Ambient state contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    mockGetInstitutionalState.mockResolvedValue("none");
    mockProcessMaintainsOperation.mockResolvedValue(false);
    mockGetDb.mockReturnValue({
      from: (table: string) => {
        if (table === "escalation_logs") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  not: () => ({ gt: () => Promise.resolve({ count: 0 }) }),
                }),
              }),
            }),
          };
        }
        if (table === "proof_capsules") {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () => Promise.resolve({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    });
  });

  it("response has only line and institutional_state keys", async () => {
    const { GET } = await import("@/app/api/operational/ambient-state/route");
    const req = new NextRequest("http://localhost/api/operational/ambient-state?workspace_id=w1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["institutional_state", "line"]);
  });

  it("line length is at most 90 characters", async () => {
    const { GET } = await import("@/app/api/operational/ambient-state/route");
    const req = new NextRequest("http://localhost/api/operational/ambient-state?workspace_id=w1");
    const res = await GET(req);
    const body = await res.json();
    expect(typeof body.line).toBe("string");
    expect(body.line.length).toBeLessThanOrEqual(90);
  });

  it("line contains no forbidden words", async () => {
    const { GET } = await import("@/app/api/operational/ambient-state/route");
    const req = new NextRequest("http://localhost/api/operational/ambient-state?workspace_id=w1");
    const res = await GET(req);
    const body = await res.json();
    const lower = body.line.toLowerCase();
    expect(lower).not.toMatch(FORBIDDEN);
  });

  it("institutional_state is one of allowed values", async () => {
    const { GET } = await import("@/app/api/operational/ambient-state/route");
    const req = new NextRequest("http://localhost/api/operational/ambient-state?workspace_id=w1");
    const res = await GET(req);
    const body = await res.json();
    const allowed = ["none", "embedded", "reliant", "assumed", "institutional"];
    expect(allowed).toContain(body.institutional_state);
  });
});
