"use client";

import Link from "next/link";
import { useWorkspace } from "./WorkspaceContext";

interface NextActionData {
  href?: string;
  label?: string;
}

/**
 * Single primary next-action link. No secondary CTAs. No metrics. No help text.
 * Data comes exclusively from resolveNextAction (passed from parent).
 */
export function OperatorStartCard({ nextAction }: { nextAction: NextActionData | null }) {
  const { workspaceId } = useWorkspace();
  if (!nextAction?.href || !nextAction?.label) return null;

  return (
    <section className="rounded-lg p-6" style={{ borderColor: "var(--border)" }}>
      <Link
        href={nextAction.href + (workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "")}
        className="btn-primary block w-full max-w-[320px] mx-auto focus-ring"
      >
        {nextAction.label}
      </Link>
    </section>
  );
}
