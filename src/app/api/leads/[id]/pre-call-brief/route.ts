/**
 * Pre-call brief: context, motivation, risks, hesitations before each call.
 * Generated automatically so user is prepared.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateCloserPacket } from "@/lib/intelligence/closer-packet";
import { getLeadMemory } from "@/lib/lead-memory";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const dealId = req.nextUrl.searchParams.get("deal_id") ?? undefined;

  try {
    const packet = await generateCloserPacket(leadId, dealId ?? undefined);
    const objMem = await getLeadMemory(leadId, "objections_raised");
    const objections = Array.isArray(objMem?.objections) ? objMem.objections : [];
    const interestsMem = await getLeadMemory(leadId, "interests_expressed");
    const interests = Array.isArray(interestsMem?.interests) ? interestsMem.interests : [];

    const motivation = interests.length > 0
      ? interests.join("; ")
      : packet.urgency_signals.length > 0
        ? `Expressed urgency: ${packet.urgency_signals.join(", ")}`
        : "Conversation context from prior exchanges.";

    const risks = [
      ...packet.likely_objections.map((o) => `Potential objection: ${o}`),
      ...objections.map((o) => `Raised before: ${o}`),
    ];

    const hesitations = packet.likely_objections;

    const brief = {
      context: packet.pain_summary,
      motivation,
      risks: risks.length > 0 ? risks : ["Standard discovery—qualify before closing."],
      hesitations: hesitations.length > 0 ? hesitations : ["Scheduling", "Timing"],
      lead_context: packet.lead_context,
      recommended_strategy: packet.recommended_strategy,
      suggested_questions: packet.suggested_questions,
    };

    return NextResponse.json(brief);
  } catch (e) {
    console.error("Pre-call brief error:", e);
    return NextResponse.json({ error: "Failed to generate pre-call brief" }, { status: 500 });
  }
}
