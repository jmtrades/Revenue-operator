/**
 * Resolve workspace from Zapier Bearer token (Task 22).
 * Used by trigger and action routes.
 */

import { getDb } from "@/lib/db/queries";

export async function getWorkspaceIdFromZapierToken(authorization: string | null): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const db = getDb();
  const { data } = await db
    .from("zapier_connections")
    .select("workspace_id")
    .eq("access_token", token)
    .maybeSingle();
  return (data as { workspace_id?: string } | null)?.workspace_id ?? null;
}
