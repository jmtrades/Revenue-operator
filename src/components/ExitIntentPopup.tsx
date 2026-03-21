"use client";

import { useState, useEffect } from "react";
import { X, Phone } from "lucide-react";

const SESSION_KEY = "recall-touch-exit-intent-shown";

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    // Check if already shown in this session
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Mobile: 30-second timer
      const timer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem(SESSION_KEY, "1");
      }, 30000);

      return () => clearTimeout(timer);
    } else {
      // Desktop: exit-intent detection
      const handleMouseLeave = (e: MouseEvent) => {
        // Check if mouse is leaving from top of viewport
        if (e.clientY <= 0) {
          setVisible(true);
          sessionStorage.setItem(SESSION_KEY, "1");
        }
      };

      document.addEventListener("mouseleave", handleMouseLeave);
      return () => document.removeEventListener("mouseleave", handleMouseLeave);
    }
  }, [mounted]);

  const dismiss = () => {
    setVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: "exit-intent",
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setEmail("");
        setTimeout(() => {
          dismiss();
        }, 2000);
      }
    } catch {
      // Silently handle — popup is best-effort
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={dismiss}
        style={{
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 z-50 w-full max-w-md mx-4 rounded-2xl border shadow-2xl transform transition-all"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-default)",
          transform: visible ? "translate(-50%, -50%)" : "translate(-50%, calc(-50% + 20px))",
          opacity: visible ? 1 : 0,
          transitionDuration: "300ms",
        }}
      >
        <div className="p-6 md:p-8">
          {/* Close button */}
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-4 right-4 p-2 rounded-lg transition-colors hover:bg-opacity-10"
            style={{
              color: "var(--text-tertiary)",
              background: "transparent",
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {!submitted ? (
            <>
              {/* Icon */}
              <div className="mb-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <Phone className="w-6 h-6" />
                </div>
              </div>

              {/* Headline */}
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Wait — Don't Leave Revenue on the Table
              </h2>

              {/* Subtext */}
              <p
                className="text-base mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                Get a free phone audit + 14-day trial. No credit card required.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border text-sm transition-colors focus:outline-none"
                  style={{
                    background: "var(--bg-primary)",
                    borderColor: "var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "var(--accent-primary)",
                    color: "var(--text-on-accent)",
                  }}
                >
                  {loading ? "Sending..." : "Get My Free Audit"}
                </button>
              </form>

              {/* Secondary text */}
              <p
                className="text-xs text-center mt-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Takes 30 seconds. Unsubscribe anytime.
              </p>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="text-center py-6">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--accent-primary)",
                  }}
                >
                  <Phone className="w-6 h-6" />
                </div>
                <h3
                  className="text-xl font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Check Your Email
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  We've sent you the details for your free phone audit and trial access.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
