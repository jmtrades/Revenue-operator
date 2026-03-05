"use client";

import { useEffect } from "react";

/**
 * Unregister any existing service workers to avoid stale chunks from old deploys (hydration #418).
 */
export function SwCleanup() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });
  }, []);
  return null;
}
