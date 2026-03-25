/**
 * Structured production logging. No PII or message contents.
 */

import { log as logStructured } from "@/lib/logger";

export function log(event: string, data?: Record<string, unknown> & { workspace_id?: string }): void {
  if (typeof window !== "undefined") return;
  logStructured("info", event, data as Record<string, unknown>);
}
