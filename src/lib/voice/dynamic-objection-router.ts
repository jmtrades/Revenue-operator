/**
 * Dynamic Objection Router
 * Selects optimal objection response based on conversation context,
 * caller emotion, prior objections, and conversation phase.
 *
 * Routes inbound objections to the most effective response technique,
 * considering the emotional state, conversation history, and sales phase.
 */

import type { ConversationPhase } from "./call-intelligence-engine";

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface ObjectionContext {
  objectionType:
    | "price"
    | "timing"
    | "competitor"
    | "authority"
    | "need"
    | "trust"
    | "general";
  callerEmotion:
    | "frustrated"
    | "hesitant"
    | "curious"
    | "skeptical"
    | "interested";
  priorObjections: string[]; // types already raised in this call
  conversationPhase: ConversationPhase;
  industry?: string;
  callerStatement: string;
}

export interface ObjectionResponse {
  response: string;
  technique: string; // e.g., "feel-felt-found", "reframe", "validate-redirect"
  followUpQuestion: string;
}

/* ── Objection Type Detection ────────────────────────────────────────────── */

/**
 * Parse caller statement and classify the objection type.
 */
export function detectObjectionType(
  statement: string,
): ObjectionContext["objectionType"] {
  const lower = statement.toLowerCase();

  // Price objection
  if (
    /\b(too expensive|can't afford|budget|cost too much|price.*high|expensive|out of budget|not in budget)\b/.test(
      lower,
    )
  ) {
    return "price";
  }

  // Timing objection
  if (
    /\b(not right now|maybe later|later|busy|not ready|need more time|not the time|call me back|down the road)\b/.test(
      lower,
    )
  ) {
    return "timing";
  }

  // Competitor objection
  if (
    /\b(already use|we use|competitor|smith|ruby|bland|retell|synthflow|dialpad|ringcentral|existing solution|we have|current vendor)\b/.test(
      lower,
    )
  ) {
    return "competitor";
  }

  // Authority objection
  if (
    /\b(need to ask|ask my|boss|team|partner|cto|cfo|ceo|decision maker|need approval|check with|run it by)\b/.test(
      lower,
    )
  ) {
    return "authority";
  }

  // Need objection
  if (
    /\b(don't need|we're fine|not a priority|don't see the value|don't think we need|not necessary|don't have a problem)\b/.test(
      lower,
    )
  ) {
    return "need";
  }

  // Trust objection
  if (
    /\b(sounds too good|is this real|sounds like|sounds scammy|how do i know|why should i trust|too good to be true|scam|fake|legit|prove it|seems risky)\b/.test(
      lower,
    )
  ) {
    return "trust";
  }

  return "general";
}

/* ── Emotion Detection ────────────────────────────────────────────────────── */

/**
 * Simple keyword analysis to detect caller emotion.
 */
export function detectCallerEmotion(
  statement: string,
): ObjectionContext["callerEmotion"] {
  const lower = statement.toLowerCase();

  // Frustrated signals
  if (
    /\b(look|already told you|stop|listen|paying attention|waste my time|i said|come on|seriously|enough|are you)\b/.test(
      lower,
    ) ||
    /[!]{2,}/.test(statement)
  ) {
    return "frustrated";
  }

  // Curious signals
  if (/\b(how|tell me more|interesting|what if|can you explain|interested in|curious|how does)\b/.test(lower)) {
    return "curious";
  }

  // Skeptical signals
  if (
    /\b(really\?|prove it|sounds too good|i doubt|right\?|sure\?|seriously\?|that doesn't make sense)\b/.test(
      lower,
    )
  ) {
    return "skeptical";
  }

  // Interested signals
  if (
    /\b(that's cool|wow|nice|exactly what i need|that sounds|would that|can we|let's|perfect|amazing)\b/.test(
      lower,
    )
  ) {
    return "interested";
  }

  // Hesitant signals (default fallback for objections)
  return "hesitant";
}

/* ── Response Strategy Repository ────────────────────────────────────────── */

type ResponseStrategyKey = `${ObjectionContext["objectionType"]}_${ObjectionContext["callerEmotion"]}`;

/**
 * Repository of response strategies indexed by objection type + emotion combo.
 */
