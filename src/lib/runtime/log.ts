/**
 * Structured production logging. No PII or message contents.
 */

export function log(event: string, data?: Record<string, unknown> & { workspace_id?: string }): void {
  if (typeof window !== "undefined") return;
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    event,
    ...(data ?? {}),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}
