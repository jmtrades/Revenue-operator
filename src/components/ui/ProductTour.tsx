"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type TourStep = {
  target: string;
  title: string;
  body: string;
};

export function ProductTour() {
  const pathname = usePathname();
  const t = useTranslations("productTour");
  const tCommon = useTranslations();

  const steps: TourStep[] = useMemo(
    () => [
      {
        target: "revenueMetric",
        title: t("revenue.title"),
        body: t("revenue.body"),
      },
      {
        target: "needsAttentionQueue",
        title: t("needsAttention.title"),
        body: t("needsAttention.body"),
      },
      {
        target: "sidebarNav",
        title: t("sidebarNav.title"),
        body: t("sidebarNav.body"),
      },
      {
        target: "sidebarCampaigns",
        title: t("campaigns.title"),
        body: t("campaigns.body"),
      },
      {
        target: "sidebarSettings",
        title: t("settings.title"),
        body: t("settings.body"),
      },
    ],
    [t],
  );

  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (pathname !== "/app/dashboard") return;

    let completed = false;
    try {
      completed = localStorage.getItem("rt_product_tour_completed") === "true";
    } catch {
      completed = false;
    }

    if (!completed) {
      setOpen(true);
      setStepIndex(0);
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const step = steps[stepIndex];
      if (!step) return;

      const el = document.querySelector(`[data-product-tour="${step.target}"]`) as HTMLElement | null;
      if (!el) return;

      // Keep the tour readable when the user is slightly scrolled.
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipWidth = 320;
      const preferredTop = rect.bottom + 12;
      const fallbackTop = rect.top - 12;
      const estimatedTooltipHeight = 170;

      const top = preferredTop + estimatedTooltipHeight < window.innerHeight ? preferredTop : fallbackTop;
      const left = Math.min(Math.max(rect.left + rect.width / 2, 16 + tooltipWidth / 2), window.innerWidth - 16 - tooltipWidth / 2);

      setTooltipPos({ top, left });
    };

    update();

    const onResize = () => update();
    window.addEventListener("resize", onResize);

    const main = document.getElementById("main");
    main?.addEventListener("scroll", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      main?.removeEventListener("scroll", onResize);
    };
  }, [open, stepIndex, steps]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem("rt_product_tour_completed", "true");
    } catch {
      // ignore
    }
  };

  const step = steps[stepIndex];
  const lastStep = stepIndex === steps.length - 1;

  if (!open || !step) return null;
  if (!targetRect) return null;

  const pad = 8;
  const highlightStyle = {
    top: targetRect.top - pad,
    left: targetRect.left - pad,
    width: targetRect.width + pad * 2,
    height: targetRect.height + pad * 2,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[999]"
        aria-hidden
        style={{ background: "rgba(0,0,0,0.18)" }}
        onClick={close}
      />

      <div
        className="fixed z-[1000] rounded-xl border-2"
        style={{
          ...highlightStyle,
          borderColor: "var(--accent-primary)",
          boxShadow: "0 0 0 6px rgba(13,110,110,0.12)",
          background: "rgba(255,255,255,0.01)",
          pointerEvents: "none",
        }}
      />

      <div
        className="fixed z-[1001] w-[320px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-2xl"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          transform: "translateX(-50%)",
        }}
        role="dialog"
        aria-label={step.title}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {step.title}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)", lineHeight: 1.55 }}>
              {step.body}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label={tCommon("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Step {stepIndex + 1} of {steps.length}
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => {
              if (lastStep) {
                close();
                return;
              }
              setStepIndex((i) => Math.min(i + 1, steps.length - 1));
            }}
          >
            {lastStep ? tCommon("common.close") : tCommon("common.next")}
          </Button>
        </div>
      </div>
    </>
  );
}

