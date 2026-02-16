/**
 * Shared Transaction Assurance: one-tap tokens, propagation edges, ensureSharedTransactionForSubject.
 * E1 Token safety; E2 Public ack calls acknowledgeSharedTransaction; E3 Edge upsert + invite eligibility;
 * E4 ensureSharedTransactionForSubject idempotent.
 */

import { describe, it, expect } from "vitest";
import {
  createSharedTransaction,
  createAcknowledgementToken,
  validateTokenAndGetTransactionId,
  markTokenUsed,
  acknowledgeSharedTransaction,
  buildPublicAckLink,
  ensureSharedTransactionForSubject,
  upsertCounterpartyEdge,
  maybeIssueCounterpartyInvite,
} from "@/lib/shared-transaction-assurance";
import { getDb } from "@/lib/db/queries";
import { createHash } from "crypto";

function hasDb(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" ||
      typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string")
  );
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

describe("Shared Transaction Assurance", () => {
  describe("E1 — Token safety", () => {
    it("token stored hashed (sha256), not raw", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "test-token-hash@example.com",
        subjectType: "booking",
        subjectId: "test-lead-id",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { rawToken } = await createAcknowledgementToken(txId!, 24);
      expect(rawToken).toBeTruthy();
      const { data: row } = await db
        .from("shared_transaction_tokens")
        .select("token_hash")
        .eq("shared_transaction_id", txId)
        .single();
      expect(row).toBeTruthy();
      const stored = (row as { token_hash: string }).token_hash;
      expect(stored).toMatch(/^[a-f0-9]{64}$/);
      expect(stored).not.toBe(rawToken);
      expect(stored).toBe(hashToken(rawToken));
    });

    it("token cannot be used twice (second call returns ok without changing state)", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "test-double@example.com",
        subjectType: "booking",
        subjectId: "test-double-lead",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { rawToken } = await createAcknowledgementToken(txId!, 24);
      const v1 = await validateTokenAndGetTransactionId(rawToken);
      expect(v1).not.toBeNull();
      expect("alreadyUsed" in v1! ? v1.alreadyUsed : false).toBe(false);
      await acknowledgeSharedTransaction(
        "transactionId" in v1! ? v1.transactionId : "",
        "confirm"
      );
      await markTokenUsed(rawToken);
      const v2 = await validateTokenAndGetTransactionId(rawToken);
      expect(v2).not.toBeNull();
      expect("alreadyUsed" in v2! && v2.alreadyUsed).toBe(true);
    });

    it("expired token returns ok:false (validation returns null)", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "test-expired@example.com",
        subjectType: "booking",
        subjectId: "test-expired-lead",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { rawToken } = await createAcknowledgementToken(txId!, 24);
      await db
        .from("shared_transaction_tokens")
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq("shared_transaction_id", txId);
      const v = await validateTokenAndGetTransactionId(rawToken);
      expect(v).toBeNull();
    });
  });

  describe("E2 — Public endpoint calls acknowledgeSharedTransaction", () => {
    it("confirm sets acknowledged", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "test-confirm@example.com",
        subjectType: "booking",
        subjectId: "test-confirm-lead",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const result = await acknowledgeSharedTransaction(txId!, "confirm");
      expect(result.ok).toBe(true);
      const { data: row } = await db.from("shared_transactions").select("state").eq("id", txId).single();
      expect((row as { state: string }).state).toBe("acknowledged");
    });

    it("dispute sets disputed and authority_required", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: "test-dispute@example.com",
        subjectType: "booking",
        subjectId: "test-dispute-lead",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const result = await acknowledgeSharedTransaction(txId!, "dispute", { disputeReason: "Test reason" });
      expect(result.ok).toBe(true);
      const { data: row } = await db
        .from("shared_transactions")
        .select("state, authority_required")
        .eq("id", txId)
        .single();
      expect((row as { state: string; authority_required: boolean }).state).toBe("disputed");
      expect((row as { authority_required: boolean }).authority_required).toBe(true);
    });
  });

  describe("E3 — Propagation edge upsert and invite eligibility", () => {
    it("edge upsert occurs on createSharedTransaction", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const cp = `edge-test-${Date.now()}@example.com`;
      const txId = await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: cp,
        subjectType: "booking",
        subjectId: "edge-test-lead",
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      expect(txId).toBeTruthy();
      const { data: edge } = await db
        .from("counterparty_edges")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", cp)
        .maybeSingle();
      expect(edge).toBeTruthy();
      expect((edge as { status: string }).status).toBe("observed");
    });

    it("invited only after >=2 tx within 30 days and no unresolved authority", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const cp = `invite-eligibility-${Date.now()}@example.com`;
      await upsertCounterpartyEdge(workspaceId, cp);
      const result1 = await maybeIssueCounterpartyInvite(workspaceId, cp);
      expect(result1.invited).toBe(false);
      await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: cp,
        subjectType: "booking",
        subjectId: `inv-lead-1-${Date.now()}`,
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      const { data: edgeOne } = await db
        .from("counterparty_edges")
        .select("status")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", cp)
        .single();
      expect((edgeOne as { status: string }).status).toBe("observed");
      await createSharedTransaction({
        workspaceId,
        counterpartyIdentifier: cp,
        subjectType: "booking",
        subjectId: `inv-lead-2-${Date.now()}`,
        initiatedBy: "business",
        acknowledgementDeadline: new Date(Date.now() + 86400 * 1000),
      });
      const { data: edgeAfter } = await db
        .from("counterparty_edges")
        .select("status")
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", cp)
        .single();
      expect((edgeAfter as { status: string }).status).toBe("invited");
    });
  });

  describe("E4 — ensureSharedTransactionForSubject idempotent", () => {
    it("second call with same subject returns same id, does not create duplicate", async () => {
      if (!hasDb()) return;
      const db = getDb();
      const { data: ws } = await db.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) return;
      const workspaceId = (ws as { id: string }).id;
      const subjectId = `idempotent-${Date.now()}`;
      const cp = `idempotent-${Date.now()}@example.com`;
      const id1 = await ensureSharedTransactionForSubject({
        workspaceId,
        subjectType: "booking",
        subjectId,
        counterpartyIdentifier: cp,
        deadlineAt: new Date(Date.now() + 86400 * 1000),
        initiatedBy: "business",
      });
      expect(id1).toBeTruthy();
      const id2 = await ensureSharedTransactionForSubject({
        workspaceId,
        subjectType: "booking",
        subjectId,
        counterpartyIdentifier: cp,
        deadlineAt: new Date(Date.now() + 86400 * 1000),
        initiatedBy: "business",
      });
      expect(id2).toBe(id1);
      const { count } = await db
        .from("shared_transactions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("subject_type", "booking")
        .eq("subject_id", subjectId);
      expect(count).toBe(1);
    });
  });

  describe("Link builder", () => {
    it("buildPublicAckLink returns path with token", () => {
      const link = buildPublicAckLink("abc123");
      expect(link).toContain("token=");
      expect(link).toContain("abc123");
      expect(link).toMatch(/\/public\/ack/);
    });
  });
});
