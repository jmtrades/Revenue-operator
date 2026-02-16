/**
 * Solo surface sections: client state, awaiting actions, what progressed, what would stall.
 * Factual sentences only.
 */

import { getSoloContinuity } from "@/lib/surfaces/solo-continuity";
import { getSoloClientState } from "@/lib/surfaces/solo-client-state";

export interface SoloSectionsPayload {
  client_state: string[];
  awaiting_actions: string[];
  what_progressed: string[];
  what_would_stall: string[];
}

export async function getSoloSections(workspaceId: string): Promise<SoloSectionsPayload> {
  const [continuity, clientState] = await Promise.all([
    getSoloContinuity(workspaceId),
    getSoloClientState(workspaceId),
  ]);

  const client_state = clientState.current_dependency;
  const awaiting_actions: string[] = [];
  if (continuity.awaiting_others) awaiting_actions.push("Actions are awaiting others.");
  if (continuity.supervision_needed) awaiting_actions.push("Supervision is needed.");
  if (awaiting_actions.length === 0) awaiting_actions.push("No actions awaiting.");

  const what_progressed = clientState.latest_outcome;
  const what_would_stall = clientState.if_disabled;

  return {
    client_state,
    awaiting_actions,
    what_progressed,
    what_would_stall,
  };
}
