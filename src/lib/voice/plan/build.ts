/**
 * Deterministic Voice Execution Plan builder.
 * Script chaining, thresholds, disclaimer merge. No randomness. No freeform.
 */

import { getCallScriptBlocksForDomain } from "@/lib/voice/call-script-blocks";
import { resolveCompliancePack } from "@/lib/governance/compliance-pack";
import { resolveMessagePolicy } from "@/lib/governance/message-policy";

const REQUIRED_BLOCK_TYPES = ["opening_block", "disclosure_block", "close_block"] as const;
const ESCALATION_MAP: Record<string, number | null> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  immediate: 4,
};

function presetTypeToBlockType(type: string): string {
  const map: Record<string, string> = {
    opening: "opening_block",
    disclosure: "disclosure_block",
    consent: "consent_block",
    close: "close_block",
    objection_branch: "objection_block",
    compliance_pause: "compliance_block",
    escalation: "close_block",
  };
  return map[type] ?? type;
}

function blockTypeOrder(bt: string): number {
  const order: Record<string, number> = {
    opening_block: 0,
    context_block: 1,
    authority_block: 2,
    disclosure_block: 3,
    qualification_block: 4,
    objection_block: 5,
    alignment_block: 6,
    compliance_block: 7,
    consent_block: 8,
    commitment_block: 9,
    confirmation_block: 10,
    close_block: 11,
    opening: 0,
    disclosure: 3,
    consent: 8,
    close: 11,
    objection_branch: 5,
    compliance_pause: 7,
    escalation: 11,
  };
  return order[bt] ?? 99;
}

export const OBJECTION_CHAIN_LIMIT = 3;

export type BuildVoiceExecutionPlanArgs = {
  workspaceId: string;
  threadId?: string | null;
  workUnitId?: string | null;
  conversationId?: string | null;
  domainType: string;
  jurisdiction: string;
  stageState: string;
  objectionKey?: string | null;
  objectionSequenceCount?: number | null;
  emotionalSignals?: Record<string, unknown> | null;
  nowIso?: string;
};

export type VoiceExecutionPlanSuccess = {
  ok: true;
  plan: {
    domain_type: string;
    jurisdiction: string;
    stage_state: string;
    consent_required: boolean;
    max_duration_seconds: number | null;
    escalation_threshold: number | null;
    disclaimer_lines: string[];
    script_blocks: Array<{
      block_type: string;
      lines: string[];
      required_disclosures: string[];
      forbidden_phrases: string[];
      consent_required: boolean;
      escalation_threshold: number | null;
      max_duration_seconds: number | null;
    }>;
  };
};

export type VoiceExecutionPlanFailure = {
  ok: false;
  reason: "missing_blocks" | "invalid_state" | "invalid_input" | "internal_error";
};

export type BuildVoiceExecutionPlanResult = VoiceExecutionPlanSuccess | VoiceExecutionPlanFailure;

