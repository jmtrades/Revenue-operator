/**
 * Strategy engine: given current state, emotional signals, domain pack, compliance pack —
 * select next state, template ID, disclosure blocks, objection branch. Never generate freeform content.
 */

import type { DomainPackConfig, StrategyStateDefinition, StrategyState } from "./schema";
import type { EmotionalSignals } from "@/lib/adaptive-conversation/emotional-signals";

export interface StrategyEngineInput {
  workspaceId: string;
  currentState: string;
  emotionalSignals: EmotionalSignals;
  domainPackConfig: DomainPackConfig | null;
  conversationHistoryLength: number;
  lastIntent: string;
}

export interface StrategyEngineOutput {
  suggested_state_transition: string | null;
  template_id_key: string | null;
  disclosure_blocks: string[];
  objection_branch: string | null;
  compliance_required: boolean;
}

const DEFAULT_STATE: StrategyState = "discovery";

/**
 * Select next state from domain pack rules only. No probabilistic choice.
 * If no transition rule matches, returns current state (no change).
 */
export function selectNextState(
  currentState: string,
  lastIntent: string,
  config: DomainPackConfig | null
): string | null {
  if (!config?.strategy_graph?.states) return null;
  const stateDef = config.strategy_graph.states[currentState] as StrategyStateDefinition | undefined;
  if (!stateDef?.transition_rules?.length) return null;
  const match = stateDef.transition_rules.find(
    (r) => (r.required_intent == null || r.required_intent === lastIntent) && (r.condition == null || r.condition === "default")
  );
  return match?.to_state ?? null;
}

/**
 * Get required disclosures for current state from domain pack.
 */
export function getRequiredDisclosures(state: string, config: DomainPackConfig | null): string[] {
  if (!config?.strategy_graph?.states) return [];
  const stateDef = config.strategy_graph.states[state] as StrategyStateDefinition | undefined;
  return stateDef?.required_disclosures ?? [];
}

/**
 * Resolve objection branch from library by phrase key. Returns branch key or null.
 */
export function resolveObjectionBranch(
  objectionPhraseKey: string,
  config: DomainPackConfig | null
): string | null {
  if (!config?.objection_tree_library) return null;
  for (const [, nodes] of Object.entries(config.objection_tree_library)) {
    const found = findObjectionNode(nodes, objectionPhraseKey);
    if (found) return found.soft_redirect_path ?? found.hard_redirect_path ?? null;
  }
  return null;
}

function findObjectionNode(nodes: { objection_phrase: string; soft_redirect_path?: string; hard_redirect_path?: string; children?: unknown[] }[], phrase: string): { soft_redirect_path?: string; hard_redirect_path?: string } | null {
  for (const node of nodes) {
    if (node.objection_phrase === phrase) return node;
    if (node.children?.length) {
      const inChild = findObjectionNode(node.children as typeof nodes, phrase);
      if (inChild) return inChild;
    }
  }
  return null;
}

/**
 * Full strategy engine: next state + template key + disclosures + objection branch.
 * Deterministic; uses only domain pack and emotional signals for escalation.
 */
export function runStrategyEngine(input: StrategyEngineInput): StrategyEngineOutput {
  const { currentState, emotionalSignals, domainPackConfig, lastIntent } = input;
  const suggested_state_transition = selectNextState(currentState, lastIntent, domainPackConfig);
  const disclosure_blocks = getRequiredDisclosures(
    suggested_state_transition ?? currentState,
    domainPackConfig
  );
  const compliance_required =
    (domainPackConfig?.regulatory_matrix?.required_disclaimers?.length ?? 0) > 0 ||
    (emotionalSignals.compliance_sensitivity ?? 0) > 0.5;

  return {
    suggested_state_transition: suggested_state_transition ?? currentState,
    template_id_key: null,
    disclosure_blocks,
    objection_branch: null,
    compliance_required,
  };
}
