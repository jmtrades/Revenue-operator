"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/shared/AnimateOnScroll";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

export function FinalCTA() {
  const t = useTranslations("homepage.finalCta");

  return (
    <section className="marketing-section py-24 md:py-32" style={{ background: "var(--gradient-cta-section)", borderTop: "1px solid var(--border-default)" }}>
      <Container>
        <AnimateOnScroll className="text-center max-w-2xl mx-auto">
          <h2 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            {t("heading")}
          </h2>
          <p className="text-lg mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {t("subheading")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline inline-block">
              {t("buttons.start")}
            </Link>
            <Link href={ROUTES.BOOK_DEMO} className="btn-marketing-ghost btn-lg no-underline inline-block px-6 py-3 rounded-xl border border-[var(--border-default)] font-semibold">
              {t("buttons.demo")}
            </Link>
          </div>
          <p className="text-sm mt-4" style={{ color: "var(--text-tertiary)" }}>
            {t("note")}
          </p>
          <p className="text-sm mt-6" style={{ color: "var(--text-tertiary)" }}>
            <Link href={ROUTES.DOCS} className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded" style={{ color: "var(--text-tertiary)" }}>{t("links.docs")}</Link>
          </p>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
