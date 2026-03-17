/**
 * POST /api/public/test-call
 *
 * Public “test call” entrypoint for the marketing site.
 * We intentionally do NOT place calls from an unauthenticated context.
 * Instead, we validate the phone number and return a next step for the user.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

function normalizeE164Candidate(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return raw.startsWith("+") ? raw : `+${digits}`;
  return null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { phone_number?: string | null };
  const normalized = normalizeE164Candidate((body.phone_number ?? "").toString());

  if (!normalized) {
    return NextResponse.json({ ok: false, error: "Enter a valid phone number." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    next: "/activate",
    normalized_phone_number: normalized,
    message:
      "Create your workspace to receive a test call. You can trigger it in onboarding once your agent is configured.",
  });
}

