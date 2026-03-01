import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", origin));
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/sign-in?error=auth`);
    }
    const userId = data.user?.id;
    if (!userId) {
      return NextResponse.redirect(new URL(next, origin));
    }
    let workspaceId: string | undefined;
    let isNewUser = false;
    try {
      const db = getDb();
      let { data: ws } = await db.from("workspaces").select("id").eq("owner_id", userId).limit(1).maybeSingle();
      if (!ws) {
        const { data: created, error: createErr } = await db.from("workspaces").insert({ name: "My workspace", owner_id: userId, autonomy_level: "assisted", kill_switch: false }).select("id").single();
        if (!createErr && created) {
          ws = created as { id: string };
          isNewUser = true;
          await db.from("settings").insert({ workspace_id: (created as { id: string }).id, risk_level: "balanced" });
        }
      }
      workspaceId = (ws as { id?: string } | null)?.id ?? undefined;
    } catch {
      // DB unavailable — still set session with userId only
    }
    const redirectPath = isNewUser && next === "/dashboard" ? "/dashboard/onboarding" : next;
    const cookie = createSessionCookie({ userId, workspaceId });
    if (cookie) {
      const res = NextResponse.redirect(new URL(redirectPath, origin));
      res.headers.append("Set-Cookie", cookie);
      return res;
    }
    return NextResponse.redirect(new URL(redirectPath, origin));
  } catch {
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }
}
