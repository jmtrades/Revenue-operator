/**
 * Apply a preset to a workspace.
 * Creates default sequences and updates settings. No user configuration.
 */

import { getDb } from "@/lib/db/queries";
import { getPresetForBusinessType } from "./presets";
import type { RevenuePreset } from "./types";

export async function applyPresetToWorkspace(
  workspaceId: string,
  businessType: string | null | undefined
): Promise<{ applied: boolean; preset_id: string }> {
  const db = getDb();
  const preset = getPresetForBusinessType(businessType);

  // Ensure settings row exists and set business_type + preset
  const { data: existing } = await db.from("settings").select("id, business_type, preset_id").eq("workspace_id", workspaceId).maybeSingle();
  if (existing) {
    await db
      .from("settings")
      .update({
        business_type: businessType?.trim() || null,
        preset_id: preset.id,
        preset_applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId);
  }
  // If no settings row, trial/start or workspace creation will insert; we only update when already present

  // Ensure default sequences exist for this workspace (followup, revival, attendance)
  await ensureDefaultSequences(workspaceId, preset);

  return { applied: true, preset_id: preset.id };
}

async function ensureDefaultSequences(workspaceId: string, preset: RevenuePreset): Promise<void> {
  const db = getDb();

  const purposes = ["followup", "revival", "attendance"] as const;
  for (const purpose of purposes) {
    const { data: existing } = await db
      .from("sequences")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("purpose", purpose)
      .limit(1)
      .maybeSingle();

    if (existing) continue;

    const steps =
      purpose === "followup"
        ? preset.followup_delays_hours.map((delay_hours, i) => ({
            step: i + 1,
            delay_hours,
            intervention_type: i === 0 ? "clarify" : "reassurance",
            template_key: `followup_${i + 1}`,
            stop_on_reply: true,
          }))
        : purpose === "revival"
          ? [
              { step: 1, delay_hours: 24, intervention_type: "revive", template_key: "revival_1", stop_on_reply: true },
              { step: 2, delay_hours: 72, intervention_type: "revive", template_key: "revival_2", stop_on_reply: true },
            ]
          : [
              { step: 1, delay_hours: preset.reminder_before_hours[0] ?? 24, intervention_type: "reminder", template_key: "reminder_1", stop_on_reply: true },
              { step: 2, delay_hours: preset.reminder_before_hours[1] ?? 3, intervention_type: "prep_info", template_key: "prep_1", stop_on_reply: true },
            ];

    await db.from("sequences").insert({
      workspace_id: workspaceId,
      name: `Default ${purpose}`,
      purpose,
      is_default: true,
      steps,
    });
  }
}
