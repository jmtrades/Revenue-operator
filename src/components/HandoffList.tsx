"use client";

import Link from "next/link";

/**
 * Handoff cards: who, when, decision_needed + Open. No previews, no counts.
 * Doctrine: authority boundary (Outside authority. / Within authority.)
 */

export interface HandoffItem {
  id: string;
  lead_id: string;
  who: string;
  when: string;
  decision_needed: string;
}

interface HandoffListProps {
  handoffs: HandoffItem[];
  /** When 5+, show this heading and list; otherwise 1–4 show stacked cards */
  heading?: string;
  /** When true and handoffs exist, show one muted line: Beyond scope. Never explain. */
  beyondScope?: boolean;
}

export function HandoffList({ handoffs, heading = "Outside authority.", beyondScope }: HandoffListProps) {
  if (handoffs.length === 0) return null;

  const isSeveral = handoffs.length >= 5;
  const displayList = isSeveral ? handoffs : handoffs;

  return (
    <section>
      <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
        Outside authority.
      </p>
      {beyondScope && (
        <p className="text-sm mb-4 -mt-2" style={{ color: "var(--text-muted)" }}>
          Beyond scope.
        </p>
      )}
      {isSeveral ? (
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          Multiple items exist outside authority.
        </h2>
      ) : handoffs.length > 1 ? (
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
          {heading}
        </h2>
      ) : null}
      <div className="space-y-3">
        {displayList.map((h) => (
          <div
            key={h.id}
            className="py-4 px-5 flex items-center justify-between gap-4 border-b last:border-b-0"
            style={{
              borderColor: "var(--border)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {h.who || "Unnamed"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {h.decision_needed || "Outside authority."}
              </p>
            </div>
            <Link
              href={`/dashboard/record/lead/${h.lead_id}`}
              className="shrink-0 text-sm font-medium focus-ring rounded-lg px-3 py-2"
              style={{ color: "var(--meaning-blue)" }}
            >
              Enter outcome
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
