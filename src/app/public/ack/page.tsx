"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

function PublicAckContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [_action, setAction] = useState<"confirm" | "reschedule" | "dispute" | null>(null);
  const [newDeadline, setNewDeadline] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (a: "confirm" | "reschedule" | "dispute") => {
      if (!token || submitting) return;
      setSubmitting(true);
      setResult(null);
      try {
        const body: Record<string, string> = { token, action: a };
        if (a === "reschedule" && newDeadline) body.new_deadline = newDeadline;
        if (a === "dispute" && disputeReason) body.dispute_reason = disputeReason;
        const res = await fetch("/api/public/shared-transactions/acknowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setResult(Boolean(data?.ok));
        setAction(a);
      } catch {
        setResult(false);
      } finally {
        setSubmitting(false);
      }
    },
    [token, submitting, newDeadline, disputeReason]
  );

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-950 p-6">
        <p className="text-stone-400">Acknowledgement</p>
      </main>
    );
  }

  if (result === true) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-950 p-6">
        <p className="text-stone-400">Entry stored.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-950 p-6">
      <h1 className="text-stone-300 text-lg font-medium mb-6">Acknowledgement</h1>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={() => submit("confirm")}
          disabled={submitting}
          className="rounded border border-stone-600 bg-stone-800 text-stone-200 px-4 py-2 text-sm disabled:opacity-50"
        >
          Confirm
        </button>
        <div className="flex flex-col gap-1">
          <label htmlFor="new_deadline" className="text-stone-500 text-xs">
            New deadline
          </label>
          <input
            id="new_deadline"
            type="datetime-local"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="rounded border border-stone-600 bg-stone-900 text-stone-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => submit("reschedule")}
            disabled={submitting}
            className="rounded border border-stone-600 bg-stone-800 text-stone-200 px-4 py-2 text-sm disabled:opacity-50"
          >
            Reschedule
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Reason"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="rounded border border-stone-600 bg-stone-900 text-stone-200 px-3 py-2 text-sm placeholder-stone-500"
          />
          <button
            type="button"
            onClick={() => submit("dispute")}
            disabled={submitting}
            className="rounded border border-stone-600 bg-stone-800 text-stone-200 px-4 py-2 text-sm disabled:opacity-50"
          >
            Dispute
          </button>
        </div>
      </div>
      {result === false && (
        <p className="mt-4 text-stone-500 text-sm">Acknowledgement</p>
      )}
    </main>
  );
}

export default function PublicAckPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-stone-950 p-6"><p className="text-stone-400">Acknowledgement</p></main>}>
      <PublicAckContent />
    </Suspense>
  );
}
