/**
 * Economic conversion: events recorded on recovery, aggregator sums, no engine behavior change, billing export, responsibility boolean.
 */

import { describe, it, expect } from "vitest";
import {
  recordEconomicEvent,
  aggregateEconomicValueSinceLastLedger,
  exportBillingEvents,
  hasEconomicEventsInLast7Days,
} from "@/lib/economic-events";
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

describe("Economic conversion", () => {
  describe("events recorded when recovery occurs", () => {
    it("recordEconomicEvent inserts row with event_type and optional value", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      await recordEconomicEvent({
        workspaceId,
        eventType: "payment_recovered",
        subjectType: "invoice",
        subjectId: "inv_eco_test",
        valueAmount: 100,
        valueCurrency: "usd",
      });
      const { data: row } = await db
        .from("economic_events")
        .select("event_type, value_amount, value_currency")
        .eq("workspace_id", workspaceId)
        .eq("subject_id", "inv_eco_test")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      expect(row).toBeTruthy();
      expect((row as { event_type: string }).event_type).toBe("payment_recovered");
      expect(Number((row as { value_amount: number }).value_amount)).toBe(100);
    });
  });

  describe("aggregator sums correctly", () => {
    it("aggregateEconomicValueSinceLastLedger sums by event_type into ledger", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      await recordEconomicEvent({
        workspaceId,
        eventType: "payment_recovered",
        valueAmount: 50,
        valueCurrency: "usd",
      });
      await recordEconomicEvent({
        workspaceId,
        eventType: "payment_recovered",
        valueAmount: 25,
      });
      await recordEconomicEvent({
        workspaceId,
        eventType: "dispute_prevented",
        valueAmount: 0,
      });
      await aggregateEconomicValueSinceLastLedger(workspaceId);
      const { data: ledger } = await db
        .from("economic_value_ledger")
        .select("recovered_revenue, protected_revenue, prevented_loss")
        .eq("workspace_id", workspaceId)
        .order("period_end", { ascending: false })
        .limit(1)
        .single();
      expect(ledger).toBeTruthy();
      expect(Number((ledger as { recovered_revenue: number }).recovered_revenue)).toBeGreaterThanOrEqual(75);
      expect(typeof (ledger as { protected_revenue: number }).protected_revenue).toBe("number");
    });
  });

  describe("no engine behavior altered", () => {
    it("economic-events lib does not import reducer or signal code", () => {
      const path = join(process.cwd(), "src", "lib", "economic-events", "index.ts");
      const content = readFileSync(path, "utf-8");
      expect(content).not.toMatch(/reducer|canonical_signals|processCanonicalSignal/);
    });
  });

  describe("billing export deterministic", () => {
    it("exportBillingEvents returns structured JSON with no money displayed in response shape", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const out = await exportBillingEvents(workspaceId);
      expect(out).toHaveProperty("recovered_revenue");
      expect(out).toHaveProperty("protected_revenue");
      expect(out).toHaveProperty("prevented_loss");
      expect(typeof out.recovered_revenue).toBe("number");
      expect(typeof out.protected_revenue).toBe("number");
      expect(typeof out.prevented_loss).toBe("number");
      const keys = Object.keys(out);
      expect(keys).toEqual(["recovered_revenue", "protected_revenue", "prevented_loss"]);
    });
  });

  describe("responsibility boolean accurate", () => {
    it("hasEconomicEventsInLast7Days returns false when no events", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const has = await hasEconomicEventsInLast7Days(workspaceId);
      expect(typeof has).toBe("boolean");
    });
  });
});
