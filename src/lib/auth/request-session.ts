/**
 * Read session from API route request. Use for protected routes.
 */

import type { NextRequest } from "next/server";
import { getSessionFromCookie } from "./session";

export function getSession(req: NextRequest): { userId: string; workspaceId?: string } | null {
  const cookieHeader = req.headers.get("cookie") ?? null;
  const session = getSessionFromCookie(cookieHeader);
  if (!session) return null;
  return { userId: session.userId, workspaceId: session.workspaceId };
}
