import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateEmail } from "@/lib/auth/validate";
import { getBaseUrl } from "@/lib/runtime/base-url";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const emailResult = validateEmail(body?.email ?? "");
  if (!emailResult.ok) {
    return NextResponse.json({ error: emailResult.error }, { status: 400 });
  }

  const supabase = createClient(url, anonKey);
  const redirectTo = `${getBaseUrl(req.nextUrl.origin)}/reset-password`;

  try {
    await supabase.auth.resetPasswordForEmail(emailResult.value, { redirectTo });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not send reset email." }, { status: 500 });
  }
}
