/**
 * Context carryover system for voice calls.
 *
 * Generates conversation summaries after each call and stores them per-lead,
 * so the AI has context when the same person calls back.
 *
 * Features:
 * - Post-call summarization via Claude Haiku (cheap, fast)
 * - Per-lead conversation memory stored in lead metadata
 * - Key fact extraction (name, business type, objections, interests)
 * - Rolling summary window (keeps last 5 call summaries)
 * - Warm-back greeting generation for returning callers
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

export interface CallSummary {
  date: string;
  duration_seconds: number;
  summary: string;
  key_facts: KeyFact[];
  outcome: CallOutcome;
  sentiment: "positive" | "neutral" | "negative";
  follow_up_needed: boolean;
  follow_up_reason?: string;
  buying_stage?: "awareness" | "consideration" | "decision" | "purchased";
  objections_raised?: string[];
  next_best_action?: "follow_up_call" | "send_pricing" | "send_case_study" | "schedule_team_demo" | "no_action" | "nurture_email";
  urgency?: "high" | "medium" | "low";
}

export interface KeyFact {
  category: "name" | "business_type" | "pain_point" | "interest" | "objection" | "budget" | "timeline" | "competitor" | "decision_maker" | "other";
  value: string;
  confidence: number;
}

export type CallOutcome =
  | "demo_completed"
  | "signup_initiated"
  | "callback_requested"
  | "objection_unresolved"
  | "information_gathered"
  | "hung_up_early"
  | "voicemail"
  | "transferred";

const SUMMARIZE_PROMPT = `You are a sales call analyst at a SaaS company. Given the conversation transcript below, extract commercially actionable intelligence. Return ONLY valid JSON:

{
  "summary": "2-3 sentence summary focusing on: what the caller needs, where they are in the buying journey, and what should happen next",
  "key_facts": [
    {"category": "name|business_type|pain_point|interest|objection|budget|timeline|competitor|decision_maker|team_size|current_solution|other", "value": "exact fact from conversation", "confidence": 0.0-1.0}
  ],
  "outcome": "demo_completed|signup_initiated|callback_requested|objection_unresolved|information_gathered|hung_up_early|voicemail|transferred",
  "sentiment": "positive|neutral|negative",
  "buying_stage": "awareness|consideration|decision|purchased",
  "objections_raised": ["list of specific objections caller raised, empty if none"],
  "next_best_action": "follow_up_call|send_pricing|send_case_study|schedule_team_demo|no_action|nurture_email",
  "follow_up_needed": true/false,
  "follow_up_reason": "specific reason and what to say when following up",
  "urgency": "high|medium|low"
}

Rules:
- Extract ONLY facts explicitly stated. Never infer or assume.
- "objections_raised" must quote the caller's actual words, not your interpretation.
- "next_best_action" must be the single most effective next step based on where they are in the journey.
- "urgency" is high if they mentioned a deadline, active pain, or competitor evaluation.
- Return ONLY valid JSON, no markdown or explanation.`;

/**
 * Summarize a completed call and store the context for future calls.
 * Called after a call ends (from webhook or session cleanup).
 */
