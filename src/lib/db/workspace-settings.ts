/**
 * Workspace Settings helpers.
 *
 * The `workspace_settings` table stores ONE row per workspace with a single
 * `settings` JSONB column (not key/value rows). These helpers provide a
 * convenient key-value interface on top of that JSONB blob.
 *
 * Columns: id, workspace_id, settings (jsonb), created_at, updated_at
 */

import { getDb } from "@/lib/db/queries";

type SettingsBlob = Record<string, unknown>;

/**
 * Read the full settings blob for a workspace.
 * Returns an empty object if no row exists yet.
 */
export async function getSettingsBlob(workspaceId: string): Promise<SettingsBlob> {
  const db = getDb();
  const { data, error } = await db
    .from("workspace_settings")
    .select("settings")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !data) return {};
  const row = data as { settings?: SettingsBlob | null };
  return row.settings ?? {};
}

/**
 * Get a single setting value by key. Returns `null` if not found.
 */
export async function getWorkspaceSetting(
  workspaceId: string,
  key: string,
): Promise<string | null> {
  const blob = await getSettingsBlob(workspaceId);
  const val = blob[key];
  if (val === undefined || val === null) return null;
  return typeof val === "string" ? val : JSON.stringify(val);
}

/**
 * Get multiple setting values by keys. Missing keys are omitted.
 */
export async function getWorkspaceSettings(
  workspaceId: string,
  keys: string[],
): Promise<Record<string, string>> {
  const blob = await getSettingsBlob(workspaceId);
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = blob[key];
    if (val !== undefined && val !== null) {
      result[key] = typeof val === "string" ? val : JSON.stringify(val);
    }
  }
  return result;
}

/**
 * Get all settings whose keys match a prefix.
 * Useful for patterns like `call_learning_*`.
 */
export async function getWorkspaceSettingsByPrefix(
  workspaceId: string,
  prefix: string,
): Promise<Record<string, string>> {
  const blob = await getSettingsBlob(workspaceId);
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(blob)) {
    if (key.startsWith(prefix) && val !== undefined && val !== null) {
      result[key] = typeof val === "string" ? val : JSON.stringify(val);
    }
  }
  return result;
}

/**
 * Merge one or more key-value pairs into the workspace settings JSONB.
 * Creates the row if it doesn't exist yet (upsert).
 */
export async function setWorkspaceSettings(
  workspaceId: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const db = getDb();

  // Read current blob
  const current = await getSettingsBlob(workspaceId);
  const merged = { ...current, ...updates };

  // Upsert row
  await db.from("workspace_settings").upsert(
    {
      workspace_id: workspaceId,
      settings: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );
}

/**
 * Convenience: set a single key.
 */
export async function setWorkspaceSetting(
  workspaceId: string,
  key: string,
  value: unknown,
): Promise<void> {
  await setWorkspaceSettings(workspaceId, { [key]: value });
}
