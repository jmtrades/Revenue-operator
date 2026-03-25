/**
 * Wrapper: run an engine only after resolving authority.
 * If authority says escalate → do not run, throw so caller can hand off.
 * Ensures no engine bypasses the authority gate.
 */

import { resolveAuthority } from "./resolve";
import type { OperationalEngineId } from "@/lib/operational-engines";

export class AuthorityRequiredError extends Error {
  constructor(
    public readonly workspaceId: string,
    public readonly leadId: string,
    public readonly reason?: string
  ) {
    super("Authority required: escalate.");
    this.name = "AuthorityRequiredError";
  }
}

/**
 * Run an engine function only if authority allows and engine is in tier scope.
 * If escalate is true or engine not allowed for workspace, throws so pipeline can hand off.
 */
export async function runWithAuthority<T>(
  workspaceId: string,
  leadId: string,
  engineId: OperationalEngineId,
  fn: () => Promise<T>
): Promise<T> {
  const { isEngineAllowedForWorkspace } = await import("@/lib/operational-engines");
  const allowed = await isEngineAllowedForWorkspace(workspaceId, engineId);
  if (!allowed) {
    throw new AuthorityRequiredError(workspaceId, leadId, "engine_not_in_tier");
  }
  const auth = await resolveAuthority(workspaceId, leadId);
  if (auth.escalate) {
    throw new AuthorityRequiredError(workspaceId, leadId, auth.reason);
  }
  return fn();
}
