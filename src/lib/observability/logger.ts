/**
 * Structured logging for operator. No console.log in production paths.
 * Every major stage logs: workspace, lead, stage, decision, action, outcome.
 */

export type LogLevel = "info" | "warn" | "error";

export interface StructuredLog {
  level: LogLevel;
  stage?: string;
  workspace_id?: string;
  lead_id?: string;
  decision?: string;
  action?: string;
  outcome?: string;
  message?: string;
  [k: string]: unknown;
}

function write(log: StructuredLog): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...log,
  });
  if (log.level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export function logStage(payload: Omit<StructuredLog, "level">): void {
  write({ level: "info", ...payload });
}

export function logWarn(payload: Omit<StructuredLog, "level">): void {
  write({ level: "warn", ...payload });
}

export function logError(payload: Omit<StructuredLog, "level">): void {
  write({ level: "error", ...payload });
}
