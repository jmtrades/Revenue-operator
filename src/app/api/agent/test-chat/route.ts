export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/request-session";
import { getDb } from "@/lib/db/queries";
import { buildVapiSystemPrompt } from "@/lib/agents/build-vapi-system-prompt";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.workspaceId || !session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI service not configured. Add ANTHROPIC_API_KEY to environment variables." },
      { status: 503 }
    );
  }

  let body: { agentId?: string; messages?: Array<{ role: string; text: string }> };
  try {
    body = (await req.json()) as { agentId?: string; messages?: Array<{ role: string; text: string }> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const agentId = body.agentId?.trim();
  const messages = body.messages;
  if (!agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing or empty messages" }, { status: 400 });
  }
  const validMessages = messages.filter(
    (m): m is { role: string; text: string } =>
      m != null && typeof m === "object" && typeof (m as { role?: unknown }).role === "string" && typeof (m as { text?: unknown }).text === "string"
  );
  if (validMessages.length === 0) {
    return NextResponse.json({ error: "Messages must have role and text" }, { status: 400 });
  }

  const db = getDb();
  const { data: agentRow, error: agentError } = await db
    .from("agents")
    .select("id, workspace_id, name, greeting, knowledge_base, rules")
    .eq("id", agentId)
    .eq("workspace_id", session.workspaceId)
    .single();

  if (agentError || !agentRow) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { data: workspaceRow, error: wsError } = await db
    .from("workspaces")
    .select("id, name, address, working_hours")
    .eq("id", session.workspaceId)
    .single();

  if (wsError || !workspaceRow) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const agent = agentRow as {
    id: string;
    workspace_id: string;
    name?: string | null;
    greeting?: string | null;
    knowledge_base?: Record<string, unknown> | null;
    rules?: { neverSay?: string[]; alwaysTransfer?: string[]; transferPhone?: string | null; transferRules?: Array<{ phrase?: string; phone?: string }> } | null;
  };
  const workspace = workspaceRow as {
    id: string;
    name?: string | null;
    address?: string | null;
    working_hours?: Record<string, { open?: string; close?: string }> | string | null;
  };

  const kb = agent.knowledge_base ?? {};
  const rules = agent.rules ?? {};
  const businessName =
    (workspace.name?.trim()) ||
    (workspace as { business_name?: string | null }).business_name?.trim() ||
    "My Workspace";
  const greeting =
    agent.greeting?.trim() ||
    `Thanks for calling ${businessName}. How can I help you today?`;
  const rawFaq = Array.isArray(kb.faq) ? kb.faq : [];
  const faq = rawFaq.map((f: { question?: string; answer?: string; q?: string; a?: string }) => ({
    question: f.question ?? f.q ?? "",
    answer: f.answer ?? f.a ?? "",
  })).filter((f) => (f.question ?? "").trim() && (f.answer ?? "").trim());
  let businessHours: string | null = null;
  if (workspace.working_hours && typeof workspace.working_hours === "object" && !Array.isArray(workspace.working_hours)) {
    businessHours =
      Object.entries(workspace.working_hours)
        .map(([day, hours]) => {
          const open = (hours as { open?: string })?.open ?? "";
          const close = (hours as { close?: string })?.close ?? "";
          return `${day}: ${open}-${close}`.trim();
        })
        .filter(Boolean)
        .join("; ") || null;
  } else if (typeof workspace.working_hours === "string" && workspace.working_hours.trim()) {
    businessHours = workspace.working_hours.trim();
  }

  const qualificationCriteria =
    Array.isArray((kb as { qualification?: { criteria?: Array<{ label?: string; enabled?: boolean }> } }).qualification?.criteria) &&
    (kb as { qualification?: { criteria?: Array<{ label?: string; enabled?: boolean }> } }).qualification!.criteria!.length > 0
      ? (kb as { qualification: { criteria: Array<{ label?: string; enabled?: boolean }> } }).qualification.criteria
          .filter((c) => c.enabled && (c.label ?? "").trim())
          .map((c) => (c.label ?? "").trim())
      : [];

  let systemPrompt: string;
  try {
    systemPrompt = buildVapiSystemPrompt({
      businessName,
      industry: null,
      agentName: agent.name?.trim() || "Receptionist",
      greeting,
      services: Array.isArray(kb.services) ? kb.services : [],
      faq,
      specialInstructions: (kb.specialInstructions as string) ?? "",
      rules: {
        neverSay: Array.isArray(rules.neverSay) ? rules.neverSay : [],
        alwaysTransfer: Array.isArray(rules.alwaysTransfer) ? rules.alwaysTransfer : [],
        transferPhone: rules.transferPhone ?? null,
        transferRules: Array.isArray(rules.transferRules) ? rules.transferRules : [],
      },
      afterHoursMode: (kb.afterHoursMode as "messages" | "emergency" | "forward" | "closed" | null) ?? null,
      callStyle: (kb.callStyle as string | null) ?? null,
      personality: null,
      qualificationCriteria,
      objections: Array.isArray(kb.objections) ? kb.objections : [],
      confusedCallerHandling: (kb.confusedCallerHandling as string | null) ?? null,
      offTopicHandling: (kb.offTopicHandling as string | null) ?? null,
      businessHours,
      address: workspace.address?.trim() || null,
      primaryGoal: (kb.primaryGoal as string | null) ?? null,
      businessContext: (kb.businessContext as string | null) ?? null,
      targetAudience: (kb.targetAudience as string | null) ?? null,
      assertiveness: (kb.assertiveness as number | null) ?? null,
      whenHesitation: (kb.whenHesitation as string | null) ?? null,
      whenThinkAboutIt: (kb.whenThinkAboutIt as string | null) ?? null,
      whenPricing: (kb.whenPricing as string | null) ?? null,
      whenCompetitor: (kb.whenCompetitor as string | null) ?? null,
      learnedBehaviors: [],
    });
  } catch {
    systemPrompt = [
      `You are ${agent.name || "an AI phone agent"} for ${businessName}.`,
      agent.greeting ? `Your greeting: "${agent.greeting}"` : "",
      `You are speaking with: callers.`,
      (kb.businessContext as string) ? `Business context: ${kb.businessContext}` : "",
      Array.isArray(rules.neverSay) && rules.neverSay.length > 0
        ? `NEVER DO: ${rules.neverSay.join("; ")}`
        : "",
      Array.isArray(rules.alwaysTransfer) && rules.alwaysTransfer.length > 0
        ? `Transfer to a human when: ${rules.alwaysTransfer.join("; ")}`
        : "",
      faq.length > 0
        ? `Knowledge base:\n${faq.map((f: { question?: string; answer?: string; q?: string; a?: string }) => `Q: ${f.question ?? f.q ?? ""}\nA: ${f.answer ?? f.a ?? ""}`).join("\n\n")}`
        : "",
      "You are in a phone conversation. Keep responses concise and natural, like a real phone call. Do not use markdown or formatting.",
      "Respond in 1-3 sentences unless more detail is specifically needed.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const claudeMessages = validMessages.map((m) => ({
    role: m.role === "agent" ? "assistant" as const : "user" as const,
    content: String(m.text).trim() || "(no content)",
  }));

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI service is temporarily unavailable. Please try again." }, { status: 502 });
    }

    let data: { content?: Array<{ text?: string }> };
    try {
      data = (await res.json()) as { content?: Array<{ text?: string }> };
    } catch {
      // Invalid JSON; return below
      return NextResponse.json({ error: "Invalid response from AI service." }, { status: 502 });
    }
    const response = data.content?.[0]?.text?.trim() || "I apologize, I had trouble generating a response.";

    return NextResponse.json({ response });
  } catch (e: unknown) {
    void (e instanceof Error ? e.message : String(e));
    // Error response below
    return NextResponse.json({ error: "Failed to connect to AI service" }, { status: 500 });
  }
}
