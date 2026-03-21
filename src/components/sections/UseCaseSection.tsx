"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PhoneIncoming, PhoneOutgoing, Brain } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const CASE_IDS = ["inbound", "outbound", "intelligence"] as const;
const ICONS = [PhoneIncoming, PhoneOutgoing, Brain];

export function UseCaseSection() {
  const t = useTranslations("homepage.useCaseSection");
  const cases = useMemo(
    () =>
      CASE_IDS.map((id, i) => ({
        title: t(`cases.${id}.title`),
        desc: t(`cases.${id}.desc`),
        icon: ICONS[i],
      })),
    [t]
  );

  return (
    <section className="py-16 px-6" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: "var(--text-primary)" }}>
          {t("heading")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {cases.map((uc) => (
            <div
              key={uc.title}
              className="rounded-xl p-6 border"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
            >
              <uc.icon className="w-6 h-6 text-[var(--text-tertiary)] mb-3" />
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                {uc.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{uc.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center bg-white text-black font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-colors"
          >
            {t("cta.button")}
          </Link>
        </p>
      </Container>
    </section>
  );
}
