/**
 * Action Layer — Persist then enqueue. Dedup by dedup_key (no double execution).
 */

import { enqueue } from "@/lib/queue";
import { persistActionCommand } from "./persist";
import type { ActionCommand } from "./types";

/**
 * Persist to action_commands (dedup_key UNIQUE), then enqueue job with action_command id.
 * If dedup_key already exists, does not enqueue again. Returns job id or empty string if duplicate.
 */
export async function enqueueAction(command: ActionCommand): Promise<string> {
  const { id: actionCommandId, isNew } = await persistActionCommand(command);
  if (!isNew) return "";
  return enqueue({ type: "action", action: command, action_command_id: actionCommandId });
}
