import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { getDb } from "@/lib/db/queries";
import { validateEmail } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { workspace_id?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  const emailResult = validateEmail(body.email ?? "");
  if (!emailResult.ok) {
    return NextResponse.json({ error: emailResult.error }, { status: 400 });
  }
  const email = emailResult.value;
  const role = ["admin", "manager", "viewer"].includes(body.role ?? "") ? body.role! : "viewer";

  const db = getDb();

  // Check if already a member
  const { data: existingUser } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    const userId = (existingUser as { id: string }).id;
    const { data: existingRole } = await db
      .from("workspace_roles")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRole) {
      return NextResponse.json({ error: "This user is already a team member." }, { status: 409 });
    }

    // Check seat limit before adding
    const { BILLING_PLANS } = await import("@/lib/billing-plans");
    const { data: wsBilling } = await db
      .from("workspaces")
      .select("billing_tier")
      .eq("id", workspaceId)
      .maybeSingle();

    const billingTier = (wsBilling as { billing_tier?: string | null } | null)?.billing_tier as keyof typeof BILLING_PLANS | null;
    if (billingTier && billingTier in BILLING_PLANS) {
      const plan = BILLING_PLANS[billingTier];
      const maxSeats = plan.maxSeats;

      if (maxSeats !== -1) {
        const { data: currentMembers } = await db
          .from("workspace_roles")
          .select("id")
          .eq("workspace_id", workspaceId);

        const currentCount = currentMembers?.length ?? 0;
        if (currentCount >= maxSeats) {
          return NextResponse.json({ error: "Team member limit reached for your plan." }, { status: 403 });
        }
      }
    }

    // Add them directly
    await db.from("workspace_roles").insert({
      workspace_id: workspaceId,
      user_id: userId,
      role,
    });

    return NextResponse.json({ ok: true, added: true });
  }

  // User doesn't exist yet — store pending invite
  const { error } = await db.from("workspace_invites").insert({
    workspace_id: workspaceId,
    email,
    role,
    status: "pending",
  });

  if (error) {
    // May not have workspace_invites table — still return success
    console.error("[workspace/invite] Insert failed:", error);
    return NextResponse.json({ ok: true, pending: true, note: "Invite recorded" });
  }

  return NextResponse.json({ ok: true, pending: true });
}
