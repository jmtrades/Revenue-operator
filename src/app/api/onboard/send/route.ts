/**
 * POST /api/onboard/send
 * Send public work link to counterparty contact.
 * Message body is fixed: "This matches what we agreed. Adjust it if anything is off."
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/queries";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { createAcknowledgementToken } from "@/lib/shared-transaction-assurance";
import { assertSameOrigin } from "@/lib/http/csrf";
import { parseBody, workspaceIdSchema, safeStringSchema } from "@/lib/api/validate";

const sendOnboardSchema = z.object({
  workspace_id: workspaceIdSchema,
  external_ref: safeStringSchema(200).min(1, "external_ref is required"),
  counterparty_contact: safeStringSchema(500).min(1, "counterparty_contact is required"),
  approval_mode: z.enum(["review_required", "autopilot"]).optional(),
});

export async function POST(request: NextRequest) {
  const csrfBlock = assertSameOrigin(request);
  if (csrfBlock) return csrfBlock;

  const parsed = await parseBody(request, sendOnboardSchema);
  if ("error" in parsed) return parsed.error;
  const { workspace_id, external_ref, approval_mode } = parsed.data;

  const authErr = await requireWorkspaceAccess(request, workspace_id);
  if (authErr) return authErr;

  if (approval_mode === "review_required" || approval_mode === "autopilot") {
    const dbForSettings = getDb();
    await dbForSettings.from("settings").update({ approval_mode, updated_at: new Date().toISOString() }).eq("workspace_id", workspace_id);
  }

  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("id, counterparty_identifier")
    .eq("workspace_id", workspace_id)
    .eq("external_ref", external_ref)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const transactionId = (tx as { id: string }).id;
  const { rawToken } = await createAcknowledgementToken(transactionId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  if (!baseUrl) {
    return NextResponse.json({ error: "APP_URL not configured" }, { status: 500 });
  }
  const link = `${baseUrl}/public/work/${external_ref}?token=${rawToken}`;

  const messageBody = "This matches what we agreed. Adjust it if anything is off.";

  return NextResponse.json({
    ok: true,
    link,
    message_body: messageBody,
  });
}
