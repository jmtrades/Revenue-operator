/**
 * Removal shock prevention: when orientation records exist for 3 consecutive days
 * and the first unresolved authority item appears, send one line. Once per day.
 */

import { getDb } from "@/lib/db/queries";
import {
  hasOrientationRecordsThreeConsecutiveDays,
  getOrientationState,
  setOrientationPendingSentToday,
} from "./records";

const MESSAGE = "An outcome is now pending confirmation.";

async function getOwnerEmail(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return null;
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).single();
  return (user as { email?: string } | null)?.email ?? null;
}

async function sendEmail(to: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@revenue-operator.com>";
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: text, text }),
  });
  return res.ok;
}

/** If 3 consecutive days have orientation records and not sent today, send once. */
export async function maybeSendOrientationPending(workspaceId: string): Promise<boolean> {
  const hasThree = await hasOrientationRecordsThreeConsecutiveDays(workspaceId);
  if (!hasThree) return false;

  const state = await getOrientationState(workspaceId);
  const today = new Date().toISOString().slice(0, 10);
  if (state?.orientation_pending_sent_at === today) return false;

  const owner = await getOwnerEmail(workspaceId);
  if (!owner) return false;

  const sent = await sendEmail(owner, MESSAGE);
  if (sent) await setOrientationPendingSentToday(workspaceId);
  return sent;
}
