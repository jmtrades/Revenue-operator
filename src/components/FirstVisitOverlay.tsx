"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "revenue_first_visit_overlay_seen";

export function FirstVisitOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-sm">
      <div className="max-w-md w-full p-6 rounded-2xl bg-stone-900 border border-stone-700 shadow-xl">
        <h2 className="text-lg font-semibold text-stone-50 mb-2">You&apos;re set</h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-6">
          You don&apos;t need to manage the system. We handle outreach, follow-ups, and reminders.
          <br />
          <span className="text-amber-400 font-medium">You only need to take calls.</span>
        </p>
        <p className="text-stone-500 text-xs mb-6">
          Check this dashboard anytime to see what we&apos;re doing. Activity appears as we work.
        </p>
        <button
          onClick={dismiss}
          className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
