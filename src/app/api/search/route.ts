/**
 * Global search endpoint powering the Cmd+K command palette.
 *
 * Searches across leads, agents, and contacts for the calling workspace.
 * Returns at most 8 results per entity type; deep-linkable URLs.
 *
 * Workspace-scoped: never returns rows outside the caller's workspace.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/queries";
import { getSession } from "@/lib/auth/request-session";
import { requireWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

type SearchHit = {
  kind: "lead" | "agent" | "contact";
  id: string;
  label: string;
  sublabel?: string | null;
  href: string;
};

const MAX_PER_KIND = 8;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session?.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });

  const authErr = await requireWorkspaceAccess(req, workspaceId);
  if (authErr) return authErr;

  // Rate-limit: global search is cheap but abusable as a scraping vector.
  const rlKey = `search:${workspaceId}:${session?.userId ?? "anon"}`;
  const rl = await checkRateLimit(rlKey, 60, 60_000);
  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const rawQuery = (req.nextUrl.searchParams.get("q") ?? "").trim();
  // Guard: require at least 2 chars to avoid scanning entire tables.
  if (rawQuery.length < 2) {
    return NextResponse.json({ hits: [] satisfies SearchHit[] });
  }
  const query = rawQuery.slice(0, 80);

  // PostgREST `ilike` requires wildcards embedded in the pattern. Escape % and _ to keep
  // user input from degrading into a full-table scan via implicit wildcards.
  const esc = query.replace(/[%_]/g, (m) => `\\${m}`);
  const pattern = `%${esc}%`;

  const db = getDb();
  const hits: SearchHit[] = [];

  try {
    // Parallel fetches — independent workspace-scoped reads.
    const [leadsRes, agentsRes, contactsRes] = await Promise.all([
      db
        .from("leads")
        .select("id, name, phone, email, state")
        .eq("workspace_id", workspaceId)
        .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(MAX_PER_KIND),
      db
        .from("agents")
        .select("id, name, role, status")
        .eq("workspace_id", workspaceId)
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(MAX_PER_KIND),
      db
        .from("contacts")
        .select("id, name, phone, email")
        .eq("workspace_id", workspaceId)
        .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
        .order("created_at", { ascending: false })
        .limit(MAX_PER_KIND),
    ]);

    for (const row of (leadsRes.data ?? []) as Array<{ id: string; name: string | null; phone: string | null; email: string | null; state: string | null }>) {
      hits.push({
        kind: "lead",
        id: row.id,
        label: row.name?.trim() || row.phone || row.email || `Lead ${row.id.slice(0, 8)}`,
        sublabel: [row.phone, row.email, row.state].filter(Boolean).join(" · "),
        href: `/app/leads?focus=${encodeURIComponent(row.id)}`,
      });
    }

    for (const row of (agentsRes.data ?? []) as Array<{ id: string; name: string | null; role: string | null; status: string | null }>) {
      hits.push({
        kind: "agent",
        id: row.id,
        label: row.name?.trim() || `Agent ${row.id.slice(0, 8)}`,
        sublabel: [row.role, row.status].filter(Boolean).join(" · "),
        href: `/app/agents/${encodeURIComponent(row.id)}`,
      });
    }

    for (const row of (contactsRes.data ?? []) as Array<{ id: string; name: string | null; phone: string | null; email: string | null }>) {
      hits.push({
        kind: "contact",
        id: row.id,
        label: row.name?.trim() || row.phone || row.email || `Contact ${row.id.slice(0, 8)}`,
        sublabel: [row.phone, row.email].filter(Boolean).join(" · "),
        href: `/app/contacts/${encodeURIComponent(row.id)}`,
      });
    }
  } catch (err) {
    log("error", "search.failed", {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Fail soft — an empty result is better than a 500 for a UI autocomplete.
    return NextResponse.json({ hits: [] satisfies SearchHit[] });
  }

  return NextResponse.json({ hits });
}
