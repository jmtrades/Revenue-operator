/**
 * Context-Aware Buffer: load workspace + lead context for the conversational engine.
 */

import type { BusinessBrainInput } from "@/lib/business-brain/compile";

export interface ContextBufferInput {
  workspaceId: string;
  leadId?: string | null;
}

export interface ContextBufferResult {
  business: BusinessBrainInput | null;
  leadState: string | null;
  bookingLink: string | null;
}

export async function loadContextBuffer(
  input: ContextBufferInput,
  getDb: () => ReturnType<typeof import("@/lib/db/queries").getDb>
): Promise<ContextBufferResult> {
  const db = getDb();
  const [ctxRes, leadRes] = await Promise.all([
    db
      .from("workspace_business_context")
      .select("business_name, offer_summary, business_hours, faq, booking_link")
      .eq("workspace_id", input.workspaceId)
      .maybeSingle(),
    input.leadId
      ? db.from("leads").select("state").eq("id", input.leadId).eq("workspace_id", input.workspaceId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ctx = ctxRes.data as Record<string, unknown> | null;
  const lead = leadRes.data as { state?: string } | null;

  const business: BusinessBrainInput | null = ctx
    ? {
        business_name: String(ctx.business_name ?? ""),
        offer_summary: ctx.offer_summary as string | undefined,
        business_hours: ctx.business_hours as BusinessBrainInput["business_hours"],
        faq: (ctx.faq as BusinessBrainInput["faq"]) ?? [],
      }
    : null;

  return {
    business,
    leadState: lead?.state ?? null,
    bookingLink: (ctx?.booking_link as string | null) ?? null,
  };
}
