/**
 * Read session from API route request. Use for protected routes.
 */

import type { NextRequest } from "next/server";
import { getSessionFromCookie, getSessionCookieName } from "./session";

export function getSession(req: NextRequest): { userId: string; workspaceId?: string } | null {
  const cookie = req.cookies.get(getSessionCookieName())?.value ?? null;
  const session = getSessionFromCookie(cookie);
  if (!session) return null;
  return { userId: session.userId, workspaceId: session.workspaceId };
}
