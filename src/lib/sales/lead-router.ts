/**
 * Phase 23 — Rules-based + round-robin lead router.
 *
 * Given:
 *   - a lead (geography, industry, company size, source, custom fields)
 *   - a set of routing rules, evaluated in priority order
 *   - a pool of reps, each with capacity / territory / specialties
 *   - a round-robin counter (per rule) so repeated calls distribute evenly
 *
 * Produce a routing decision: the winning rep (or null if no rep matches)
 * plus an audit trail of which rule fired and why.
 *
 * Rules support:
 *   - geographic scoping (country, state, postal-code prefixes)
 *   - industry scoping (allowed industry ids)
 *   - company-size (employee / revenue tier)
 *   - source scoping (which lead-gen source)
 *   - custom predicate via a data-driven match object
 *
 * Rep selection modes per rule:
 *   - round_robin    — cycle through eligible reps
 *   - least_loaded   — lowest openLeadCount wins
 *   - weighted       — weighted probability (distribute by weights)
 *   - specific_rep   — always assign to a named rep
 *
 * Pure. Callers pass a counter snapshot and persist the updated counter.
 */

export interface LeadRoutingInput {
  leadId: string;
  country?: string | null;
  state?: string | null;
  postalCode?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  source?: string | null;
  customFields?: Record<string, string | number | boolean | null | undefined>;
}

export interface RepPoolEntry {
  repId: string;
  /** Territories this rep covers. */
  countries?: string[];
  states?: string[];
  postalPrefixes?: string[];
  /** Industries this rep specializes in. */
  industries?: string[];
  /** Is the rep currently available? Holidays, PTO etc. */
  isAvailable: boolean;
  /** Max concurrent open leads allowed. */
  capacity: number;
  /** Current open-lead count. */
  openLeadCount: number;
  /** Relative weight for weighted selection (default 1). */
  weight?: number;
}

export interface RoutingRule {
  id: string;
  /** Lower number = evaluated first. */
  priority: number;
  /** Human-readable label. */
  label?: string;
  /** Match predicate. All fields AND together. */
  match: {
    countries?: string[];
    states?: string[];
    postalPrefixes?: string[];
    industries?: string[];
    minEmployeeCount?: number;
    maxEmployeeCount?: number;
    minAnnualRevenue?: number;
    maxAnnualRevenue?: number;
    sources?: string[];
    customEquals?: Record<string, string | number | boolean>;
  };
  /** Which pool of rep IDs this rule considers. */
  repPool: string[];
  selectionMode: "round_robin" | "least_loaded" | "weighted" | "specific_rep";
  /** For specific_rep. */
  specificRepId?: string;
}

export interface RoutingInputBundle {
  lead: LeadRoutingInput;
  rules: readonly RoutingRule[];
  reps: readonly RepPoolEntry[];
  /** Round-robin cursor per rule id. */
  roundRobinState: Record<string, number>;
  /** Deterministic pick seed (for weighted). Caller can pass Math.random() result if unused. */
  pickSeed?: number;
}

export interface RoutingDecision {
  leadId: string;
  matchedRuleId: string | null;
  assignedRepId: string | null;
  selectionMode: RoutingRule["selectionMode"] | null;
  /** Updated RR state — caller should persist. */
  updatedRoundRobinState: Record<string, number>;
  /** Audit trail. */
  trace: string[];
}

function matchLead(rule: RoutingRule, lead: LeadRoutingInput): { ok: boolean; reason?: string } {
  const m = rule.match;
  if (m.countries && m.countries.length > 0) {
    if (!lead.country || !m.countries.includes(lead.country.toUpperCase())) {
      return { ok: false, reason: `country ${lead.country ?? "?"} not in allowed list` };
    }
  }
  if (m.states && m.states.length > 0) {
    if (!lead.state || !m.states.map((s) => s.toUpperCase()).includes(lead.state.toUpperCase())) {
      return { ok: false, reason: `state ${lead.state ?? "?"} not in allowed list` };
    }
  }
  if (m.postalPrefixes && m.postalPrefixes.length > 0) {
    const pc = (lead.postalCode ?? "").toUpperCase();
    if (!m.postalPrefixes.some((p) => pc.startsWith(p.toUpperCase()))) {
      return { ok: false, reason: `postal ${pc || "?"} does not match any prefix` };
    }
  }
  if (m.industries && m.industries.length > 0) {
    if (!lead.industry || !m.industries.includes(lead.industry)) {
      return { ok: false, reason: `industry ${lead.industry ?? "?"} not in allowed list` };
    }
  }
  if (m.minEmployeeCount !== undefined && (lead.employeeCount ?? 0) < m.minEmployeeCount) {
    return { ok: false, reason: `employees ${lead.employeeCount ?? 0} < ${m.minEmployeeCount}` };
  }
  if (m.maxEmployeeCount !== undefined && (lead.employeeCount ?? Number.POSITIVE_INFINITY) > m.maxEmployeeCount) {
    return { ok: false, reason: `employees > ${m.maxEmployeeCount}` };
  }
  if (m.minAnnualRevenue !== undefined && (lead.annualRevenue ?? 0) < m.minAnnualRevenue) {
    return { ok: false, reason: `revenue < ${m.minAnnualRevenue}` };
  }
  if (m.maxAnnualRevenue !== undefined && (lead.annualRevenue ?? Number.POSITIVE_INFINITY) > m.maxAnnualRevenue) {
    return { ok: false, reason: `revenue > ${m.maxAnnualRevenue}` };
  }
  if (m.sources && m.sources.length > 0) {
    if (!lead.source || !m.sources.includes(lead.source)) {
      return { ok: false, reason: `source ${lead.source ?? "?"} not in allowed list` };
    }
  }
  if (m.customEquals) {
    for (const [k, v] of Object.entries(m.customEquals)) {
      if ((lead.customFields ?? {})[k] !== v) {
        return { ok: false, reason: `custom[${k}] != ${String(v)}` };
      }
    }
  }
  return { ok: true };
}

