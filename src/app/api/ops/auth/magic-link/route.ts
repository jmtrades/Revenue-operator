/**
 * Request magic link for staff login
 * POST { email }
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createMagicLink } from "@/lib/ops/auth";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const result = await createMagicLink(email);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ token: result.token });
}
