/**
 * Contract: record-log API returns entries with at, subject, event only; no ids; cap 80.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";

const mockRequireWorkspaceAccess = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/lib/auth/workspace-access", () => ({
  requireWorkspaceAccess: (req: NextRequest, wid: string) => mockRequireWorkspaceAccess(req, wid),
}));
vi.mock("@/lib/db/queries", () => ({ getDb: () => mockGetDb() }));

describe("Record log contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    mockGetDb.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    { created_at: "2025-01-01T12:00:00Z", text: "Outcome recorded." },
                    { created_at: "2025-01-01T11:00:00Z", text: "Follow-up sent." },
                  ],
                }),
            }),
          }),
        }),
      }),
    });
  });

  it("response has entries array with correct shape", async () => {
    const { GET } = await import("@/app/api/operational/record-log/route");
    const req = new NextRequest("http://localhost/api/operational/record-log?workspace_id=w1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.entries)).toBe(true);
    for (const e of body.entries) {
      expect(e).toHaveProperty("at");
      expect(e).toHaveProperty("subject");
      expect(e).toHaveProperty("event");
      expect(Object.keys(e).sort()).toEqual(["at", "event", "subject"]);
    }
  });

  it("entries contain no internal id or workspace_id", async () => {
    const { GET } = await import("@/app/api/operational/record-log/route");
    const req = new NextRequest("http://localhost/api/operational/record-log?workspace_id=w1");
    const res = await GET(req);
    const body = await res.json();
    for (const e of body.entries) {
      expect(e).not.toHaveProperty("id");
      expect(e).not.toHaveProperty("workspace_id");
    }
  });

  it("route caps entries at 80", () => {
    const routePath = path.join(path.resolve(__dirname, ".."), "src", "app", "api", "operational", "record-log", "route.ts");
    const content = readFileSync(routePath, "utf-8");
    expect(content).toMatch(/LIMIT\s*=\s*80/);
  });
});
