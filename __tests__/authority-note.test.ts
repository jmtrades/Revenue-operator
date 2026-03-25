/**
 * Contract: authority-note API requires auth, returns ok + recorded, sanitizes to one sentence ≤80 chars.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireWorkspaceAccess = vi.fn();
const mockSanitize = vi.fn();
const mockRecord = vi.fn();

vi.mock("@/lib/auth/workspace-access", () => ({
  requireWorkspaceAccess: (req: NextRequest, wid: string) => mockRequireWorkspaceAccess(req, wid),
}));
vi.mock("@/lib/orientation/records", () => ({
  sanitizeOrientationText: (raw: string) => mockSanitize(raw),
  recordOrientationStatement: (wid: string, text: string) => mockRecord(wid, text),
}));

describe("Authority note contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    mockSanitize.mockImplementation((s: string) => (s.length > 80 ? s.slice(0, 80).trim() : s.trim()) || "Outcome recorded.");
    mockRecord.mockResolvedValue(undefined);
  });

  it("returns 400 when workspace_id is missing", async () => {
    const { POST } = await import("@/app/api/operational/authority-note/route");
    const req = new NextRequest("http://localhost/api/operational/authority-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Note." }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when workspace access is denied", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(new Response(null, { status: 401 }));
    const { POST } = await import("@/app/api/operational/authority-note/route");
    const req = new NextRequest("http://localhost/api/operational/authority-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: "w1", text: "Note." }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns ok and recorded with sanitized text", async () => {
    mockSanitize.mockReturnValue("Outcome recorded.");
    const { POST } = await import("@/app/api/operational/authority-note/route");
    const req = new NextRequest("http://localhost/api/operational/authority-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: "w1", text: "Something long and rambling that should be trimmed to one sentence." }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("ok", true);
    expect(body).toHaveProperty("recorded");
    expect(typeof body.recorded).toBe("string");
    expect(body.recorded.length).toBeLessThanOrEqual(80);
    expect(mockSanitize).toHaveBeenCalled();
    expect(mockRecord).toHaveBeenCalledWith("w1", "Outcome recorded.");
  });
});