export async function summarizeAndStoreCall(
  callSessionId: string,
  workspaceId: string,
): Promise<CallSummary | null> {
  const db = getDb();

  try {
    // Load the call session with conversation history
    const { data: session } = await db
      .from("call_sessions")
      .select("lead_id, metadata, call_started_at, call_ended_at")
      .eq("id", callSessionId)
      .maybeSingle();

    if (!session) {
      log("warn", "context_carryover.session_not_found", { callSessionId });
      return null;
    }

    const sess = session as {
      lead_id?: string | null;
      metadata?: Record<string, unknown> | null;
      call_started_at?: string | null;
      call_ended_at?: string | null;
    };

    const meta = sess.metadata ?? {};
    const history = (meta.demo_history ?? meta.transcript ?? []) as Array<{ role: string; content: string }>;

    if (!history.length || history.length < 2) {
      log("info", "context_carryover.too_short", { callSessionId, turns: history.length });
      return null;
    }

    // Calculate duration
    const started = sess.call_started_at ? new Date(sess.call_started_at).getTime() : 0;
    const ended = sess.call_ended_at ? new Date(sess.call_ended_at).getTime() : Date.now();
    const durationSeconds = Math.round((ended - started) / 1000);

    // Build transcript text
    const transcript = history
      .map((m) => `${m.role === "assistant" ? "Sarah" : "Caller"}: ${m.content}`)
      .join("\n");

    // Summarize via Claude Haiku (cheapest, fastest)
    let summary: CallSummary;
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [
            { role: "user", content: `${SUMMARIZE_PROMPT}\n\n---\n\nTRANSCRIPT:\n${transcript}` },
          ],
        }),
      });

      if (!resp.ok) {
        throw new Error(`Claude API error: ${resp.status}`);
      }

      const data = await resp.json() as { content: Array<{ text: string }> };
      const text = data.content?.[0]?.text ?? "{}";

      // Parse JSON response (handle markdown wrapping, trailing commas, common LLM quirks)
      let jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      // Fix common JSON issues from LLM output
      jsonStr = jsonStr
        .replace(/,\s*}/g, "}")      // trailing commas in objects
        .replace(/,\s*]/g, "]")      // trailing commas in arrays
        .replace(/'/g, '"')           // single quotes → double quotes (risky but LLMs do this)
        .replace(/\n/g, " ");         // newlines within strings

      let parsed: Omit<CallSummary, "date" | "duration_seconds">;
      try {
        parsed = JSON.parse(jsonStr) as Omit<CallSummary, "date" | "duration_seconds">;
      } catch (parseErr) {
        // Try to extract key fields with regex as last resort
        log("warn", "context_carryover.json_parse_failed", {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
          raw: jsonStr.slice(0, 200),
        });
        const summaryMatch = jsonStr.match(/"summary"\s*:\s*"([^"]+)"/);
        const outcomeMatch = jsonStr.match(/"outcome"\s*:\s*"([^"]+)"/);
        const sentimentMatch = jsonStr.match(/"sentiment"\s*:\s*"([^"]+)"/);
        parsed = {
          summary: summaryMatch?.[1] || "Call completed",
          key_facts: [],
          outcome: (outcomeMatch?.[1] as CallSummary["outcome"]) || "information_gathered",
          sentiment: (sentimentMatch?.[1] as CallSummary["sentiment"]) || "neutral",
          follow_up_needed: false,
        } as Omit<CallSummary, "date" | "duration_seconds">;
      }

      summary = {
        date: new Date().toISOString(),
        duration_seconds: durationSeconds,
        summary: parsed.summary || "Call completed",
        key_facts: parsed.key_facts || [],
        outcome: parsed.outcome || "information_gathered",
        sentiment: parsed.sentiment || "neutral",
        follow_up_needed: parsed.follow_up_needed ?? false,
        follow_up_reason: parsed.follow_up_reason,
        buying_stage: parsed.buying_stage,
        objections_raised: parsed.objections_raised,
        next_best_action: parsed.next_best_action,
        urgency: parsed.urgency,
      };
    } catch (aiErr) {
      // Fallback: simple summary without AI
      log("warn", "context_carryover.ai_summary_failed", {
        error: aiErr instanceof Error ? aiErr.message : String(aiErr),
      });
      summary = {
        date: new Date().toISOString(),
        duration_seconds: durationSeconds,
        summary: `${history.length}-turn demo call. ${durationSeconds > 120 ? "Extended conversation." : "Brief interaction."}`,
        key_facts: [],
        outcome: durationSeconds < 30 ? "hung_up_early" : "demo_completed",
        sentiment: "neutral",
        follow_up_needed: durationSeconds > 60,
      };
    }

    // Store summary in call_session
    try {
      await db
        .from("call_sessions")
        .update({
          summary: summary.summary,
          outcome: summary.outcome,
          metadata: {
            ...meta,
            call_summary: summary,
          },
        })
        .eq("id", callSessionId);
    } catch (updateErr) {
      log("warn", "context_carryover.session_update_failed", {
        error: updateErr instanceof Error ? updateErr.message : String(updateErr),
      });
    }

    // Store context in lead metadata for future calls
    if (sess.lead_id) {
      try {
        const { data: lead } = await db
          .from("leads")
          .select("metadata")
          .eq("id", sess.lead_id)
          .maybeSingle();

        const leadMeta = ((lead as { metadata?: Record<string, unknown> } | null)?.metadata ?? {}) as Record<string, unknown>;
        const existingSummaries = (leadMeta.call_summaries ?? []) as CallSummary[];

        // Keep rolling window of last 5 summaries
        const updatedSummaries = [...existingSummaries, summary].slice(-5);

        // Merge key facts (deduplicate by category+value)
        const allFacts = (leadMeta.key_facts ?? []) as KeyFact[];
        for (const fact of summary.key_facts) {
          const existing = allFacts.findIndex(
            (f) => f.category === fact.category && f.value.toLowerCase() === fact.value.toLowerCase()
          );
          if (existing >= 0) {
            allFacts[existing] = fact; // Update with latest confidence
          } else {
            allFacts.push(fact);
          }
        }

        // Extract caller name — only set if high confidence AND no existing name
        const nameFact = summary.key_facts.find((f) => f.category === "name");
        // Check current lead name before overwriting
        let nameUpdate: Record<string, string> = {};
        if (nameFact && nameFact.confidence >= 0.7) {
          const { data: nameCheck } = await db
            .from("leads")
            .select("name")
            .eq("id", sess.lead_id)
            .maybeSingle();
          const currentName = (nameCheck as { name?: string | null } | null)?.name;
          if (!currentName || currentName === "Unknown" || currentName === "") {
            nameUpdate = { name: nameFact.value };
          }
        }

        await db
          .from("leads")
          .update({
            ...nameUpdate,
            metadata: {
              ...leadMeta,
              call_summaries: updatedSummaries,
              key_facts: allFacts,
              last_call_summary: summary.summary,
              last_call_date: summary.date,
              last_call_outcome: summary.outcome,
              last_call_sentiment: summary.sentiment,
              total_calls: (existingSummaries.length + 1),
              follow_up_needed: summary.follow_up_needed,
              follow_up_reason: summary.follow_up_reason,
            },
          })
          .eq("id", sess.lead_id);

        log("info", "context_carryover.stored", {
          callSessionId,
          leadId: sess.lead_id,
          outcome: summary.outcome,
          factsExtracted: summary.key_facts.length,
        });
      } catch (leadErr) {
        log("warn", "context_carryover.lead_update_failed", {
          error: leadErr instanceof Error ? leadErr.message : String(leadErr),
        });
      }
    }

    return summary;
  } catch (err) {
    log("error", "context_carryover.failed", {
      error: err instanceof Error ? err.message : String(err),
      callSessionId,
    });
    return null;
  }
}

