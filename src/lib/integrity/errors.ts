/**
 * Integrity and progress errors. Both must trigger escalation and never crash the worker.
 * Process-queue catch block treats them as job failure + logEscalation(system_integrity_violation / progress_stalled).
 */

export class IntegrityInvariantError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "IntegrityInvariantError";
  }
}

export class ProgressStalledError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ProgressStalledError";
  }
}