export async function buildVoiceExecutionPlan(args: BuildVoiceExecutionPlanArgs): Promise<BuildVoiceExecutionPlanResult> {
  const {
    workspaceId,
    domainType,
    jurisdiction,
    stageState,
    objectionKey,
    objectionSequenceCount,
    nowIso: _nowIso,
  } = args;

  if (!workspaceId?.trim() || !domainType?.trim() || !jurisdiction?.trim() || !stageState?.trim()) {
    return { ok: false, reason: "invalid_input" };
  }

  if (objectionSequenceCount != null && objectionSequenceCount > OBJECTION_CHAIN_LIMIT) {
    return { ok: false, reason: "invalid_state" };
  }

  const allowedStates = [
    "discovery", "pain_identification", "qualification", "authority_check", "timeline_check",
    "financial_alignment", "objection_handling", "offer_positioning", "compliance_disclosure",
    "commitment_request", "follow_up_lock", "escalation", "disqualification", "follow_up_scheduled", "confirmation_pending",
  ];
  if (!allowedStates.includes(stageState)) {
    return { ok: false, reason: "invalid_state" };
  }

  try {
    const presetBlocks = getCallScriptBlocksForDomain(domainType);
    if (!presetBlocks.length) {
      return { ok: false, reason: "missing_blocks" };
    }

    const compliance = await resolveCompliancePack(workspaceId, domainType);
    const messagePolicy = await resolveMessagePolicy(
      workspaceId,
      domainType,
      jurisdiction,
      "sms",
      "follow_up"
    );
    const policyDisclaimers = messagePolicy?.required_disclaimers ?? [];
    const policyForbidden = messagePolicy?.forbidden_phrases ?? [];
    const complianceDisclaimers = compliance.disclaimers ?? [];
    const complianceForbidden = compliance.forbidden_claims ?? [];
    const allForbidden = [...new Set([...policyForbidden, ...complianceForbidden])];

    const disclaimerLines = [
      ...complianceDisclaimers,
      ...(Array.isArray(policyDisclaimers) ? policyDisclaimers : []),
    ].filter(Boolean) as string[];

    const scriptBlocks: VoiceExecutionPlanSuccess["plan"]["script_blocks"] = [];
    const seenBlockTypes = new Set<string>();

    const sorted = [...presetBlocks].sort((a, b) => blockTypeOrder(a.type) - blockTypeOrder(b.type));

    for (const block of sorted) {
      const blockType = presetTypeToBlockType(block.type);
      const lines = block.text ? [block.text.trim()].filter(Boolean) : [];
      for (const line of lines) {
        const lower = line.toLowerCase();
        for (const phrase of allForbidden) {
          if (phrase && lower.includes(phrase.toLowerCase())) {
            return { ok: false, reason: "internal_error" };
          }
        }
      }
      const requiredDisclosures: string[] = block.required_ack ? [block.text.trim()].filter(Boolean) : [];
      const escalationVal =
        block.escalation_threshold != null
          ? ESCALATION_MAP[block.escalation_threshold] ?? null
          : null;
      scriptBlocks.push({
        block_type: blockType,
        lines,
        required_disclosures: requiredDisclosures,
        forbidden_phrases: [],
        consent_required: Boolean(block.consent_required ?? block.required_ack),
        escalation_threshold: escalationVal,
        max_duration_seconds: null,
      });
      seenBlockTypes.add(blockType);
    }

    if (objectionKey) {
      const hasObjection = scriptBlocks.some((b) => b.block_type === "objection_block");
      if (!hasObjection) {
        scriptBlocks.push({
          block_type: "objection_block",
          lines: ["We can address that. What matters most right now?"],
          required_disclosures: [],
          forbidden_phrases: [],
          consent_required: false,
          escalation_threshold: 1,
          max_duration_seconds: null,
        });
      }
    }

    const needsCommitment =
      stageState === "commitment_request" || stageState === "follow_up_lock" || stageState === "confirmation_pending";
    if (needsCommitment) {
      const hasCommitment = scriptBlocks.some(
        (b) => b.block_type === "commitment_block" || b.block_type === "confirmation_block"
      );
      if (!hasCommitment) {
        scriptBlocks.push({
          block_type: "confirmation_block",
          lines: ["Can we confirm the next step?"],
          required_disclosures: [],
          forbidden_phrases: [],
          consent_required: false,
          escalation_threshold: null,
          max_duration_seconds: null,
        });
      }
    }

    for (const required of REQUIRED_BLOCK_TYPES) {
      if (!seenBlockTypes.has(required)) {
        const mapped = scriptBlocks.some((b) => presetTypeToBlockType(b.block_type) === required || b.block_type === required);
        if (!mapped) {
          return { ok: false, reason: "missing_blocks" };
        }
      }
    }

    const hasOpening = scriptBlocks.some((b) => b.block_type === "opening_block" || b.block_type === "opening");
    const hasDisclosure = scriptBlocks.some((b) => b.block_type === "disclosure_block" || b.block_type === "disclosure");
    const hasClose = scriptBlocks.some((b) => b.block_type === "close_block" || b.block_type === "close");
    if (!hasOpening || !hasDisclosure || !hasClose) {
      return { ok: false, reason: "missing_blocks" };
    }

    const consentRequired = compliance.consent_required ?? scriptBlocks.some((b) => b.consent_required);
    const maxDuration: number | null = null;
    const escalationThreshold: number | null = scriptBlocks.some((b) => b.escalation_threshold != null)
      ? Math.max(...scriptBlocks.map((b) => b.escalation_threshold ?? 0))
      : null;

    return {
      ok: true,
      plan: {
        domain_type: domainType,
        jurisdiction,
        stage_state: stageState,
        consent_required: consentRequired,
        max_duration_seconds: maxDuration,
        escalation_threshold: escalationThreshold,
        disclaimer_lines: disclaimerLines,
        script_blocks: scriptBlocks,
      },
    };
  } catch {
    return { ok: false, reason: "internal_error" };
  }
}
