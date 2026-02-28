import { getDb } from "@/lib/db/queries";

export type ActivationMilestone =
  | "trial_started"
  | "checkout_created"
  | "billing_active"
  | "activation_recorded"
  | "first_external_source_recorded"
  | "first_connector_event"
  | "first_action_intent_emitted"
  | "first_public_record_created"
  | "first_public_record_viewed"
  | "first_approval_created"
  | "first_approval_decided"
  | "first_voice_outcome"
  | "operator_invited"
  | "operator_joined";

export async function recordMilestone(
  workspaceId: string,
  milestone: ActivationMilestone | string,
  details?: Record<string, unknown>
): Promise<{ ok: boolean }> {
  try {
    const db = getDb();
    const payload = typeof details === "object" && details !== null ? details : {};
    await db.from("activation_milestones").insert({
      workspace_id: workspaceId,
      milestone,
      details_json: payload,
    });
    return { ok: true };
  } catch {
    // Milestone writes are best-effort only.
    return { ok: false };
  }
}

