"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ROUTES } from "@/lib/constants";

const SESSION_KEY = "recall-touch-scroll-cta-shown";

export function ScrollDepthCTA() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    if (window.innerWidth < 768) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) {
          ticking = false;
          return;
        }
        const scrollPercent = window.scrollY / scrollHeight;
        if (scrollPercent >= 0.6) {
          setVisible(true);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mounted]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-4 py-3 border-t md:px-6"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
        height: 56,
        animation: "slideUp 200ms ease-out",
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        Ready to govern your calls?
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.START}
          className="btn-marketing-primary px-4 py-2 text-sm rounded-lg no-underline shrink-0"
          onClick={dismiss}
        >
          Start free →
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="p-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          style={{ color: "var(--text-tertiary)" }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
