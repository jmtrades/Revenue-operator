/**
 * Message drift detection: compare generated message against template expectations.
 * If deviation above threshold: switch to safe mode, log drift alert.
 */

import { getDb } from "@/lib/db/queries";
import { ACTION_TEMPLATES } from "@/lib/templates";

const DRIFT_THRESHOLD = 0.4;
const FALLBACK_MESSAGE = "Thanks for reaching out. Could you tell me a bit more about what you're looking for?";

function computeDriftScore(message: string, action: string): number {
  const def = ACTION_TEMPLATES[action] ?? ACTION_TEMPLATES.clarifying_question;
  const maxLen = def.maxLength ?? 200;
  if (message.length > maxLen * 1.5) return 0.8;
  const lenRatio = message.length / maxLen;
  if (lenRatio > 1.2) return 0.5;
  const hasSlotStructure = /^(Hi|Hey|Thanks|Hello|Great)/i.test(message) || message.includes("?");
  if (!hasSlotStructure && message.length > 100) return 0.6;
  return 0;
}

export function checkDrift(
  message: string,
  action: string
): { driftScore: number; useSafeMode: boolean } {
  const driftScore = computeDriftScore(message, action);
  return {
    driftScore,
    useSafeMode: driftScore >= DRIFT_THRESHOLD,
  };
}

export async function logDriftAlert(
  workspaceId: string,
  leadId: string | null,
  driftScore: number,
  messagePreview: string
): Promise<void> {
  const db = getDb();
  await db.from("message_drift_alerts").insert({
    workspace_id: workspaceId,
    lead_id: leadId,
    drift_score: driftScore,
    message_preview: messagePreview.slice(0, 200),
  });
}

export function getSafeMessageOnDrift(): string {
  return FALLBACK_MESSAGE;
}
