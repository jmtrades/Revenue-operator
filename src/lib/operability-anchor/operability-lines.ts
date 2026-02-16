/**
 * Operability statements: short factual lines when process maintains operation.
 * No numbers, no metrics. Max 3 lines.
 */

import { processMaintainsOperation } from "./expectations";

const MAX_LINE_LEN = 90;
const MAX_LINES = 3;

const LINES = [
  "The operation is being maintained by the process.",
  "Ongoing work is being coordinated through the record.",
  "Current activity depends on the operating process.",
];

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

export async function getOperabilityLines(workspaceId: string): Promise<string[]> {
  const anchored = await processMaintainsOperation(workspaceId);
  if (!anchored) return [];
  return LINES.map(trim).slice(0, MAX_LINES);
}
