/**
 * Intelligent Call Routing Engine
 *
 * Routes inbound calls to the optimal AI agent or human based on:
 * - Skills matching (which agent handles which industry/topic)
 * - Time-of-day rules (after-hours routing)
 * - Load balancing (spread calls across available agents)
 * - Caller history (return callers to their previous agent)
 * - IVR menu selection
 * - Geographic routing (caller area code → local agent)
 * - Priority routing (VIP leads, high-value accounts)
 * - Overflow routing (all agents busy → queue/voicemail)
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

/* ── Types ───────────────────────────────────────────────────────── */

export type RouteAction = "ai_agent" | "human_agent" | "voicemail" | "queue" | "ivr" | "forward" | "hangup";

export interface RoutingDecision {
  action: RouteAction;
  agent_id?: string;
  agent_name?: string;
  forward_to?: string;
  queue_position?: number;
  reason: string;
  priority: number;
  estimated_wait_seconds?: number;
  twiml?: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number; // Higher = evaluated first
  conditions: RoutingCondition[];
  action: RouteAction;
  destination?: string; // Agent ID, phone number, or queue name
  enabled: boolean;
}

export interface RoutingCondition {
  field: "caller_phone" | "caller_area_code" | "time_of_day" | "day_of_week" | "caller_history" | "ivr_selection" | "lead_score" | "lead_tag" | "workspace_setting";
  operator: "equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in" | "between" | "matches";
  value: string | number | string[];
}

export interface AgentAvailability {
  agent_id: string;
  agent_name: string;
  skills: string[];
  active_calls: number;
  max_concurrent: number;
  available: boolean;
  last_call_ended_at?: string;
}

/* ── Core Router ─────────────────────────────────────────────────── */

/**
 * Route an inbound call to the optimal destination.
 */
export async function routeInboundCall(
  workspaceId: string,
  callerPhone: string,
  calledNumber: string,
  metadata?: Record<string, unknown>,
): Promise<RoutingDecision> {
  try {
    const db = getDb();

    // 1. Check if this is a returning caller
    const callerHistory = await getCallerHistory(workspaceId, callerPhone);

    // 2. Check if caller is a VIP/high-score lead
    const leadPriority = await getLeadPriority(workspaceId, callerPhone);

    // 3. Load workspace routing rules
    const rules = await getRoutingRules(workspaceId);

    // 4. Evaluate rules in priority order
    const context: RoutingContext = {
      caller_phone: callerPhone,
      caller_area_code: callerPhone.replace(/[^\d]/g, "").slice(1, 4),
      called_number: calledNumber,
      time_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      caller_history: callerHistory,
      lead_score: leadPriority.score,
      lead_tags: leadPriority.tags,
      workspace_id: workspaceId,
    };

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (evaluateConditions(rule.conditions, context)) {
        log("info", "call_routing.rule_matched", {
          workspaceId,
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action,
        });

        return {
          action: rule.action,
          agent_id: rule.destination,
          reason: `Matched rule: ${rule.name}`,
          priority: leadPriority.score > 80 ? 1 : leadPriority.score > 50 ? 2 : 3,
        };
      }
    }

    // 5. Default: route to AI agent
    // Check if we're within business hours
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 9 && hour < 20;

    if (!isBusinessHours) {
      return {
        action: "ai_agent",
        reason: "After-hours: AI agent handling",
        priority: 3,
        agent_name: "Sarah (AI)",
      };
    }

    // During business hours, try to find the best available agent
    const availableAgents = await getAvailableAgents(workspaceId);

    if (availableAgents.length === 0) {
      return {
        action: "ai_agent",
        reason: "No human agents available, routing to AI",
        priority: 2,
        agent_name: "Sarah (AI)",
      };
    }

    // Skills-based routing: match caller industry if known
    if (callerHistory.industry) {
      const specializedAgent = availableAgents.find(a =>
        a.skills.includes(callerHistory.industry!)
      );
      if (specializedAgent) {
        return {
          action: "ai_agent",
          agent_id: specializedAgent.agent_id,
          agent_name: specializedAgent.agent_name,
          reason: `Industry-matched agent for ${callerHistory.industry}`,
          priority: leadPriority.score > 70 ? 1 : 2,
        };
      }
    }

    // Returning caller: route to their previous agent
    if (callerHistory.previous_agent_id) {
      const prevAgent = availableAgents.find(a => a.agent_id === callerHistory.previous_agent_id);
      if (prevAgent?.available) {
        return {
          action: "ai_agent",
          agent_id: prevAgent.agent_id,
          agent_name: prevAgent.agent_name,
          reason: "Returning caller routed to previous agent",
          priority: 1,
        };
      }
    }

    // Load-balanced: route to agent with fewest active calls
    const leastBusy = availableAgents
      .filter(a => a.available)
      .sort((a, b) => a.active_calls - b.active_calls)[0];

    if (leastBusy) {
      return {
        action: "ai_agent",
        agent_id: leastBusy.agent_id,
        agent_name: leastBusy.agent_name,
        reason: "Load-balanced routing",
        priority: 2,
      };
    }

    // Fallback: AI agent
    return {
      action: "ai_agent",
      reason: "Default AI agent routing",
      priority: 3,
      agent_name: "Sarah (AI)",
    };
  } catch (err) {
    log("error", "call_routing.failed", {
      error: err instanceof Error ? err.message : String(err),
      callerPhone,
    });

    // Safe fallback: always route to AI
    return {
      action: "ai_agent",
      reason: "Routing error fallback to AI",
      priority: 3,
      agent_name: "Sarah (AI)",
    };
  }
}