const RESPONSE_STRATEGIES: Record<ResponseStrategyKey, ObjectionResponse> = {
  // PRICE OBJECTIONS
  price_frustrated: {
    technique: "validate-redirect",
    response:
      "I completely understand — money is tight, and you're right to be careful with your budget. Let me ask you this: how many calls a week go to voicemail or get missed right now?",
    followUpQuestion:
      "What would you estimate those missed calls cost you monthly?",
  },
  price_hesitant: {
    technique: "feel-felt-found",
    response:
      "That's a fair concern — most businesses we talk to worry about cost upfront. What they find is that a single missed call can cost more than our entire monthly fee. For your business, what's the real cost of a dropped appointment?",
    followUpQuestion: "Does that math track for you?",
  },
  price_curious: {
    technique: "anchor-and-reveal",
    response:
      "Smart question. Most businesses solve this with a receptionist at three to four thousand a month. Revenue Operator does the same job 24/7 for a tenth of that. The Solo plan is one forty-seven a month.",
    followUpQuestion: "How does that compare to what you're spending now?",
  },
  price_skeptical: {
    technique: "social-proof",
    response:
      "Totally fair to question the math. Here's what our average client sees: forty percent more booked appointments in month one. For a dental practice, that's eight thousand in new revenue from a two hundred ninety-seven dollar investment. Your business might be different, but those numbers are real.",
    followUpQuestion: "What would a forty percent bump in appointments mean for you?",
  },
  price_interested: {
    technique: "roi-anchor",
    response:
      "I love your interest. Most plans pay for themselves in one booked appointment. Our money-back guarantee means zero risk — if it doesn't work, full refund, no questions asked.",
    followUpQuestion:
      "Want to start with the Solo plan and test it with real calls this week?",
  },

  // TIMING OBJECTIONS
  timing_frustrated: {
    technique: "respect-and-retreat",
    response:
      "I totally respect that. You've got a lot going on. Can I send you a quick text with a setup link? That way when the timing is right, you can get going in literally five minutes.",
    followUpQuestion: "What's the best number to reach you?",
  },
  timing_hesitant: {
    technique: "micro-commitment",
    response:
      "Completely understand — your plate is full. Here's the thing: this takes five minutes to set up, and you can test it with real calls before committing to anything. No payment needed to try it.",
    followUpQuestion: "Could you carve out five minutes tomorrow to test it?",
  },
  timing_curious: {
    technique: "reframe-timeline",
    response:
      "I get it — timing matters. But here's what I'd suggest: set it up now while you're thinking about it, then take your time testing it. Most businesses are live within a day of signing up.",
    followUpQuestion:
      "If I could make it even easier, would now be a good time to get started?",
  },
  timing_skeptical: {
    technique: "risk-reduction",
    response:
      "Makes sense to be cautious. That's why we have a thirty-day money-back guarantee. Start now, test it thoroughly, and if it doesn't fit, you're out nothing.",
    followUpQuestion:
      "Would you be willing to try it for the next thirty days on that basis?",
  },
  timing_interested: {
    technique: "capitalize-momentum",
    response:
      "Love the interest! Strike while the iron's hot — let's get you set up right now. Seriously, it takes five minutes.",
    followUpQuestion: "Ready to start right now while you've got the energy?",
  },

  // COMPETITOR OBJECTIONS
  competitor_frustrated: {
    technique: "acknowledge-and-differentiate",
    response:
      "I hear you — you've got something in place. The key difference for most businesses switching is this: you get human quality AI at a fraction of the cost, plus true 24/7 with no hand-offs or hold times.",
    followUpQuestion:
      "How much are you currently paying for your current solution?",
  },
  competitor_hesitant: {
    technique: "side-by-side-comparison",
    response:
      "That makes sense — you don't switch solutions lightly. But here's what usually happens: businesses compare the actual cost of their current solution versus ours, plus the quality jump, and the decision becomes obvious. What are you paying monthly right now?",
    followUpQuestion: "And how many calls a month does that cover?",
  },
  competitor_curious: {
    technique: "competitive-positioning",
    response:
      "Great question. We're purpose-built for this one thing — answering business calls with AI. Most competitors either charge way more for less, or require a developer to set up. We're built for business owners, not developers.",
    followUpQuestion:
      "What's the biggest friction point with your current solution?",
  },
  competitor_skeptical: {
    technique: "head-to-head",
    response:
      "I totally get the skepticism. You're invested in your current system. But here's the reality: we handle more concurrent calls at lower cost and with better voice quality. Plus you can test us for thirty days risk-free while you still have your backup.",
    followUpQuestion:
      "What would need to be true for you to consider switching?",
  },
  competitor_interested: {
    technique: "trial-proposition",
    response:
      "Perfect — you're thinking strategically. Here's what I'd suggest: run us in parallel with your current solution for thirty days. See how you feel about the quality, the cost, the ease. If you love it, switch. If not, you've lost nothing.",
    followUpQuestion:
      "Does running both for a month while you evaluate sound reasonable?",
  },

  // AUTHORITY OBJECTIONS
  authority_frustrated: {
    technique: "empower-champion",
    response:
      "Totally get it — you don't make this call alone. Let me make it easy for you. I'll send you a one-page breakdown that shows the ROI in plain numbers. You can use that to get buy-in from your team.",
    followUpQuestion: "Who's the key person you need to convince?",
  },
  authority_hesitant: {
    technique: "provide-materials",
    response:
      "Makes sense — you need buy-in. That's why I'm going to send you a super simple one-pager: what it costs, what it saves, and the guarantee. Share that with your decision makers and see what they think.",
    followUpQuestion:
      "When do you think you could get feedback from your team?",
  },
  authority_curious: {
    technique: "facilitate-conversation",
    response:
      "Smart move checking with your team first. I'll send over a simple breakdown you can share with them. If they have questions, they can reach out directly and I can walk them through it.",
    followUpQuestion: "Would it help if I sent an email your team could forward?",
  },
  authority_skeptical: {
    technique: "reduce-friction",
    response:
      "Makes sense to have your team weigh in. To make this easy, I'll send you a one-pager with all the ROI math. No sales pitch, just facts. Your team can review and you can decide together.",
    followUpQuestion:
      "What's most important to your decision-makers — cost, ease of setup, or support?",
  },
  authority_interested: {
    technique: "accelerate-approval",
    response:
      "Great call checking with your team. Here's what I'll do: send me their email addresses and I'll send them a summary directly. They can see it works in real time on this call, and I can answer any questions.",
    followUpQuestion: "Who would you like me to send the info to?",
  },

  // NEED OBJECTIONS
  need_frustrated: {
    technique: "challenge-assumption",
    response:
      "I hear you — you don't think it's a priority. Quick question though: how many calls went to voicemail or got missed this week? Most businesses don't realize how much revenue actually slips through.",
    followUpQuestion: "What would you guess — five calls? Twenty?",
  },
  need_hesitant: {
    technique: "discovery-reframe",
    response:
      "I understand — not sure if it's right for you yet. Can I ask: do you ever get calls while you're busy? From potential customers or partners?",
    followUpQuestion: "What happens to those calls?",
  },
  need_curious: {
    technique: "use-case-exploration",
    response:
      "Interesting — you might be more of a fit than you think. Let me ask: if every call was answered professionally 24/7, how would that change your business?",
    followUpQuestion:
      "What would be different if you never missed an important call?",
  },
  need_skeptical: {
    technique: "gentle-challenge",
    response:
      "Fair point — you don't see the value yet. But here's what usually changes people's minds: they realize that every business gets inbound calls, and every missed call costs real money. It's not about adding features — it's about not losing revenue.",
    followUpQuestion:
      "How many potential customers or leads contact you by phone monthly?",
  },
  need_interested: {
    technique: "possibility-expansion",
    response:
      "Love this energy! If you don't think you need it now, imagine the possibilities: never missing a lead call again, scaling your availability without hiring, custom workflows that fit your business. That's what becomes possible.",
    followUpQuestion:
      "Which of those would have the biggest impact on your business?",
  },

  // TRUST OBJECTIONS
  trust_frustrated: {
    technique: "proof-and-guarantee",
    response:
      "I completely understand your skepticism — you're right not to trust blindly. Here's the truth: you're hearing me right now on this call. This is the actual product. And we have a thirty-day money-back guarantee with zero risk.",
    followUpQuestion:
      "Does it help that you can test it with zero financial risk?",
  },
  trust_hesitant: {
    technique: "third-party-validation",
    response:
      "That's a smart thing to be cautious about. Here's why you can trust us: one, you're hearing the voice quality right now on this call — this isn't marketing fluff, it's real. Two, thirty-day money-back guarantee, no questions asked.",
    followUpQuestion: "Do you want to hear from one of our actual customers?",
  },
  trust_curious: {
    technique: "transparency-plus-proof",
    response:
      "Great question to ask. Here's the deal: we're transparent about what we do and what we don't. We're best-in-class on voice quality and ease of setup. We're not for everyone, but when we're a fit, we work really well.",
    followUpQuestion: "What would make you feel confident trying us?",
  },
  trust_skeptical: {
    technique: "money-back-guarantee",
    response:
      "Totally fair skepticism — you're hearing a promise and you've heard promises before. Here's what's different: thirty-day money-back guarantee. If it's not what we said, you get every penny back, no questions asked.",
    followUpQuestion:
      "Does a full refund guarantee make it worth thirty days of testing?",
  },
  trust_interested: {
    technique: "risk-reversal",
    response:
      "I love the caution — it means you make smart decisions. Here's the good news: we've removed all the risk. Try it. If it's not everything we said, full refund, done. Most businesses never ask for that refund.",
    followUpQuestion:
      "Ready to test it today with zero financial risk? Let's get you set up right now.",
  },

  // GENERAL OBJECTIONS (FALLBACK)
  general_frustrated: {
    technique: "empathetic-reset",
    response:
      "I hear the frustration. Let's reset — what's the one biggest concern you have about making a decision right now?",
    followUpQuestion: "What would need to be true for you to feel good about this?",
  },
  general_hesitant: {
    technique: "clarification",
    response:
      "Sounds like you've got some reservations, which is totally fair. Help me understand — what's the main thing holding you back?",
    followUpQuestion: "Is it the cost, the timing, or something else?",
  },
  general_curious: {
    technique: "exploration",
    response:
      "I love the curiosity. Let's dig in — what aspect would you like to understand better?",
    followUpQuestion: "What's the biggest question you have right now?",
  },
  general_skeptical: {
    technique: "verification",
    response:
      "Great instinct to be skeptical. What would need to happen for you to be convinced this works?",
    followUpQuestion: "What's the specific claim that seems unlikely to you?",
  },
  general_interested: {
    technique: "momentum-capture",
    response:
      "Love the interest! Let's keep this momentum going. What's the next step that would make sense for you?",
    followUpQuestion:
      "Can we get you started today while you're feeling good about this?",
  },
};

