import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db/queries";
import {
  getGoogleAuthClientId,
  getGoogleAuthClientSecret,
  getGoogleAuthRedirectUri,
  sanitizeNextPath,
} from "@/lib/auth/google-oauth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "rt_google_oauth_state";
const NEXT_COOKIE = "rt_google_oauth_next";

function clearCookies(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(NEXT_COOKIE, "", { path: "/", maxAge: 0 });
}

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  name?: string;
};

export async function GET(req: NextRequest) {
  const clientId = getGoogleAuthClientId();
  const clientSecret = getGoogleAuthClientSecret();
  const fallbackNext = sanitizeNextPath(req.nextUrl.searchParams.get("next"));
  const nextFromCookie = sanitizeNextPath(req.cookies.get(NEXT_COOKIE)?.value ?? fallbackNext);
  const signInErrorUrl = new URL("/sign-in", req.nextUrl.origin);

  const fail = (code: string) => {
    signInErrorUrl.searchParams.set("error", code);
    const res = NextResponse.redirect(signInErrorUrl);
    clearCookies(res);
    return res;
  };

  if (!clientId || !clientSecret) {
    return fail("google_config");
  }

  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value ?? "";
  if (!state || !expectedState || state !== expectedState) {
    return fail("google_state");
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return fail("google_auth");
  }

  try {
    const tokenBody = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleAuthRedirectUri(req.nextUrl.origin),
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      return fail("google_exchange");
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return fail("google_exchange");
    }

    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      return fail("google_profile");
    }

    const userInfo = (await userRes.json()) as GoogleUserInfo;
    const email = typeof userInfo.email === "string" ? userInfo.email.trim().toLowerCase() : "";
    if (!email) {
      return fail("google_profile");
    }

    const db = getDb();
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

    let isNewUser = false;
    let userId: string | null = null;
    let workspaceId: string | undefined;

    const { data: existingUser } = await db.from("users").select("id").eq("email", email).maybeSingle();
    userId = (existingUser as { id?: string } | null)?.id ?? null;

    if (!userId && supabaseUrl && serviceRoleKey) {
      const admin = createSupabaseJsClient(supabaseUrl, serviceRoleKey);
      const generatedPassword = `${randomUUID()}!Aa1`;
      const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          full_name: userInfo.name ?? userInfo.given_name ?? "",
          auth_provider: "google",
        },
      });
      if (adminError || !adminData.user?.id) {
        return fail("google_account");
      }
      userId = adminData.user.id;
      isNewUser = true;
    }

    if (!userId) {
      userId = randomUUID();
      isNewUser = true;
    }

    await db.from("users").upsert({ id: userId, email }, { onConflict: "id" });

    const { data: existingWorkspace } = await db
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();
    workspaceId = (existingWorkspace as { id?: string } | null)?.id ?? undefined;

    if (!workspaceId) {
      const workspaceName =
        userInfo.given_name?.trim() ||
        userInfo.name?.trim() ||
        email.split("@")[0] ||
        "My Workspace";
      const { data: createdWorkspace, error: workspaceError } = await db
        .from("workspaces")
        .insert({
          name: workspaceName,
          owner_id: userId,
          autonomy_level: "assisted",
          kill_switch: false,
        })
        .select("id")
        .maybeSingle();
      if (workspaceError || !createdWorkspace) {
        return fail("google_workspace");
      }
      workspaceId = (createdWorkspace as { id: string }).id;
      await db.from("settings").insert({ workspace_id: workspaceId, risk_level: "balanced" });
      isNewUser = true;
    }

    const cookie = createSessionCookie({ userId, workspaceId });
    if (!cookie) {
      return fail("google_session");
    }

    const redirectPath = isNewUser ? "/app/onboarding" : nextFromCookie;
    const res = NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin));
    res.headers.append("Set-Cookie", cookie);
    clearCookies(res);
    return res;
  } catch {
    return fail("google_auth");
  }
}
