/**
 * DEPRECATED: Vapi integration no longer used. Product has switched to Recall voice system.
 * This function is now a no-op and kept for backward compatibility only.
 * Do not use in new code.
 */

import { getDb } from "@/lib/db/queries";

type DbLike = ReturnType<typeof getDb>;

export async function syncVapiAgent(_db: DbLike, _agentId: string): Promise<{ assistantId: string }> {
  console.warn(
    "[DEPRECATION] syncVapiAgent called but Vapi is no longer supported. " +
    "Product has migrated to Recall voice system. This function is a no-op."
  );
  return { assistantId: "" };
}
