import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }
  } catch {
    // fall through to revenue_session cookie
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const session = getSessionFromCookie(cookieHeader);
  return session?.userId ?? null;
}

export default async function AppRootPage() {
  const userId = await getUserId();
  if (!userId) {
    redirect("/activate");
  }

  const db = getDb();
  const { data: workspace } = await db
    .from("workspaces")
    .select("onboarding_completed_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const onboarded = Boolean(
    (workspace as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at,
  );

  redirect(onboarded ? "/app/dashboard" : "/activate");
}
