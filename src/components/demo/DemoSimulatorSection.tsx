"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";

const CallSimulator = dynamic(
  () => import("@/components/demo/CallSimulator").then((m) => ({ default: m.CallSimulator })),
  {
    ssr: false,
    loading: () => <DemoSimulatorLoading />,
  }
);

function DemoSimulatorLoading() {
  const t = useTranslations("hero");
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 min-h-[280px] flex items-center justify-center">
      <p className="text-sm text-zinc-500">{t("simulator.loading")}</p>
    </div>
  );
}

export function DemoSimulatorSection() {
  const t = useTranslations("hero");
  return (
    <section className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
            {t("simulator.conversationPreview")}
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {t("simulator.subtitle")}
          </h2>
          <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t("simulator.disclaimer")}
          </p>
        </div>
        <CallSimulator />
      </Container>
    </section>
  );
}