/* ── Sequence-Aware Logic ──────────────────────────────────────────────────── */

/**
 * Adjust response if caller has raised multiple objections (shows pattern).
 */
function applySequenceAwareness(
  response: ObjectionResponse,
  context: ObjectionContext,
): ObjectionResponse {
  if (context.priorObjections.length > 1) {
    // Multiple objections suggest the caller needs more reassurance
    return {
      ...response,
      technique: "feel-felt-found",
      response: `I totally understand how you feel. A lot of ${context.industry || "businesses like yours"} felt the same way at first. What they found was...

${response.response}`,
    };
  }

  // If same objection raised twice, acknowledge directly and offer alternative
  if (context.priorObjections.length === 1) {
    const repeatedObjection = context.priorObjections[0] === context.objectionType;
    if (repeatedObjection) {
      return {
        ...response,
        response: `I hear you — ${context.objectionType} is clearly the big concern. Let me be straight with you...

${response.response}`,
      };
    }
  }

  return response;
}

/* ── Main Routing Function ──────────────────────────────────────────────────── */

/**
 * Main export: routes caller objection to best-fit response.
 * Considers emotion, objection type, conversation phase, and history.
 */
export function routeObjection(
  context: ObjectionContext,
): ObjectionResponse {
  // Build lookup key
  const key: ResponseStrategyKey = `${context.objectionType}_${context.callerEmotion}` as ResponseStrategyKey;

  // Get base strategy (or fallback to general)
  let response =
    RESPONSE_STRATEGIES[key] || RESPONSE_STRATEGIES.general_hesitant;

  // Apply sequence-aware adjustments for repeated objections
  response = applySequenceAwareness(response, context);

  // Phase-specific tweaks
  if (context.conversationPhase === "closing") {
    response.followUpQuestion = "Ready to get started right now?";
  } else if (context.conversationPhase === "discovery") {
    response.followUpQuestion =
      "Help me understand better — is this the main thing holding you back?";
  }

  return response;
}

/**
 * Helper to format routing decision as a coaching hint for the demo agent.
 */
export function formatObjectionCoachingHint(
  context: ObjectionContext,
  response: ObjectionResponse,
): string {
  return `
OBJECTION DETECTED: ${context.objectionType.toUpperCase()}
Caller emotion: ${context.callerEmotion}
Technique: ${response.technique}

SUGGESTED RESPONSE:
"${response.response}"

FOLLOW UP WITH:
"${response.followUpQuestion}"
`;
}