/* ── Rule Evaluation ─────────────────────────────────────────────── */

interface RoutingContext {
  caller_phone: string;
  caller_area_code: string;
  called_number: string;
  time_of_day: number;
  day_of_week: number;
  caller_history: CallerHistory;
  lead_score: number;
  lead_tags: string[];
  workspace_id: string;
}

function evaluateConditions(conditions: RoutingCondition[], ctx: RoutingContext): boolean {
  return conditions.every(c => evaluateCondition(c, ctx));
}

function evaluateCondition(condition: RoutingCondition, ctx: RoutingContext): boolean {
  let fieldValue: unknown;

  switch (condition.field) {
    case "caller_phone": fieldValue = ctx.caller_phone; break;
    case "caller_area_code": fieldValue = ctx.caller_area_code; break;
    case "time_of_day": fieldValue = ctx.time_of_day; break;
    case "day_of_week": fieldValue = ctx.day_of_week; break;
    case "lead_score": fieldValue = ctx.lead_score; break;
    case "lead_tag": fieldValue = ctx.lead_tags; break;
    case "caller_history": fieldValue = ctx.caller_history.call_count; break;
    default: return false;
  }

  switch (condition.operator) {
    case "equals": return fieldValue === condition.value;
    case "contains": return String(fieldValue).includes(String(condition.value));
    case "greater_than": return Number(fieldValue) > Number(condition.value);
    case "less_than": return Number(fieldValue) < Number(condition.value);
    case "in": return Array.isArray(condition.value) && condition.value.includes(String(fieldValue));
    case "not_in": return Array.isArray(condition.value) && !condition.value.includes(String(fieldValue));
    case "matches": return new RegExp(String(condition.value), "i").test(String(fieldValue));
    default: return false;
  }
}

/* ── Data Lookups ────────────────────────────────────────────────── */

interface CallerHistory {
  call_count: number;
  last_call_at?: string;
  previous_agent_id?: string;
  industry?: string;
  is_returning: boolean;
  lead_id?: string;
}

async function getCallerHistory(workspaceId: string, phone: string): Promise<CallerHistory> {
  const db = getDb();
  const normalized = phone.replace(/[^\d+]/g, "");

  try {
    const { data: lead } = await db
      .from("leads")
      .select("id, metadata, industry")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized)
      .maybeSingle();

    if (!lead) {
      return { call_count: 0, is_returning: false };
    }

    const leadData = lead as { id: string; metadata?: Record<string, unknown>; industry?: string };

    const { count } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadData.id);

    return {
      call_count: count ?? 0,
      is_returning: (count ?? 0) > 0,
      lead_id: leadData.id,
      industry: leadData.industry ?? undefined,
      previous_agent_id: (leadData.metadata?.last_agent_id as string) ?? undefined,
      last_call_at: (leadData.metadata?.last_call_at as string) ?? undefined,
    };
  } catch {
    return { call_count: 0, is_returning: false };
  }
}

