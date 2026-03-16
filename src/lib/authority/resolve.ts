/**
 * Authority gate — every action engine must resolve authority before execution.
 * Level 0 = observe, 1 = continue, 2 = adjust, 3 = human judgment (escalate), 4 = risk (halt).
 * If authority cannot be determined → escalate.
 */

export type AuthorityLevel = 0 | 1 | 2 | 3 | 4;

export interface AuthorityResult {
  level: AuthorityLevel;
  escalate: boolean;
  reason?: string;
}

/**
 * Resolve authority for a workspace+lead context before any action runs.
 * Must be called by every operational engine before execution.
 * Returns level and whether to escalate (true = do not execute, hand off to human).
 */
export async function resolveAuthority(
  _workspaceId: string,
  _leadId: string
): Promise<AuthorityResult> {
  // Default: Level 1 (continue normal flow). Engines may override with workspace/lead-specific logic.
  // When escalation rules or risk signals exist, return level 3 or 4 and escalate: true.
  const { getDb } = await import("@/lib/db/queries");
  const db = getDb();

  const [
    { data: wsData },
    { data: leadData },
  ] = await Promise.all([
    db.from("workspaces").select("status, kill_switch").eq("id", _workspaceId).maybeSingle(),
    db.from("leads").select("opt_out, state").eq("id", _leadId).maybeSingle(),
  ]);

  const ws = wsData as { status?: string; kill_switch?: boolean } | null;
  const lead = leadData as { opt_out?: boolean; state?: string } | null;

  if (ws?.kill_switch === true) {
    return { level: 4, escalate: true, reason: "kill_switch" };
  }
  if (ws?.status === "paused") {
    return { level: 4, escalate: true, reason: "workspace_paused" };
  }
  if (lead?.opt_out === true) {
    return { level: 4, escalate: true, reason: "opt_out" };
  }

  return { level: 1, escalate: false };
}
