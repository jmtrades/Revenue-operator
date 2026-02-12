"use client";

import { useState, useEffect } from "react";

/**
 * Offline mode detection and banner.
 * Shows "Connection lost — protection continues. Reconnecting…"
 * Auto-removes when connection restored.
 */

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Check initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="px-4 py-2.5 border-b text-sm text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
      <span className="inline-block w-2 h-2 rounded-full mr-2 animate-pulse" style={{ background: "var(--meaning-amber)" }} aria-hidden />
      <span style={{ color: "var(--text-secondary)" }}>
        Connection lost — protection continues. Reconnecting…
      </span>
    </div>
  );
}
