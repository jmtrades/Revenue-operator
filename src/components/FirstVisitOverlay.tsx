"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "revenue_first_visit_overlay_seen";

export function FirstVisitOverlay() {
  const [visible, setVisible] = useState(false);
  const [showLiveSim, setShowLiveSim] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShowLiveSim(true), 2000);
    return () => clearTimeout(t);
  }, [visible]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(14, 17, 22, 0.92)" }}
    >
      <div
        className="max-w-md w-full p-8 rounded-2xl shadow-xl"
        style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}
      >
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>You don&apos;t manage this system.</h2>
        <p className="text-base leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>
          It maintains conversations for you.
        </p>
        <p className="text-base font-medium mb-6" style={{ color: "var(--meaning-green)" }}>
          You only take the calls.
        </p>
        {showLiveSim && (
          <div className="space-y-2 mb-6">
            <div
              className="py-2 px-3 rounded-lg text-sm"
              style={{ background: "rgba(46, 204, 113, 0.1)", color: "var(--meaning-green)", borderWidth: "1px", borderColor: "rgba(46, 204, 113, 0.3)" }}
            >
              Response prepared
            </div>
            <div
              className="py-2 px-3 rounded-lg text-sm"
              style={{ background: "rgba(46, 204, 113, 0.1)", color: "var(--meaning-green)", borderWidth: "1px", borderColor: "rgba(46, 204, 113, 0.3)" }}
            >
              Follow-up scheduled
            </div>
          </div>
        )}
        <button
          onClick={dismiss}
          className="w-full py-3 rounded-lg font-medium"
          style={{ background: "var(--meaning-green)", color: "#0E1116" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
