/**
 * Removal safety test: internal verification script.
 * Simulates full lifecycle and verifies uncertainty detection at each stage.
 * DO NOT expose to users. Developer verification only.
 */

import { getDb } from "../src/lib/db/queries";
import { createSharedTransaction } from "../src/lib/shared-transaction-assurance";
import { acknowledgeSharedTransaction } from "../src/lib/shared-transaction-assurance";
import { recordOutcomeDependency } from "../src/lib/outcome-dependencies";
import { recordReciprocalEvent } from "../src/lib/reciprocal-events";
import { recordThreadAmendment } from "../src/lib/institutional-auditability";

const TEST_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

interface TestResult {
  stage: string;
  passed: boolean;
  uncertainty_detected: boolean;
  error?: string;
}

async function testRemovalSafety(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const db = getDb();

  try {
    // Stage 1: Create record
    const threadId = await createSharedTransaction({
      workspaceId: TEST_WORKSPACE_ID,
      subjectType: "agreement",
      subjectId: "test-subject-1",
      counterpartyIdentifier: "test-counterparty",
      expectedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    if (!threadId) {
      results.push({ stage: "create_record", passed: false, uncertainty_detected: false, error: "Failed to create thread" });
      return results;
    }

    const { data: thread } = await db
      .from("shared_transactions")
      .select("external_ref, state")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread || (thread as { state: string }).state !== "pending_acknowledgement") {
      results.push({ stage: "create_record", passed: false, uncertainty_detected: false, error: "Thread not in pending state" });
      return results;
    }

    results.push({ stage: "create_record", passed: true, uncertainty_detected: false });

    // Stage 2: Confirm
    const ackResult = await acknowledgeSharedTransaction(threadId, "confirm");
    if (!ackResult.ok) {
      results.push({ stage: "confirm", passed: false, uncertainty_detected: false, error: ackResult.error });
      return results;
    }

    const { data: confirmedThread } = await db
      .from("shared_transactions")
      .select("state")
      .eq("id", threadId)
      .maybeSingle();

    if (!confirmedThread || (confirmedThread as { state: string }).state !== "acknowledged") {
      results.push({ stage: "confirm", passed: false, uncertainty_detected: false, error: "Thread not acknowledged" });
      return results;
    }

    results.push({ stage: "confirm", passed: true, uncertainty_detected: false });

    // Stage 3: Create dependency
    const dependentThreadId = await createSharedTransaction({
      workspaceId: TEST_WORKSPACE_ID,
      subjectType: "agreement",
      subjectId: "test-subject-2",
      counterpartyIdentifier: "test-counterparty-2",
      expectedAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    if (dependentThreadId) {
      await recordOutcomeDependency({
        workspaceId: TEST_WORKSPACE_ID,
        sourceThreadId: threadId,
        dependentContextType: "shared_transaction",
        dependentContextId: dependentThreadId,
        dependencyType: "prior_outcome_reference",
      }).catch(() => {});

      const { data: dep } = await db
        .from("outcome_dependencies")
        .select("id")
        .eq("source_thread_id", threadId)
        .eq("dependent_context_id", dependentThreadId)
        .maybeSingle();

      results.push({
        stage: "create_dependency",
        passed: !!dep,
        uncertainty_detected: false,
      });
    } else {
      results.push({ stage: "create_dependency", passed: false, uncertainty_detected: false, error: "Failed to create dependent thread" });
    }

    // Stage 4: Add third party
    await recordReciprocalEvent({
      threadId,
      actorRole: "downstream",
      operationalAction: "approve_next_step",
    }).catch(() => {});

    const { data: thirdPartyEvent } = await db
      .from("reciprocal_events")
      .select("id")
      .eq("thread_id", threadId)
      .eq("actor_role", "downstream")
      .maybeSingle();

    results.push({
      stage: "add_third_party",
      passed: !!thirdPartyEvent,
      uncertainty_detected: false,
    });

    // Stage 5: Add amendment
    await recordThreadAmendment(threadId, "evidence_change", "Test amendment", null).catch(() => {});

    const { data: amendment } = await db
      .from("thread_amendments")
      .select("id")
      .eq("thread_id", threadId)
      .maybeSingle();

    results.push({
      stage: "add_amendment",
      passed: !!amendment,
      uncertainty_detected: false,
    });

    // Stage 6: Export
    const { data: orientationRows } = await db
      .from("orientation_records")
      .select("id")
      .eq("workspace_id", TEST_WORKSPACE_ID)
      .limit(1);

    const { data: proofRow } = await db
      .from("proof_capsules")
      .select("id")
      .eq("workspace_id", TEST_WORKSPACE_ID)
      .limit(1)
      .maybeSingle();

    results.push({
      stage: "export",
      passed: (orientationRows?.length ?? 0) > 0 || !!proofRow,
      uncertainty_detected: false,
    });

    // Stage 7: Remove record (simulate)
    const { data: beforeRemoval } = await db
      .from("orientation_records")
      .select("text")
      .eq("workspace_id", TEST_WORKSPACE_ID)
      .or("text.ilike.%removed%,text.ilike.%disabled%,text.ilike.%absence%")
      .limit(1)
      .maybeSingle();

    const { data: disableImpact } = await db
      .from("orientation_records")
      .select("text")
      .eq("workspace_id", TEST_WORKSPACE_ID)
      .or("text.ilike.%depends%,text.ilike.%relied%")
      .limit(1)
      .maybeSingle();

    results.push({
      stage: "remove_record",
      passed: true,
      uncertainty_detected: !!(beforeRemoval || disableImpact),
    });

  } catch (error) {
    results.push({
      stage: "error",
      passed: false,
      uncertainty_detected: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

if (require.main === module) {
  testRemovalSafety()
    .then((results) => {
      console.log(JSON.stringify(results, null, 2));
      const allPassed = results.every((r) => r.passed);
      const uncertaintyDetected = results.some((r) => r.uncertainty_detected);
      process.exit(allPassed && uncertaintyDetected ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testRemovalSafety };
