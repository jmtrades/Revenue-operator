import { cookies } from "next/headers";
import { getDb } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { buildWorkspaceReadiness } from "@/lib/workspace/readiness";
import { type AppShellWorkspaceMeta } from "./AppShellClient";
import HydrationGate from "./HydrationGate";

async function getInitialShellData(): Promise<{
  workspaceId: string;
  workspaceName: string;
  workspaceMeta: AppShellWorkspaceMeta;
}> {
  let userId: string | null = null;
  let workspaceId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      userId = user.id;
    }
  } catch {
    // fall through to revenue_session cookie
  }

  if (!userId) {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    const session = getSessionFromCookie(cookieHeader);
    userId = session?.userId ?? null;
    workspaceId = session?.workspaceId ?? null;
  }

  if (!userId) {
    return { workspaceId: "", workspaceName: "", workspaceMeta: null };
  }

  const db = getDb();
  const { data: ownedWorkspaces } = await db
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  const workspaceList = Array.isArray(ownedWorkspaces)
    ? (ownedWorkspaces as Array<{ id: string; name?: string | null }>)
    : [];
  const initialWorkspace =
    (workspaceId && workspaceList.find((item) => item.id === workspaceId)) || workspaceList[0] || null;

  if (!initialWorkspace) {
    return { workspaceId: "", workspaceName: "", workspaceMeta: null };
  }

  workspaceId = initialWorkspace.id;

  const [{ data }, { data: phoneCfg }, { count: callCount }, { data: calendar }, { count: teamCount }] =
    await Promise.all([
      db
        .from("workspaces")
        .select("id, name, agent_name, knowledge_items, website, address, onboarding_completed_at")
        .eq("id", workspaceId)
        .single(),
      db.from("phone_configs").select("id").eq("workspace_id", workspaceId).eq("status", "active").maybeSingle(),
      db.from("call_sessions").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      db.from("google_calendar_tokens").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle(),
      db.from("team_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    ]);

  const row = (data ?? null) as {
    id: string;
    name?: string | null;
    agent_name?: string | null;
    knowledge_items?: Array<{ q?: string; a?: string }> | null;
    website?: string | null;
    address?: string | null;
    onboarding_completed_at?: string | null;
  } | null;

  if (!row) {
    return {
      workspaceId,
      workspaceName: initialWorkspace.name?.trim() || "My Workspace",
      workspaceMeta: null,
    };
  }

  const knowledgeCount = Array.isArray(row.knowledge_items)
    ? row.knowledge_items.filter((item) => (item.q ?? "").trim() && (item.a ?? "").trim()).length
    : 0;
  const readiness = buildWorkspaceReadiness({
    businessName: row.name,
    agentName: row.agent_name,
    knowledgeCount,
    phoneConnected: Boolean(phoneCfg),
    callCount: callCount ?? 0,
    calendarConnected: Boolean(calendar),
    teamCount: teamCount ?? 0,
  });

  return {
    workspaceId,
    workspaceName: row.name?.trim() || "My Workspace",
    workspaceMeta: {
      onboardingCompletedAt: row.onboarding_completed_at ?? null,
      banner: {
        show: readiness.showBanner,
        text: readiness.bannerText,
        href: readiness.bannerHref,
        cta: readiness.bannerCta,
      },
      progress: {
        items: readiness.items.map((item) => ({
          key: item.key,
          completed: item.completed,
        })),
      },
      stats: {
        calls: callCount ?? 0,
      },
    },
  };
}

const FALLBACK_SHELL = {
  workspaceId: "",
  workspaceName: "",
  workspaceMeta: null as AppShellWorkspaceMeta,
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initial = FALLBACK_SHELL;
  try {
    initial = await getInitialShellData();
  } catch {
    // Auth/DB failure: render shell with empty workspace so client can redirect or retry
  }

  return (
    <HydrationGate
      initialShellData={{
        workspaceId: initial.workspaceId,
        workspaceName: initial.workspaceName,
        workspaceMeta: initial.workspaceMeta,
      }}
    >
      {children}
    </HydrationGate>
  );
}
