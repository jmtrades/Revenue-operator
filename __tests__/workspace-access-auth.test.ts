/**
 * Operational endpoints auth: requireWorkspaceAccess returns 401 when unauthed, 404 when wrong workspace.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsSessionEnabled = vi.fn();
const mockGetSession = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/lib/auth/session", () => ({ isSessionEnabled: (...args: unknown[]) => mockIsSessionEnabled(...args) }));
vi.mock("@/lib/auth/request-session", () => ({ getSession: (...args: unknown[]) => mockGetSession(...args) }));
vi.mock("@/lib/db/queries", () => ({ getDb: (...args: unknown[]) => mockGetDb(...args) }));

describe("requireWorkspaceAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is enabled and request has no session", async () => {
    mockIsSessionEnabled.mockReturnValue(true);
    mockGetSession.mockReturnValue(null);
    const { requireWorkspaceAccess } = await import("@/lib/auth/workspace-access");
    const req = new NextRequest("http://localhost/api/installation/readiness?workspace_id=w1");
    const res = await requireWorkspaceAccess(req, "w1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("returns 404 when session is enabled and workspace not owned by session user", async () => {
    mockIsSessionEnabled.mockReturnValue(true);
    mockGetSession.mockReturnValue({ userId: "user-a", workspaceId: "w1" });
    mockGetDb.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: "w1", owner_id: "user-b" } }),
          }),
        }),
      }),
    });
    const { requireWorkspaceAccess } = await import("@/lib/auth/workspace-access");
    const req = new NextRequest("http://localhost/api/installation/readiness?workspace_id=w1", {
      headers: { Cookie: "revenue_session=something" },
    });
    const res = await requireWorkspaceAccess(req, "w1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
  });

  it("returns null when session is disabled (allow)", async () => {
    mockIsSessionEnabled.mockReturnValue(false);
    const { requireWorkspaceAccess } = await import("@/lib/auth/workspace-access");
    const req = new NextRequest("http://localhost/api/installation/readiness?workspace_id=w1");
    const res = await requireWorkspaceAccess(req, "w1");
    expect(res).toBeNull();
  });
});
