export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { assertSameOrigin } from "@/lib/http/csrf";

export async function POST(req: NextRequest) {
  const csrfBlock = assertSameOrigin(req);
  if (csrfBlock) return csrfBlock;

  let body: { workspace_id?: string; services?: string; hours?: string; emergencies_after_hours?: string; appointment_handling?: string; faq_extra?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { workspace_id, services, hours, emergencies_after_hours, appointment_handling, faq_extra } = body;
  if (!workspace_id) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  const authErr = await requireWorkspaceAccess(req, workspace_id);
  if (authErr) return authErr;
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("id, name").eq("id", workspace_id).maybeSingle();
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const w = ws as { name?: string };
  const offerSummary = (services || "").trim() || "General services";
  const businessHours = hours === "weekdays_sat" ? { ...defaultHours(), saturday: { start: "09:00", end: "14:00" } } : defaultHours();
  const faqExtraTrim = (faq_extra || "").trim();
  const faq = faqExtraTrim ? [{ q: "Anything else?", a: faqExtraTrim }] : [];
  const { error: upsertErr } = await db.from("workspace_business_context").upsert(
    { workspace_id, business_name: w.name || "Business", offer_summary: offerSummary, ideal_customer: "", business_hours: businessHours, faq, updated_at: new Date().toISOString() },
    { onConflict: "workspace_id" }
  );
  if (upsertErr) return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });

  const brain = {
    services: (services || "").trim() || undefined,
    emergencies_after_hours: emergencies_after_hours || undefined,
    appointment_handling: appointment_handling || undefined,
    faq_extra: faqExtraTrim || undefined,
  };
  const { data: agent } = await db.from("agents").select("id, knowledge_base").eq("workspace_id", workspace_id).limit(1).maybeSingle();
  if (agent) {
    const kb = (agent as { knowledge_base?: Record<string, unknown> }).knowledge_base ?? {};
    await db.from("agents").update({ knowledge_base: { ...kb, ...brain }, updated_at: new Date().toISOString() }).eq("id", (agent as { id: string }).id);
  }
  return NextResponse.json({ ok: true });
}

function defaultHours() {
  return {
    monday: { start: "09:00", end: "17:00" },
    tuesday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    thursday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "17:00" },
    saturday: null,
    sunday: null,
  };
}