async function getLeadPriority(workspaceId: string, phone: string): Promise<{ score: number; tags: string[] }> {
  const db = getDb();
  const normalized = phone.replace(/[^\d+]/g, "");

  try {
    const { data: lead } = await db
      .from("leads")
      .select("metadata, tags")
      .eq("workspace_id", workspaceId)
      .eq("phone", normalized)
      .maybeSingle();

    if (!lead) return { score: 50, tags: [] };

    const leadData = lead as { metadata?: Record<string, unknown>; tags?: string[] };
    const meta = leadData.metadata ?? {};
    const score = (meta.lead_score as number) ?? (meta.latest_score as number) ?? 50;

    return { score, tags: leadData.tags ?? [] };
  } catch {
    return { score: 50, tags: [] };
  }
}

async function getRoutingRules(workspaceId: string): Promise<RoutingRule[]> {
  const db = getDb();

  try {
    const { data: ws } = await db
      .from("workspaces")
      .select("settings")
      .eq("id", workspaceId)
      .maybeSingle();

    const settings = ((ws as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>;
    const rules = (settings.routing_rules ?? []) as RoutingRule[];

    return rules.sort((a, b) => b.priority - a.priority);
  } catch {
    return [];
  }
}

async function getAvailableAgents(workspaceId: string): Promise<AgentAvailability[]> {
  const db = getDb();

  try {
    const { data: agents } = await db
      .from("voice_agents")
      .select("id, name, metadata")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    return ((agents ?? []) as Array<{ id: string; name: string; metadata?: Record<string, unknown> }>).map(a => ({
      agent_id: a.id,
      agent_name: a.name,
      skills: (a.metadata?.skills as string[]) ?? [],
      active_calls: (a.metadata?.active_calls as number) ?? 0,
      max_concurrent: (a.metadata?.max_concurrent as number) ?? 5,
      available: ((a.metadata?.active_calls as number) ?? 0) < ((a.metadata?.max_concurrent as number) ?? 5),
    }));
  } catch {
    return [];
  }
}

/**
 * Generate TwiML for a routing decision.
 */
export function buildRoutingTwiml(decision: RoutingDecision, appUrl: string, workspaceId: string): string {
  switch (decision.action) {
    case "ai_agent":
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${appUrl}/api/webhooks/twilio/voice/demo-turn?workspace_id=${workspaceId}" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna-Neural">Hi there! This is Sarah from Recall Touch. How can I help you today?</Say>
  </Gather>
</Response>`;

    case "forward":
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Let me connect you with our team. One moment please.</Say>
  <Dial timeout="30">
    <Number>${decision.forward_to}</Number>
  </Dial>
  <Say voice="Polly.Joanna-Neural">I'm sorry, no one is available right now. I'll have someone call you back shortly.</Say>
</Response>`;

    case "voicemail":
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Thank you for calling. Please leave a message after the tone and we'll get back to you as soon as possible.</Say>
  <Record maxLength="120" action="${appUrl}/api/webhooks/twilio/voice?workspace_id=${workspaceId}&event=voicemail" />
</Response>`;

    case "queue":
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">All of our agents are currently busy. Your call is important to us. Please hold and we'll be with you shortly.</Say>
  <Enqueue waitUrl="${appUrl}/api/webhooks/twilio/voice/hold-music">${workspaceId}</Enqueue>
</Response>`;

    default:
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${appUrl}/api/webhooks/twilio/voice/demo-turn?workspace_id=${workspaceId}" method="POST" speechTimeout="2" language="en-US">
    <Say voice="Polly.Joanna-Neural">Hi there! How can I help you today?</Say>
  </Gather>
</Response>`;
  }
}
