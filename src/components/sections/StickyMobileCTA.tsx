"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

/**
 * Sticky bottom CTA bar for mobile.
 * Shows after user scrolls past the hero (~600px).
 * Hides when footer is visible.
 * This is the #1 conversion lever for mobile SaaS sites.
 */
export function StickyMobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const distanceFromBottom = docHeight - scrollY - viewportHeight;

        // Show after scrolling 600px, hide near footer (last 400px)
        setVisible(scrollY > 600 && distanceFromBottom > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-area-pb"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 300ms cubic-bezier(0.32, 0.72, 0, 1)",
        background: "var(--bg-primary)",
        borderTop: "1px solid var(--border-default)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            14-day free trial
          </p>
          <p className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
            No credit card required
          </p>
        </div>
        <Link
          href={ROUTES.START}
          className="btn-marketing-blue px-5 py-2.5 text-sm whitespace-nowrap no-underline flex items-center gap-1.5 shrink-0 active:scale-[0.97]"
        >
          Start free
          <ArrowRight className="w-3.5 h-3.5" style={{ transition: "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)" }} />
        </Link>
      </div>
    </div>
  );
}
