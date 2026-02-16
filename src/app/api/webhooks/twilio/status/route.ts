/**
 * Twilio delivery status callback (SMS status updates)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { recordDeliveryReceipt } from "@/lib/delivery/provider";
import { markAttemptDelivered } from "@/lib/delivery-assurance/action-attempts";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const messageSid = form.get("MessageSid") as string | null;
  const messageStatus = form.get("MessageStatus") as string | null;

  if (!messageSid) return new NextResponse("Missing MessageSid", { status: 400 });

  if (messageStatus === "delivered") {
    await recordDeliveryReceipt(messageSid);
    await markAttemptDelivered(messageSid);
  }

  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
