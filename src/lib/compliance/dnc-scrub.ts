/**
 * Phase 24 — Federal + state DNC (Do Not Call) scrub orchestrator.
 *
 * Given a batch of phone numbers to screen, produce a DncScrubResult per
 * number with the layered decision: federal national DNC (FTC), federal
 * wireless DNC (FCC), state DNC (CA, FL, LA, MA, MO, TN, WY, etc.),
 * workspace internal suppression, litigator list, and TCPA "reassigned
 * number database" check.
 *
 * Pure module. Callers pass:
 *   - the number batch
 *   - the lookup tables (loaded from DB / vendor feed)
 *   - the workspace config (which states to scrub, whether EBR exemption
 *     applies, established-business-relationship override list, etc.)
 *
 * Federal framework:
 *   - FTC National DNC Registry — 47 CFR 310.4(b)(1)(iii)(B)
 *   - FCC TCPA — 47 USC §227, 47 CFR 64.1200
 *   - Reassigned Numbers Database (RND) — FCC 18-177
 *
 * Federal safe-harbors:
 *   - Established business relationship (EBR): 18 months from last payment
 *     for transactional relationships, 3 months for inquiries
 *   - Written signed consent overrides federal DNC
 *   - Informational (non-telemarketing) calls are exempt
 */

export type DncListSource =
  | "ftc_national"
  | "fcc_wireless"
  | "state"
  | "workspace"
  | "litigator"
  | "reassigned";

export interface DncLookupTables {
  /** FTC national registered numbers. */
  ftcNational: ReadonlySet<string>;
  /** Known wireless numbers (federal heightened protections). */
  fccWireless: ReadonlySet<string>;
  /** Per-state DNC registries. Map of state code → set of E.164. */
  stateDnc: ReadonlyMap<string, ReadonlySet<string>>;
  /** Workspace-level suppression (opted out previously). */
  workspaceSuppression: ReadonlySet<string>;
  /** Known TCPA litigator numbers to never call. */
  litigators: ReadonlySet<string>;
  /** Reassigned-Number Database: number → first eligible call date (ISO). */
  reassignedAfter: ReadonlyMap<string, string>;
}

export interface DncScrubConfig {
  /** Workspace's outbound caller state. Affects which state DNCs apply. */
  workspaceState?: string;
  /** Which state DNC lists to enforce regardless of caller state. */
  enforceStates: readonly string[];
  /** EBR override numbers (established business relationship < 18 months). */
  ebrNumbers: ReadonlySet<string>;
  /** Written consent overrides — still call even if on DNC. */
  writtenConsent: ReadonlySet<string>;
  /** Is the outbound purpose "telemarketing"? Informational calls are exempt. */
  isTelemarketing: boolean;
  /** Call plan window — used vs. reassignedAfter. */
  nowUtc?: string;
}

export interface DncScrubResult {
  e164: string;
  allowed: boolean;
  sources: DncListSource[];
  /** If overridden, names of overriding mechanisms. */
  overrides: ("ebr" | "written_consent" | "non_telemarketing")[];
  reason: string;
}

function normalizeE164(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (digits.length < 8 || digits.length > 15) return null;
    return cleaned;
  }
  // US default
  if (cleaned.length === 11 && cleaned.startsWith("1")) return `+${cleaned}`;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length >= 8 && cleaned.length <= 15) return `+${cleaned}`;
  return null;
}

function listHit(
  e164: string,
  tables: DncLookupTables,
  cfg: DncScrubConfig,
  nowMs: number,
): { onFederal: boolean; onState: string | null; onWireless: boolean; onWorkspace: boolean; onLitigator: boolean; reassignedBlock: boolean; } {
  const onFederal = tables.ftcNational.has(e164);
  const onWireless = tables.fccWireless.has(e164);
  const onWorkspace = tables.workspaceSuppression.has(e164);
  const onLitigator = tables.litigators.has(e164);

  let onState: string | null = null;
  const statesToCheck = new Set<string>();
  if (cfg.workspaceState) statesToCheck.add(cfg.workspaceState.toUpperCase());
  for (const s of cfg.enforceStates) statesToCheck.add(s.toUpperCase());
  for (const state of statesToCheck) {
    const list = tables.stateDnc.get(state);
    if (list && list.has(e164)) {
      onState = state;
      break;
    }
  }

  // Reassigned Numbers Database: if our RND snapshot says this number was
  // reassigned AFTER nowMs, we must not call (previous consent is invalid).
  const rnd = tables.reassignedAfter.get(e164);
  let reassignedBlock = false;
  if (rnd) {
    const t = Date.parse(rnd);
    if (!Number.isNaN(t) && t >= nowMs) {
      reassignedBlock = true;
    }
  }

  return { onFederal, onState, onWireless, onWorkspace, onLitigator, reassignedBlock };
}