function repEligible(rep: RepPoolEntry, lead: LeadRoutingInput): boolean {
  if (!rep.isAvailable) return false;
  if (rep.openLeadCount >= rep.capacity) return false;
  if (rep.countries && rep.countries.length > 0) {
    if (!lead.country || !rep.countries.map((c) => c.toUpperCase()).includes(lead.country.toUpperCase())) return false;
  }
  if (rep.states && rep.states.length > 0) {
    if (!lead.state || !rep.states.map((s) => s.toUpperCase()).includes(lead.state.toUpperCase())) return false;
  }
  if (rep.postalPrefixes && rep.postalPrefixes.length > 0) {
    const pc = (lead.postalCode ?? "").toUpperCase();
    if (!rep.postalPrefixes.some((p) => pc.startsWith(p.toUpperCase()))) return false;
  }
  if (rep.industries && rep.industries.length > 0) {
    if (!lead.industry || !rep.industries.includes(lead.industry)) return false;
  }
  return true;
}

function selectByMode(
  rule: RoutingRule,
  eligible: RepPoolEntry[],
  roundRobinState: Record<string, number>,
  pickSeed: number,
): { repId: string | null; newCursor: number | null } {
  if (eligible.length === 0) return { repId: null, newCursor: null };

  if (rule.selectionMode === "specific_rep") {
    const match = eligible.find((r) => r.repId === rule.specificRepId);
    return { repId: match ? match.repId : null, newCursor: null };
  }

  if (rule.selectionMode === "least_loaded") {
    let best = eligible[0];
    for (const r of eligible) {
      if (r.openLeadCount < best.openLeadCount) best = r;
    }
    return { repId: best.repId, newCursor: null };
  }

  if (rule.selectionMode === "weighted") {
    const totalWeight = eligible.reduce((s, r) => s + (r.weight ?? 1), 0);
    if (totalWeight <= 0) return { repId: eligible[0].repId, newCursor: null };
    const pick = Math.max(0, Math.min(0.9999, pickSeed)) * totalWeight;
    let acc = 0;
    for (const r of eligible) {
      acc += r.weight ?? 1;
      if (pick < acc) return { repId: r.repId, newCursor: null };
    }
    return { repId: eligible[eligible.length - 1].repId, newCursor: null };
  }

  // round_robin: use the rule's cursor, modulo eligible length.
  const cursor = roundRobinState[rule.id] ?? 0;
  const sorted = [...eligible].sort((a, b) => a.repId.localeCompare(b.repId));
  const pickIdx = cursor % sorted.length;
  return { repId: sorted[pickIdx].repId, newCursor: cursor + 1 };
}

export function routeLead(input: RoutingInputBundle): RoutingDecision {
  const trace: string[] = [];
  const updatedRR: Record<string, number> = { ...input.roundRobinState };
  const sortedRules = [...input.rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const m = matchLead(rule, input.lead);
    if (!m.ok) {
      trace.push(`rule[${rule.id}] skipped — ${m.reason}`);
      continue;
    }
    trace.push(`rule[${rule.id}] matched`);
    const repsInPool = input.reps.filter((r) => rule.repPool.includes(r.repId));
    const eligible = repsInPool.filter((r) => repEligible(r, input.lead));
    if (eligible.length === 0) {
      trace.push(`rule[${rule.id}] had no eligible rep — trying next rule`);
      continue;
    }
    const { repId, newCursor } = selectByMode(
      rule,
      eligible,
      updatedRR,
      input.pickSeed ?? 0,
    );
    if (!repId) {
      trace.push(`rule[${rule.id}] selector returned no rep — trying next rule`);
      continue;
    }
    if (newCursor !== null) updatedRR[rule.id] = newCursor;
    trace.push(`rule[${rule.id}] assigned to ${repId} via ${rule.selectionMode}`);
    return {
      leadId: input.lead.leadId,
      matchedRuleId: rule.id,
      assignedRepId: repId,
      selectionMode: rule.selectionMode,
      updatedRoundRobinState: updatedRR,
      trace,
    };
  }

  trace.push("no rule produced an assignment");
  return {
    leadId: input.lead.leadId,
    matchedRuleId: null,
    assignedRepId: null,
    selectionMode: null,
    updatedRoundRobinState: updatedRR,
    trace,
  };
}
