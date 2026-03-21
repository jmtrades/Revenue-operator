"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2, Users, Palette, ArrowUpRight } from "lucide-react";
import { ROUTES } from "@/lib/constants";

export default function AgencyPage() {
  const t = useTranslations("agency");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{t("kicker")}</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)] mt-1">
            {t("title")}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-2 max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <Link
            href={ROUTES.START}
            className="bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-6 py-3 hover:opacity-90 transition-colors no-underline text-center"
          >
            {t("ctaCreateWorkspace")} →
          </Link>
          <Link
            href={ROUTES.PRICING}
            className="border border-[var(--border-default)] text-[var(--text-primary)] font-medium rounded-xl px-6 py-3 hover:bg-[var(--bg-hover)] transition-colors no-underline text-center"
          >
            {t("ctaPricing")} →
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-inset)] border border-[var(--border-default)]">
              <Building2 className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t("cards.workspaces.title")}</p>
              <p className="mt-1 text-sm text-[var(--text-tertiary)] leading-relaxed">
                {t("cards.workspaces.body")}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={ROUTES.START}
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors no-underline inline-flex items-center gap-2"
            >
              {t("cards.workspaces.link")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-inset)] border border-[var(--border-default)]">
              <Users className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t("cards.provisioning.title")}</p>
              <p className="mt-1 text-sm text-[var(--text-tertiary)] leading-relaxed">
                {t("cards.provisioning.body")}
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs text-[var(--text-secondary)] leading-relaxed">
            {t("cards.provisioning.note")}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-inset)] border border-[var(--border-default)]">
              <Palette className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t("cards.branding.title")}</p>
              <p className="mt-1 text-sm text-[var(--text-tertiary)] leading-relaxed">
                {t("cards.branding.body")}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Link
              href={ROUTES.CONTACT}
              className="text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] transition-colors no-underline inline-flex items-center gap-2"
            >
              {t("cards.branding.link")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