export function scrubNumber(
  rawE164: string,
  tables: DncLookupTables,
  cfg: DncScrubConfig,
): DncScrubResult {
  const e164 = normalizeE164(rawE164);
  if (!e164) {
    return {
      e164: rawE164,
      allowed: false,
      sources: [],
      overrides: [],
      reason: "invalid_e164",
    };
  }

  const now = cfg.nowUtc ? Date.parse(cfg.nowUtc) : Date.now();
  const hit = listHit(e164, tables, cfg, now);

  // Litigators are always blocked — no overrides.
  if (hit.onLitigator) {
    return {
      e164,
      allowed: false,
      sources: ["litigator"],
      overrides: [],
      reason: "on_litigator_list",
    };
  }

  // Reassigned number — block regardless of prior consent.
  if (hit.reassignedBlock) {
    return {
      e164,
      allowed: false,
      sources: ["reassigned"],
      overrides: [],
      reason: "number_reassigned_after_consent",
    };
  }

  // Internal workspace suppression — no overrides (user opted out from this workspace).
  if (hit.onWorkspace) {
    return {
      e164,
      allowed: false,
      sources: ["workspace"],
      overrides: [],
      reason: "internal_suppression",
    };
  }

  // No federal/state hit → fully clear.
  const sources: DncListSource[] = [];
  if (hit.onFederal) sources.push("ftc_national");
  if (hit.onWireless) sources.push("fcc_wireless");
  if (hit.onState) sources.push("state");

  if (sources.length === 0) {
    return {
      e164,
      allowed: true,
      sources: [],
      overrides: [],
      reason: "clean",
    };
  }

  // DNC hit — evaluate overrides.
  const overrides: DncScrubResult["overrides"] = [];
  if (!cfg.isTelemarketing) overrides.push("non_telemarketing");
  if (cfg.writtenConsent.has(e164)) overrides.push("written_consent");
  if (cfg.ebrNumbers.has(e164)) overrides.push("ebr");

  // Written consent / non-telemarketing / EBR can override federal + state.
  // Wireless-specific: need express written consent for auto-dialer / prerecorded.
  // (Our policy: if wireless + telemarketing + no written_consent → block regardless of EBR.)
  if (hit.onWireless && cfg.isTelemarketing && !overrides.includes("written_consent")) {
    return {
      e164,
      allowed: false,
      sources,
      overrides,
      reason: "fcc_wireless_requires_written_consent_for_telemarketing",
    };
  }

  if (overrides.length > 0) {
    return {
      e164,
      allowed: true,
      sources,
      overrides,
      reason: `dnc_hit_overridden_by_${overrides.join("+")}`,
    };
  }

  return {
    e164,
    allowed: false,
    sources,
    overrides: [],
    reason: `dnc_block: ${sources.join(",")}`,
  };
}

/**
 * Scrub an entire batch — parallel over the list, independent of each other.
 */
export function scrubBatch(
  numbers: readonly string[],
  tables: DncLookupTables,
  cfg: DncScrubConfig,
): DncScrubResult[] {
  return numbers.map((n) => scrubNumber(n, tables, cfg));
}

/**
 * Summary breakdown for an audit / dashboard widget.
 */
export function summarizeScrub(results: readonly DncScrubResult[]): {
  totalCount: number;
  allowedCount: number;
  blockedCount: number;
  bySource: Record<DncListSource | "overridden", number>;
} {
  const bySource: Record<string, number> = {};
  let allowed = 0;
  let blocked = 0;
  for (const r of results) {
    if (r.allowed) {
      allowed++;
      if (r.overrides.length > 0) {
        bySource.overridden = (bySource.overridden ?? 0) + 1;
      }
    } else {
      blocked++;
      for (const s of r.sources) bySource[s] = (bySource[s] ?? 0) + 1;
    }
  }
  return {
    totalCount: results.length,
    allowedCount: allowed,
    blockedCount: blocked,
    bySource: bySource as Record<DncListSource | "overridden", number>,
  };
}
