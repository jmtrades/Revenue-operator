"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { X } from "lucide-react";
import { ROUTES } from "@/lib/constants";

const SESSION_KEY = "recall-touch-scroll-cta-shown";

export function ScrollDepthCTA() {
  const t = useTranslations("homepage.scrollCta");
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    const isMobile = window.innerWidth < 768;
    const scrollThreshold = isMobile ? 0.4 : 0.6; // 40% on mobile, 60% on desktop

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
        if (scrollPercent >= scrollThreshold) {
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
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-4 py-3 border-t sm:px-6"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
        minHeight: 56,
        animation: "slideUp 200ms ease-out",
      }}
    >
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <p className="text-sm font-medium text-center sm:text-left flex-1" style={{ color: "var(--text-primary)" }}>
        {t("message")}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={ROUTES.START}
          className="btn-marketing-primary px-4 py-2 text-sm rounded-lg no-underline shrink-0"
          onClick={dismiss}
        >
          {t("button")}
        </Link>
        <button
          type="button"
          aria-label={t("dismiss")}
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
