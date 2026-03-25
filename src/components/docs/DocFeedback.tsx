"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface DocFeedbackProps {
  sectionId: string;
}

export function DocFeedback({ sectionId }: DocFeedbackProps) {
  const [sent, setSent] = useState<"yes" | "no" | null>(null);

  const send = (value: "yes" | "no") => {
    if (sent) return;
    setSent(value);
    try {
      const w = typeof window !== "undefined" ? window : undefined;
      const gtag = w && "gtag" in w ? (w as { gtag: (a: string, b: string, c: Record<string, string>) => void }).gtag : undefined;
      if (gtag) gtag("event", "docs_feedback", { section_id: sectionId, helpful: value });
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-6 pt-4 border-t border-[var(--border-default)]" data-doc-feedback={sectionId}>
      <p className="text-sm text-[var(--text-tertiary)] mb-2">Was this helpful?</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => send("yes")}
          disabled={sent !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-white hover:border-[var(--border-default)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          aria-pressed={sent === "yes"}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Yes
        </button>
        <button
          type="button"
          onClick={() => send("no")}
          disabled={sent !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-white hover:border-[var(--border-default)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          aria-pressed={sent === "no"}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          No
        </button>
      </div>
      {sent && (
        <p className="text-xs text-[var(--text-tertiary)] mt-2">Thanks for your feedback.</p>
      )}
    </div>
  );
}
