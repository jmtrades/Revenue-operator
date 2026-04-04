/**
 * Sequence Enrollment State Machine — Formal transition validation.
 *
 * Prevents invalid state transitions that can corrupt sequence state.
 * Every status change MUST go through validateTransition() before persisting.
 *
 * Valid transitions:
 *   active   → completed | cancelled | paused
 *   paused   → active | cancelled
 *   completed → (terminal — no transitions)
 *   cancelled → (terminal — no transitions)
 */

export type EnrollmentStatus = "active" | "completed" | "cancelled" | "paused";

/** Map of valid transitions: from → [allowed targets] */
const VALID_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  active:    ["completed", "cancelled", "paused"],
  paused:    ["active", "cancelled"],
  completed: [], // Terminal
  cancelled: [], // Terminal
};

/** Reasons that justify each transition */
const TRANSITION_REASONS: Record<string, string[]> = {
  "active→completed":   ["all_steps_done", "goal_achieved", "manual_complete"],
  "active→cancelled":   ["opt_out", "reply_received", "escalation_hold", "manual_cancel", "lead_disqualified", "duplicate"],
  "active→paused":      ["rate_limit", "manual_pause", "payment_failed", "workspace_paused", "awaiting_response"],
  "paused→active":      ["manual_resume", "payment_resolved", "workspace_resumed", "response_received"],
  "paused→cancelled":   ["opt_out", "manual_cancel", "lead_disqualified", "timeout"],
};

export interface TransitionResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a state transition before persisting it.
 */
export function validateTransition(
  from: EnrollmentStatus,
  to: EnrollmentStatus,
  reason?: string
): TransitionResult {
  // Same state — no-op, allow silently
  if (from === to) {
    return { valid: true };
  }

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    return {
      valid: false,
      error: `Invalid transition: ${from} → ${to}. Allowed from ${from}: [${(allowed ?? []).join(", ")}]`,
    };
  }

  // Validate reason if provided
  if (reason) {
    const key = `${from}→${to}`;
    const validReasons = TRANSITION_REASONS[key];
    if (validReasons && !validReasons.includes(reason)) {
      return {
        valid: false,
        error: `Invalid reason "${reason}" for transition ${from} → ${to}. Valid reasons: [${validReasons.join(", ")}]`,
      };
    }
  }

  return { valid: true };
}

/**
 * Check if a status is terminal (no further transitions allowed).
 */
export function isTerminal(status: EnrollmentStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}

/**
 * Get all valid next states from the current state.
 */
export function getValidNextStates(current: EnrollmentStatus): EnrollmentStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Safe transition helper — validates then updates the enrollment.
 * Returns the new status on success, or throws on invalid transition.
 */
export async function safeTransition(
  workspaceId: string,
  enrollmentId: string,
  currentStatus: EnrollmentStatus,
  newStatus: EnrollmentStatus,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const validation = validateTransition(currentStatus, newStatus, reason);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  try {
    const { getDb } = await import("@/lib/db/queries");
    const db = getDb();

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "completed") {
      updatePayload.completed_at = new Date().toISOString();
    }
    if (newStatus === "cancelled") {
      updatePayload.unenrolled_at = new Date().toISOString();
    }

    // Use conditional update to prevent race: only update if status still matches
    const { error, count } = await db
      .from("sequence_enrollments")
      .update(updatePayload)
      .eq("id", enrollmentId)
      .eq("workspace_id", workspaceId)
      .eq("status", currentStatus); // Optimistic lock — only update if still in expected state

    if (error) {
      return { ok: false, error: `DB error: ${error.message}` };
    }

    if (count === 0) {
      return {
        ok: false,
        error: `Enrollment ${enrollmentId} is no longer in status "${currentStatus}" — concurrent update detected`,
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
