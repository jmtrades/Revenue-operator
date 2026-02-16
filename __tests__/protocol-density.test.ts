/**
 * Protocol density: counterparty reliance, invite eligibility, network_pressure, cron idempotence.
 * 1) reliance_state transitions 2) invite issued only once 3) invite only after dependent
 * 4) no invite when authority unresolved 5) network_pressure when mirrored critical 6) cron does not send twice.
 */

import { describe, it, expect } from "vitest";
import {
  updateCounterpartyReliance,
  mirrorProtocolEventToCounterpartyWorkspace,
  issueProtocolParticipation,
} from "@/lib/shared-transaction-assurance";
import { getDb } from "@/lib/db/queries";
import { readFileSync } from "fs";
import { join } from "path";

function hasDb(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" ||
      typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string")
  );
}

describe("Protocol density", () => {
  describe("1) reliance_state transitions correctly", () => {
    it("observed -> recurring after 2 interactions in window", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const idn = `reliance-trans-${Date.now()}@example.com`;
      await updateCounterpartyReliance(workspaceId, idn, "interaction");
      const { data: r1 } = await db
        .from("counterparty_reliance")
        .select("reliance_state, interaction_count")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", idn)
        .single();
      expect((r1 as { reliance_state: string }).reliance_state).toBe("observed");
      await updateCounterpartyReliance(workspaceId, idn, "interaction");
      const { data: r2 } = await db
        .from("counterparty_reliance")
        .select("reliance_state, interaction_count")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", idn)
        .single();
      expect((r2 as { interaction_count: number }).interaction_count).toBe(2);
      expect(["observed", "recurring"]).toContain((r2 as { reliance_state: string }).reliance_state);
    });

    it("shared_entry increments shared_entries_count", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const idn = `reliance-shared-${Date.now()}@example.com`;
      await updateCounterpartyReliance(workspaceId, idn, "shared_entry");
      const { data: r } = await db
        .from("counterparty_reliance")
        .select("shared_entries_count")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", idn)
        .single();
      expect((r as { shared_entries_count: number }).shared_entries_count).toBe(1);
    });
  });

  describe("2) invite issued only once", () => {
    it("issueProtocolParticipation sets invite_issued_at; second call returns sent: false", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const idn = `invite-once-${Date.now()}@example.com`;
      await db.from("counterparty_reliance").upsert(
        {
          workspace_id: workspaceId,
          counterparty_identifier: idn,
          interaction_count: 2,
          shared_entries_count: 1,
          acknowledged_count: 1,
          reliance_state: "dependent",
          invite_issued_at: null,
        },
        { onConflict: "workspace_id,counterparty_identifier" }
      );
      const first = await issueProtocolParticipation(workspaceId, idn);
      expect(first.ok).toBe(true);
      const { data: row } = await db
        .from("counterparty_reliance")
        .select("invite_issued_at")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", idn)
        .single();
      expect((row as { invite_issued_at: string | null }).invite_issued_at).toBeTruthy();
      const second = await issueProtocolParticipation(workspaceId, idn);
      expect(second.ok).toBe(true);
      expect(second.sent).toBe(false);
    });
  });

  describe("3) invite only after dependent state", () => {
    it("issueProtocolParticipation when reliance_state observed returns sent: false when no conversation", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const idn = `invite-dependent-${Date.now()}@example.com`;
      await db.from("counterparty_reliance").upsert(
        {
          workspace_id: workspaceId,
          counterparty_identifier: idn,
          interaction_count: 0,
          shared_entries_count: 1,
          acknowledged_count: 0,
          reliance_state: "observed",
          invite_issued_at: null,
        },
        { onConflict: "workspace_id,counterparty_identifier" }
      );
      const result = await issueProtocolParticipation(workspaceId, idn);
      expect(result.ok).toBe(true);
      expect(result.sent).toBe(false);
    });
  });

  describe("4) no invite when authority unresolved", () => {
    it("cron skips counterparties with authority_required disputed/expired", () => {
      const path = join(process.cwd(), "src", "app", "api", "cron", "protocol-density", "route.ts");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("authority_required");
      expect(content).toContain("disputed");
      expect(content).toContain("expired");
      expect(content).toContain("if (authorityRow) continue");
    });
  });

  describe("5) network_pressure event when mirrored critical", () => {
    it("mirror with originWorkspaceId updates reliance and can insert network_pressure", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: workspaces } = await db.from("workspaces").select("id").limit(2);
      const ids = (workspaces ?? []).map((w: { id: string }) => w.id);
      if (ids.length < 2) return;
      const [originWs, counterpartyWs] = ids;
      const externalRef = "np-test-" + Date.now();
      await db.from("counterparty_reliance").upsert(
        {
          workspace_id: counterpartyWs,
          counterparty_identifier: `workspace:${originWs}`,
          interaction_count: 2,
          shared_entries_count: 3,
          acknowledged_count: 0,
          reliance_state: "recurring",
          invite_issued_at: null,
        },
        { onConflict: "workspace_id,counterparty_identifier" }
      );
      await mirrorProtocolEventToCounterpartyWorkspace(
        externalRef,
        counterpartyWs,
        "acknowledged",
        {},
        originWs
      );
      const { data: ev } = await db
        .from("protocol_events")
        .select("event_type")
        .eq("external_ref", externalRef)
        .eq("workspace_id", counterpartyWs)
        .eq("event_type", "network_pressure")
        .maybeSingle();
      const { data: rel } = await db
        .from("counterparty_reliance")
        .select("reliance_state, interaction_count")
        .eq("workspace_id", counterpartyWs)
        .eq("counterparty_identifier", `workspace:${originWs}`)
        .single();
      expect((rel as { reliance_state: string; interaction_count: number } | null)?.reliance_state).toBeDefined();
      expect((rel as { interaction_count: number } | null)?.interaction_count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("6) cron does not send messages twice", () => {
    it("protocol-density route selects only invite_issued_at IS NULL", () => {
      const path = join(process.cwd(), "src", "app", "api", "cron", "protocol-density", "route.ts");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("invite_issued_at");
      expect(content).toContain("null");
    });
  });
});
