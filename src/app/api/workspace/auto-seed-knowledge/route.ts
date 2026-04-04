export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { assertSameOrigin } from "@/lib/http/csrf";
import { getSession } from "@/lib/auth/request-session";
import { log } from "@/lib/logger";

/**
 * POST /api/workspace/auto-seed-knowledge
 *
 * Auto-seeds the knowledge base with industry-specific FAQs and objection handling.
 * Called when a workspace selects or changes their industry.
 */
export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { workspace_id?: string; industry?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspace_id, industry } = body;
  if (!workspace_id || !industry) {
    return NextResponse.json({ error: "workspace_id and industry required" }, { status: 400 });
  }

  try {
    const db = getDb();

    // Verify workspace ownership
    const { data: ws } = await db
      .from("workspaces")
      .select("id, owner_id")
      .eq("id", workspace_id)
      .maybeSingle();

    if (!ws || (ws as { owner_id: string }).owner_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load industry config
    const { getIndustryConfig } = await import("@/lib/data/industry-objections");
    const config = getIndustryConfig(industry);

    if (!config) {
      return NextResponse.json({ error: "Unknown industry", available_industries: [] }, { status: 400 });
    }

    let seeded = 0;

    // Seed qualification questions as FAQ items
    for (const question of config.qualification_questions) {
      const { data: existing } = await db
        .from("knowledge_base")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("source", "faq")
        .ilike("content", `%${question.slice(0, 40)}%`)
        .limit(1)
        .maybeSingle();

      if (!(existing as { id: string } | null)?.id) {
        await db.from("knowledge_base").insert({
          workspace_id,
          source: "faq",
          category: "general",
          content: `Qualification question: ${question}`,
          metadata: { question, answer: `This is a key qualification question for ${config.display_name} businesses. Ask this naturally during conversations.`, auto_seeded: true },
        });
        seeded++;
      }
    }

    // Seed objection handling as FAQ items
    for (const objection of config.objections) {
      const { data: existing } = await db
        .from("knowledge_base")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("source", "faq")
        .ilike("content", `%${objection.trigger.slice(0, 30)}%`)
        .limit(1)
        .maybeSingle();

      if (!(existing as { id: string } | null)?.id) {
        await db.from("knowledge_base").insert({
          workspace_id,
          source: "faq",
          category: "general",
          content: objection.response,
          metadata: {
            question: `How to handle: "${objection.trigger}"`,
            answer: objection.response,
            category: objection.category,
            auto_seeded: true,
          },
        });
        seeded++;
      }
    }

    // Seed key services
    for (const service of config.key_services) {
      const { data: existing } = await db
        .from("knowledge_base")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("source", "faq")
        .eq("category", "services")
        .ilike("content", `%${service}%`)
        .limit(1)
        .maybeSingle();

      if (!(existing as { id: string } | null)?.id) {
        await db.from("knowledge_base").insert({
          workspace_id,
          source: "faq",
          category: "services",
          content: `We offer ${service} as one of our core services.`,
          metadata: { question: `Do you offer ${service}?`, answer: `Yes, ${service} is one of our core services. Would you like to learn more or schedule a consultation?`, auto_seeded: true },
        });
        seeded++;
      }
    }

    // Seed compliance notes if applicable
    if (config.compliance_notes) {
      const { data: existing } = await db
        .from("knowledge_base")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("source", "faq")
        .eq("category", "policies")
        .ilike("content", `%compliance%`)
        .limit(1)
        .maybeSingle();

      if (!(existing as { id: string } | null)?.id) {
        await db.from("knowledge_base").insert({
          workspace_id,
          source: "faq",
          category: "policies",
          content: config.compliance_notes,
          metadata: { question: "Compliance and regulatory notes", answer: config.compliance_notes, auto_seeded: true },
        });
        seeded++;
      }
    }

    // Update workspace industry and suggested greeting
    await db.from("workspaces").update({
      industry: config.industry,
      greeting: config.suggested_greeting,
      updated_at: new Date().toISOString(),
    }).eq("id", workspace_id);

    return NextResponse.json({
      ok: true,
      industry: config.display_name,
      seeded_items: seeded,
      qualification_questions: config.qualification_questions.length,
      objections: config.objections.length,
      services: config.key_services.length,
    });
  } catch (err) {
    log("error", "[auto-seed-knowledge]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to seed knowledge" }, { status: 500 });
  }
}
