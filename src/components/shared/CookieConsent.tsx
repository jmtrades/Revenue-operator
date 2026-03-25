"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "rt_cookie_consent";

/**
 * Minimal GDPR cookie consent banner.
 * - Blocks PostHog/Vercel Analytics initialization until user accepts (via window.__RT_CONSENT__)
 * - Stores preference in localStorage
 * - Shows on first visit only; dismissible
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "declined") {
        // Already made a choice — set flag and don't show
        (window as unknown as Record<string, boolean>).__RT_CONSENT__ = stored === "accepted";
        return;
      }
    } catch {
      // localStorage unavailable
    }
    // No choice yet — show the banner
    setVisible(true);
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
      (window as unknown as Record<string, boolean>).__RT_CONSENT__ = true;
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "declined");
      (window as unknown as Record<string, boolean>).__RT_CONSENT__ = false;
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] px-4 py-3 sm:px-6 sm:py-4"
      style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--border-default)" }}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-sm flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          We use cookies for analytics and to improve your experience. See our{" "}
          <Link href="/privacy" className="underline" style={{ color: "var(--text-primary)" }}>
            privacy policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDecline}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
              background: "transparent",
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="btn-marketing-blue px-4 py-2 rounded-lg text-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
