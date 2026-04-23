/**
 * Phase 12c.3 — Warm-transfer context brief.
 *
 * Research gap (from Phase 12a): across AI voice agents, warm-transfer is
 * "hand off the call" with zero structured context. The human rep then has
 * to either ask the caller to repeat themselves (terrible UX) or start cold.
 *
 * The top complaint across Air AI, Synthflow, Retell, Bland, Vapi users:
 * "I got dumped into a live call with no idea who this person was or what
 *  they wanted."
 *
 * This module generates a structured brief the human rep sees on-screen
 * (and hears read briefly over whisper audio if configured) *before* the
 * call is bridged. It's built from the in-call conversation state that
 * already exists: call-objective, conversation-stage, objections heard,
 * commitments made, caller sentiment.
 *
 * Deterministic. No LLM. Takes a TransferContext and emits:
 *   - a 1-sentence summary
 *   - up-to-5 bullet "must-know" items
 *   - the specific next move
 *
 * The brief is short on purpose. Research shows reps ignore anything >~30s
 * of prep material.
 */

export interface TransferCallerSnapshot {
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
}

export interface TransferObjection {
  type: string; // e.g. "price" | "timing" | "authority"
  summary: string; // 1-line paraphrase of what caller said
  handled: boolean;
}

export interface TransferCommitment {
  type: string; // e.g. "call_back" | "send_info" | "payment"
  description: string; // what was promised
  dueBy?: string | null; // ISO
}

export interface TransferContext {
  caller: TransferCallerSnapshot;
  intent: string; // e.g. "inbound sales inquiry" / "support escalation"
  callStartedAt: string; // ISO
  callDurationSeconds: number;
  stage: string; // e.g. "discovery" | "qualified" | "closing" | "objection"
  sentiment: "frustrated" | "hesitant" | "curious" | "skeptical" | "interested" | "neutral";
  objections: TransferObjection[];
  commitments: TransferCommitment[];
  qualifyingFacts: string[]; // up to 5
  reasonForTransfer: string; // agent-emitted or routing-emitted
  language?: string;
}

export interface WarmTransferBrief {
  headline: string;
  summary: string;
  mustKnow: string[]; // up to 5 bullets
  openObjections: string[];
  openCommitments: string[];
  recommendedOpeningLine: string;
  warnings: string[];
  sentiment: TransferContext["sentiment"];
  durationReadable: string;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function clip(str: string, n: number): string {
  const t = (str ?? "").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * Pure transform: in-flight call context → printable brief for the human.
 */
export function buildWarmTransferBrief(ctx: TransferContext): WarmTransferBrief {
  const callerName = ctx.caller.name?.trim() || "Caller";
  const callerCompany = ctx.caller.company?.trim() || null;
  const who = callerCompany ? `${callerName} (${callerCompany})` : callerName;

  const headline = clip(`${who} — ${ctx.intent}`, 120);

  const summaryParts: string[] = [];
  summaryParts.push(`${who} is on the line (${formatDuration(ctx.callDurationSeconds)} in)`);
  summaryParts.push(`stage: ${ctx.stage}`);
  summaryParts.push(`sentiment: ${ctx.sentiment}`);
  summaryParts.push(`transfer reason: ${ctx.reasonForTransfer}`);
  const summary = clip(summaryParts.join("; "), 280);

  const mustKnow: string[] = [];
  for (const fact of (ctx.qualifyingFacts ?? []).slice(0, 5)) {
    const f = clip(fact, 140);
    if (f) mustKnow.push(f);
  }

  const openObjections = (ctx.objections ?? [])
    .filter((o) => !o.handled)
    .slice(0, 3)
    .map((o) => clip(`${o.type}: ${o.summary}`, 140));

  const openCommitments = (ctx.commitments ?? [])
    .slice(0, 3)
    .map((c) => {
      const due = c.dueBy ? ` by ${c.dueBy.slice(0, 10)}` : "";
      return clip(`${c.type}: ${c.description}${due}`, 140);
    });

  // Craft a first line. Don't be cute — give the rep something to say.
  let opener: string;
  if (ctx.sentiment === "frustrated") {
    opener = `Hi ${callerName}, I hear you — I've got the full picture and I'll get this sorted.`;
  } else if (ctx.sentiment === "hesitant" || ctx.sentiment === "skeptical") {
    opener = `Hi ${callerName}, thanks for staying on. I've been briefed on what you're looking for — let me pick up right where we left off.`;
  } else if (openObjections.length > 0) {
    opener = `Hi ${callerName}, I've got your context. Let's talk through the ${openObjections[0]?.split(":")[0] ?? "concern"} piece first.`;
  } else if (openCommitments.length > 0) {
    opener = `Hi ${callerName}, I've got you. I see we owe you ${openCommitments[0]?.split(":")[1]?.trim() ?? "a follow-up"} — let's lock that in now.`;
  } else {
    opener = `Hi ${callerName}, thanks for staying on. I've been fully briefed — I'll take it from here.`;
  }

  const warnings: string[] = [];
  if (ctx.sentiment === "frustrated") warnings.push("Caller is frustrated — lead with acknowledgement, not pitch.");
  if (openObjections.length >= 2) warnings.push("Multiple unresolved objections. Slow down.");
  if (ctx.callDurationSeconds > 600) warnings.push("Call is long (>10min). Respect their time.");
  if (!ctx.caller.name) warnings.push("Caller name unknown — ask for it naturally in the opener.");

  return {
    headline,
    summary,
    mustKnow,
    openObjections,
    openCommitments,
    recommendedOpeningLine: clip(opener, 280),
    warnings,
    sentiment: ctx.sentiment,
    durationReadable: formatDuration(ctx.callDurationSeconds),
  };
}

/**
 * Render the brief as plain text (for whisper TTS or Slack drop).
 */
export function renderBriefAsText(brief: WarmTransferBrief): string {
  const lines: string[] = [];
  lines.push(brief.headline.toUpperCase());
  lines.push(brief.summary);
  if (brief.mustKnow.length) {
    lines.push("");
    lines.push("MUST KNOW");
    for (const m of brief.mustKnow) lines.push(`• ${m}`);
  }
  if (brief.openObjections.length) {
    lines.push("");
    lines.push("UNRESOLVED");
    for (const o of brief.openObjections) lines.push(`• ${o}`);
  }
  if (brief.openCommitments.length) {
    lines.push("");
    lines.push("OPEN PROMISES");
    for (const c of brief.openCommitments) lines.push(`• ${c}`);
  }
  if (brief.warnings.length) {
    lines.push("");
    lines.push("HANDLE WITH CARE");
    for (const w of brief.warnings) lines.push(`• ${w}`);
  }
  lines.push("");
  lines.push(`OPEN WITH: ${brief.recommendedOpeningLine}`);
  return lines.join("\n");
}

/**
 * Render the brief as a short whisper line (≤15s read aloud).
 */
export function renderBriefAsWhisper(brief: WarmTransferBrief): string {
  const bits: string[] = [];
  bits.push(brief.headline);
  if (brief.openObjections[0]) bits.push(`open: ${brief.openObjections[0]}`);
  if (brief.warnings[0]) bits.push(brief.warnings[0]);
  bits.push(`open with: ${brief.recommendedOpeningLine}`);
  return bits.join(". ");
}
