"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, Headphones } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { VoicePreviewWidget } from "@/components/VoicePreviewWidget";
import { ROUTES } from "@/lib/constants";

export function HomepageVoicePreview() {
  const t = useTranslations("homepage.voicePreview");
  return (
    <section
      className="marketing-section py-16 md:py-24"
      style={{ background: "var(--bg-primary)" }}
    >
      <Container>
        <AnimateOnScroll className="text-center mb-10">
          <p
            className="eyebrow-editorial mb-5"
            style={{ color: "var(--accent-primary)" }}
          >
            {t("label")}
          </p>
          <h2
            className="font-editorial max-w-2xl mx-auto"
            style={{
              fontSize: "clamp(2rem, 4vw, 3.25rem)",
              color: "var(--text-primary)",
            }}
          >
            {t("title")}
          </h2>
          <p
            className="text-base md:text-lg max-w-xl mx-auto mt-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("description")}
          </p>
        </AnimateOnScroll>

        <div className="max-w-3xl mx-auto">
          <VoicePreviewWidget />
        </div>

        <div className="text-center mt-8">
          <Link
            href={ROUTES.DEMO}
            className="btn-marketing-ghost no-underline inline-flex items-center gap-2"
          >
            <Headphones className="w-4 h-4" />
            {t("cta")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
