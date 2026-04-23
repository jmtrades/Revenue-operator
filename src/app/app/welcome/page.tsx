import { Suspense } from "react";
import { WelcomeScreen } from "./WelcomeScreen";

export const dynamic = "force-dynamic";

/**
 * Post-activation wayfinding landing.
 *
 * Rendered at /app/welcome?from=activate after the wizard finishes. The goal
 * is to answer three questions in under 5 seconds:
 *   1. Did my agent go live? (confirmation)
 *   2. Is anything still pending on my side? (persona-aware checklist)
 *   3. What's the one thing I should do right now? (primary CTA)
 *
 * This page replaces the previously-broken redirect to /app/activity (which
 * 404'd). It's intentionally static so it renders instantly; the live status
 * chip hydrates client-side.
 */
export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-base)]" />}>
      <WelcomeScreen />
    </Suspense>
  );
}
