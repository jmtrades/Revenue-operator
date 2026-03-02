/**
 * Shared Entry Protocol: external_ref, protocol_events, mirroring, public attestation, payment wiring.
 * G1 external_ref stable; G2 protocol_events append; G3 mirroring; G4 public attest no internals; G5 no new Stripe calls.
 */

import { describe, it, expect } from "vitest";
import {
  createSharedTransaction,
  createAcknowledgementToken,
  acknowledgeSharedTransaction,
  resolveWorkspaceByCounterparty,
  mirrorProtocolEventToCounterpartyWorkspace,
  getPublicEntryByExternalRef,
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

describe("Protocol handshake", () => {
  describe("G1 — external_ref exists and is stable", () => {
    it("create shared tx sets external_ref", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "g1-stable@example.com",
        subjectType: "booking",
        subjectId: "g1-subject",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { data: row } = await db
        .from("shared_transactions")
        .select("external_ref")
        .eq("id", txId)
        .single();
      expect(row).toBeTruthy();
      const externalRef = (row as { external_ref: string }).external_ref;
      expect(externalRef).toBeTruthy();
      expect(typeof externalRef).toBe("string");
      const { data: row2 } = await db
        .from("shared_transactions")
        .select("external_ref")
        .eq("id", txId)
        .single();
      expect((row2 as { external_ref: string }).external_ref).toBe(externalRef);
    });
  });

  describe("G2 — protocol_events append", () => {
    it("created, token_issued, acknowledged for same external_ref", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "g2-events@example.com",
        subjectType: "job",
        subjectId: "g2-job",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { data: txRow } = await db
        .from("shared_transactions")
        .select("external_ref")
        .eq("id", txId)
        .single();
      const externalRef = (txRow as { external_ref: string }).external_ref;
      await createAcknowledgementToken(txId!, 24);
      const result = await acknowledgeSharedTransaction(txId!, "confirm");
      expect(result.ok).toBe(true);
      const { data: events } = await db
        .from("protocol_events")
        .select("event_type, created_at")
        .eq("external_ref", externalRef)
        .order("created_at", { ascending: true });
      const types = (events ?? []).map((e: { event_type: string }) => e.event_type);
      expect(types).toContain("created");
      expect(types).toContain("token_issued");
      expect(types).toContain("acknowledged");
    });
  });

  describe("G3 — mirroring", () => {
    it("counterparty_identities maps identifier to workspace; mirror creates incoming_entries and mirrored event", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: workspaces } = await db.from("workspaces").select("id").limit(2);
      const ids = (workspaces ?? []).map((w: { id: string }) => w.id);
      if (ids.length < 2) return;
      const [_workspaceA, workspaceB] = ids;
      const identifier = `mirror-${Date.now()}@example.com`;
      await db.from("counterparty_identities").insert({
        workspace_id: workspaceB,
        identifier: identifier.toLowerCase(),
        identifier_type: "email",
      });
      const resolved = await resolveWorkspaceByCounterparty(identifier);
      expect(resolved).toBe(workspaceB);
      const externalRef = "mirror-test-" + Date.now();
      await mirrorProtocolEventToCounterpartyWorkspace(
        externalRef,
        workspaceB,
        "acknowledged",
        {}
      );
      const { data: mirrored } = await db
        .from("protocol_events")
        .select("id, event_type, workspace_id, payload")
        .eq("external_ref", externalRef)
        .eq("event_type", "mirrored")
        .eq("workspace_id", workspaceB)
        .maybeSingle();
      expect(mirrored).toBeTruthy();
      expect((mirrored as { payload: { original_event_type?: string } }).payload?.original_event_type).toBe(
        "acknowledged"
      );
      const { data: entry } = await db
        .from("incoming_entries")
        .select("external_ref, state, workspace_id")
        .eq("workspace_id", workspaceB)
        .eq("external_ref", externalRef)
        .maybeSingle();
      expect(entry).toBeTruthy();
      expect((entry as { state: string }).state).toBe("normal");
    });
  });

  describe("G4 — public attest", () => {
    it("GET /api/public/entries/:external_ref shape: minimal fields, no internal ids", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "g4-attest@example.com",
        subjectType: "payment",
        subjectId: "g4-pay",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { data: txRow } = await db
        .from("shared_transactions")
        .select("external_ref")
        .eq("id", txId)
        .single();
      const externalRef = (txRow as { external_ref: string }).external_ref;
      const entry = await getPublicEntryByExternalRef(externalRef);
      expect(entry).toBeTruthy();
      expect(entry).toHaveProperty("external_ref", externalRef);
      expect(entry).toHaveProperty("subject_type");
      expect(entry).toHaveProperty("state");
      expect(entry).toHaveProperty("last_event_type");
      expect(entry).toHaveProperty("last_event_at");
      const keys = Object.keys(entry!);
      expect(keys).not.toContain("workspace_id");
      expect(keys).not.toContain("lead_id");
      expect(keys).not.toContain("conversation_id");
      expect(keys).not.toContain("id");
      expect(keys).toEqual(["external_ref", "subject_type", "state", "last_event_type", "last_event_at"]);
    });
  });

  describe("G5 — payment wiring uses webhook payload only", () => {
    it("invoice.created and invoice.payment_failed handlers do not add Stripe API calls", () => {
      const path = join(process.cwd(), "src", "app", "api", "billing", "webhook", "route.ts");
      const content = readFileSync(path, "utf-8");
      const createdMatch = content.match(/case "invoice\.created":\s*\{([\s\S]*?)\n\s*break;\s*\}/);
      const failedMatch = content.match(/case "invoice\.payment_failed":\s*\{([\s\S]*?)\n\s*break;\s*\}/);
      expect(createdMatch).toBeTruthy();
      expect(failedMatch).toBeTruthy();
      const createdBody = createdMatch![1];
      const failedBody = failedMatch![1];
      expect(createdBody).not.toMatch(/stripe\.\w+/);
      expect(failedBody).not.toMatch(/stripe\.\w+/);
    });
  });
});
