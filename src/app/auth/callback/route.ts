import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/runtime/base-url";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app/activity";
  const origin = getBaseUrl(new URL(request.url).origin);

  if (!code) {
    const signInUrl = new URL("/sign-in", origin);
    if (next && next !== "/app/activity") signInUrl.searchParams.set("next", next);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const signInUrl = new URL("/sign-in", origin);
      signInUrl.searchParams.set("error", "auth");
      if (next && next !== "/app/activity") signInUrl.searchParams.set("next", next);
      return NextResponse.redirect(signInUrl.toString());
    }
    const userId = data.user?.id;
    const userEmail = data.user?.email;
    if (!userId) {
      return NextResponse.redirect(new URL(next, origin));
    }
    let workspaceId: string | undefined;
    let isNewUser = false;
    try {
      const db = getDb();
      if (userEmail) {
        try {
          await db.from("users").upsert({ id: userId, email: userEmail }, { onConflict: "id" });
        } catch {
          // users table may not exist yet (migration not run)
        }
      }
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
    const redirectPath = isNewUser && (next === "/dashboard" || next === "/app" || next === "/app/activity") ? "/app/onboarding" : next;
    const cookie = createSessionCookie({ userId, workspaceId });
    if (cookie) {
      const res = NextResponse.redirect(new URL(redirectPath, origin));
      res.headers.append("Set-Cookie", cookie);
      return res;
    }
    // Session not configured (e.g. SESSION_SECRET missing); send to sign-in so they aren’t stuck
    const signInUrl = new URL("/sign-in", origin);
    signInUrl.searchParams.set("error", "auth");
    return NextResponse.redirect(signInUrl);
  } catch {
    return NextResponse.redirect(`${origin}/sign-in?error=auth`);
  }
}

