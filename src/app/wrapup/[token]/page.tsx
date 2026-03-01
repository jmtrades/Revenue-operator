"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function WrapupPage() {
  const params = useParams();
  const token = params.token as string | undefined;
  const [status, setStatus] = useState<"loading" | "form" | "invalid" | "used" | "expired" | "done">(() => (!token ? "invalid" : "loading"));
  const [outcome, setOutcome] = useState<"interested" | "thinking" | "not_fit" | "">("");
  const [objectionText, setObjectionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/wrapup/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setStatus("form");
        else if (d.reason === "used") setStatus("used");
        else if (d.reason === "expired") setStatus("expired");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const submit = async () => {
    if (!outcome || !token) return;
    setSubmitting(true);
    const res = await fetch("/api/wrapup/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, outcome, objection_text: objectionText || undefined }),
    });
    setSubmitting(false);
    if (res.ok) setStatus("done");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-4">
        <p style={{ color: "var(--text-secondary)" }}>One moment…</p>
      </div>
    );
  }
  if (status === "invalid" || status === "used" || status === "expired") {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-100 mb-2">Call Wrap-Up</h1>
          <p className="text-stone-400">
            {status === "invalid" && "This link is invalid."}
            {status === "used" && "This wrap-up has already been submitted."}
            {status === "expired" && "This link has expired."}
          </p>
        </div>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-stone-100 mb-2">Thanks</h1>
          <p className="text-stone-400">Your wrap-up was submitted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-stone-100 mb-2">Call Wrap-Up</h1>
        <p className="text-sm text-stone-400 mb-6">How did the call go?</p>
        <div className="space-y-3 mb-6">
          {(["interested", "thinking", "not_fit"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOutcome(o)}
              className={`w-full px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors ${
                outcome === o
                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                  : "border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-600"
              }`}
            >
              {o === "interested" && "✅ Interested / next step"}
              {o === "thinking" && "🟡 Thinking / follow up"}
              {o === "not_fit" && "❌ Not a fit"}
            </button>
          ))}
        </div>
        <div className="mb-6">
          <label className="block text-sm text-stone-400 mb-1">Key objection (optional)</label>
          <input
            type="text"
            value={objectionText}
            onChange={(e) => setObjectionText(e.target.value)}
            placeholder="e.g. budget, timing..."
            className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-200 placeholder-stone-500"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!outcome || submitting}
          className="w-full px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-medium"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
