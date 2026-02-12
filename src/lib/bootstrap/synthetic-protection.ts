/**
 * Synthetic protection bootstrap — 60-second belief moment
 * Staged activity events for workspaces with zero real leads.
 * Events enter action_logs and appear in command center.
 * No demo labels. Operational appearance only.
 */

import { getDb } from "@/lib/db/queries";

const STEPS = [
  { delaySec: 2, action: "inbound_detected", actor: "Qualifier", role: "qualifier", payload: { noticed: "New conversation detected.", decision: "Preparing response.", expected: "Response ready for review." } },
  { delaySec: 5, action: "response_prepared", actor: "Qualifier", role: "qualifier", payload: { noticed: "Inbound message received.", decision: "Response prepared.", expected: "Follow-up scheduled." } },
  { delaySec: 9, action: "follow_up_scheduled", actor: "Follow-up Manager", role: "follow_up_manager", payload: { noticed: "Touchpoint scheduled.", decision: "Next step in 24h.", expected: "Booking window opens." } },
  { delaySec: 14, action: "booking_projected", actor: "Setter", role: "setter", payload: { noticed: "Booking opportunity identified.", decision: "Booking path prepared.", expected: "Calendar protection when booked." } },
  { delaySec: 20, action: "calendar_protection_active", actor: "Show Manager", role: "show_manager", payload: { noticed: "Protection cycle active.", decision: "Attendance confirmation scheduled.", expected: "Conversation maintained." } },
] as const;

export async function runSyntheticProtectionBootstrap(workspaceId: string): Promise<{ started?: boolean; completed?: boolean; step?: number }> {
  const db = getDb();

  const { count: leadCount } = await db.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
  if ((leadCount ?? 0) > 0) return {};

  const { count: actionCount } = await db.from("action_logs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
  if ((actionCount ?? 0) > 0) return {};

  const { data: actState } = await db
    .from("activation_states")
    .select("synthetic_bootstrap_completed, synthetic_bootstrap_started_at, synthetic_bootstrap_step")
    .eq("workspace_id", workspaceId)
    .single();

  const completed = (actState as { synthetic_bootstrap_completed?: boolean })?.synthetic_bootstrap_completed ?? false;
  if (completed) return { completed: true };

  const startedAt = (actState as { synthetic_bootstrap_started_at?: string })?.synthetic_bootstrap_started_at;
  const currentStep = (actState as { synthetic_bootstrap_step?: number })?.synthetic_bootstrap_step ?? 0;

  const now = new Date();
  let nextStep = currentStep;

  if (!startedAt) {
    const { data: synthLead } = await db
      .from("leads")
      .insert({
        workspace_id: workspaceId,
        name: "Inbound enquiry",
        state: "CONTACTED",
        last_activity_at: now.toISOString(),
        metadata: { synthetic_bootstrap: true },
      })
      .select("id")
      .single();

    const leadId = (synthLead as { id: string })?.id;
    if (!leadId) return {};

    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        step: "scan",
        synthetic_bootstrap_started_at: now.toISOString(),
        synthetic_bootstrap_step: 0,
        updated_at: now.toISOString(),
      },
      { onConflict: "workspace_id" }
    );
    return { started: true, step: 0 };
  }

  const startedAtDate = new Date(startedAt);
  for (let i = currentStep; i < STEPS.length; i++) {
    const step = STEPS[i]!;
    const requiredElapsed = step.delaySec * 1000;
    const elapsed = now.getTime() - startedAtDate.getTime();
    if (elapsed >= requiredElapsed) {
      const { data: synthLead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).limit(1).single();
      const leadId = (synthLead as { id?: string })?.id;
      if (!leadId) break;

      await db.from("action_logs").insert({
        workspace_id: workspaceId,
        entity_type: "lead",
        entity_id: leadId,
        action: step.action,
        actor: step.actor,
        role: step.role,
        payload: step.payload,
        created_at: new Date(startedAtDate.getTime() + step.delaySec * 1000).toISOString(),
      });
      nextStep = i + 1;
    }
  }

  const finalStep = STEPS.length;
  const isComplete = nextStep >= finalStep;
  if (isComplete) {
    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        synthetic_bootstrap_completed: true,
        synthetic_bootstrap_step: finalStep,
        updated_at: now.toISOString(),
      },
      { onConflict: "workspace_id" }
    );
    return { completed: true, step: finalStep };
  }

  if (nextStep > currentStep) {
    await db.from("activation_states").upsert(
      {
        workspace_id: workspaceId,
        synthetic_bootstrap_step: nextStep,
        updated_at: now.toISOString(),
      },
      { onConflict: "workspace_id" }
    );
  }
  return { step: nextStep };
}

export async function shouldRunBootstrap(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { count: leadCount } = await db.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
  if ((leadCount ?? 0) > 0) return false;
  const { count: actionCount } = await db.from("action_logs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId);
  if ((actionCount ?? 0) > 0) return false;
  const { data: act } = await db.from("activation_states").select("synthetic_bootstrap_completed").eq("workspace_id", workspaceId).single();
  return !(act as { synthetic_bootstrap_completed?: boolean })?.synthetic_bootstrap_completed;
}
