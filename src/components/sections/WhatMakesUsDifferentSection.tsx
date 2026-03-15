"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { X, Voicemail, CheckCircle2 } from "lucide-react";

export function WhatMakesUsDifferentSection() {
  const t = useTranslations("homepage.difference");
  const rows = useMemo(
    () => [
      {
        icon: X,
        label: t("rows.manual.label"),
        items: [t("rows.manual.i1"), t("rows.manual.i2"), t("rows.manual.i3")],
        color: "text-red-400",
      },
      {
        icon: Voicemail,
        label: t("rows.generic.label"),
        items: [t("rows.generic.i1"), t("rows.generic.i2"), t("rows.generic.i3")],
        color: "text-amber-400",
      },
      {
        icon: CheckCircle2,
        label: t("rows.recallTouch.label"),
        items: [t("rows.recallTouch.i1"), t("rows.recallTouch.i2"), t("rows.recallTouch.i3")],
        color: "text-emerald-400",
      },
    ],
    [t]
  );

  return (
    <section
      className="py-16 md:py-20 border-t border-white/[0.06]"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <div className="max-w-3xl mb-10">
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            {t("heading")}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {t("subheading")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rows.map(({ icon: Icon, label, items, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ${color}`}>
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-white">{label}</h3>
              </div>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