/**
 * Generate a warm-back greeting for a returning caller.
 * Uses stored context to personalize the greeting.
 */
export async function getReturningCallerGreeting(
  workspaceId: string,
  phone: string,
): Promise<string | null> {
  const db = getDb();

  try {
    const { data: lead } = await db
      .from("leads")
      .select("name, metadata")
      .eq("workspace_id", workspaceId)
      .eq("phone", phone)
      .maybeSingle();

    if (!lead) return null;

    const leadData = lead as { name?: string; metadata?: Record<string, unknown> };
    const meta = leadData.metadata ?? {};
    const totalCalls = (meta.total_calls as number) || 0;

    if (totalCalls < 1) return null;

    const name = leadData.name;
    const lastOutcome = meta.last_call_outcome as string | undefined;

    // Generate personalized greeting variants
    const greetings: string[] = [];

    if (name) {
      greetings.push(
        `Hey ${name}! Great to hear from you again... so, where did we leave off?`,
        `${name}! Welcome back. I was hoping you'd call again... what can I help with today?`,
        `Oh hey ${name}! Good to talk to you again. What's on your mind?`,
      );
    } else {
      greetings.push(
        `Hey, welcome back! Good to hear from you again... what can I help with today?`,
        `Oh hey! I remember our last chat. So, what's on your mind this time?`,
      );
    }

    if (lastOutcome === "objection_unresolved") {
      greetings.push(
        name
          ? `${name}! Glad you called back. I've been thinking about what we discussed... got some great answers for you.`
          : `Welcome back! I've been thinking about what we discussed last time... got some answers for you.`,
      );
    }

    // Use specific facts from prior calls for personalization
    const facts = (meta.key_facts ?? []) as Array<{ category: string; value: string }>;
    const businessType = facts.find((f) => f.category === "business_type")?.value;
    const painPoint = facts.find((f) => f.category === "pain_point")?.value;

    if (businessType && name) {
      greetings.push(
        `${name}! Good to hear from you again. Last time we were talking about how Revenue Operator could help your ${businessType}... what's on your mind today?`,
      );
    } else if (businessType) {
      greetings.push(
        `Hey, welcome back! I remember we were chatting about your ${businessType}. How can I help today?`,
      );
    }

    if (painPoint && name) {
      greetings.push(
        `${name}! Great to hear from you. I've been thinking about how we can solve that ${painPoint} issue for you...`,
      );
    }

    return greetings[Math.floor(Math.random() * greetings.length)];
  } catch {
    return null;
  }
}

/**
 * Load conversation context for a lead to inject into the system prompt.
 * Returns a formatted string ready to append to the system prompt.
 */
export async function loadLeadContext(
  workspaceId: string,
  phone: string,
): Promise<string> {
  const db = getDb();

  try {
    const { data: lead } = await db
      .from("leads")
      .select("name, metadata")
      .eq("workspace_id", workspaceId)
      .eq("phone", phone)
      .maybeSingle();

    if (!lead) return "";

    const leadData = lead as { name?: string; metadata?: Record<string, unknown> };
    const meta = leadData.metadata ?? {};
    const facts = (meta.key_facts ?? []) as KeyFact[];
    const lastSummary = meta.last_call_summary as string | undefined;
    const totalCalls = (meta.total_calls as number) || 0;

    if (totalCalls < 1 && !leadData.name) return "";

    let context = "\n\n## RETURNING CALLER CONTEXT\n";
    context += `This person has called ${totalCalls} time(s) before.\n`;

    if (leadData.name) {
      context += `Their name is ${leadData.name}. Use it naturally in conversation.\n`;
    }

    if (lastSummary) {
      context += `Last conversation: ${lastSummary}\n`;
    }

    if (facts.length > 0) {
      context += "Known facts about this caller:\n";
      for (const fact of facts) {
        context += `- ${fact.category}: ${fact.value}\n`;
      }
    }

    const followUp = meta.follow_up_needed as boolean;
    const followUpReason = meta.follow_up_reason as string | undefined;
    if (followUp && followUpReason) {
      context += `\nIMPORTANT: Follow up on this from last call: ${followUpReason}\n`;
    }

    context += "\nUse this context naturally — welcome them back, reference what you discussed. Don't dump all facts at once.\n";

    return context;
  } catch {
    return "";
  }
}
