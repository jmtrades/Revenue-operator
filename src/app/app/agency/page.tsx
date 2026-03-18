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
          <p className="text-sm text-zinc-500">{t("kicker")}</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-white mt-1">
            {t("title")}
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <Link
            href={ROUTES.START}
            className="bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors no-underline text-center"
          >
            {t("ctaCreateWorkspace")} →
          </Link>
          <Link
            href={ROUTES.PRICING}
            className="border border-zinc-700 text-zinc-200 font-medium rounded-xl px-6 py-3 hover:bg-white/10 transition-colors no-underline text-center"
          >
            {t("ctaPricing")} →
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
              <Building2 className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t("cards.workspaces.title")}</p>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                {t("cards.workspaces.body")}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={ROUTES.START}
              className="text-sm font-semibold text-white/90 hover:text-white transition-colors no-underline inline-flex items-center gap-2"
            >
              {t("cards.workspaces.link")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
              <Users className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t("cards.provisioning.title")}</p>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                {t("cards.provisioning.body")}
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs text-zinc-500 leading-relaxed">
            {t("cards.provisioning.note")}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
              <Palette className="h-5 w-5 text-white/80" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{t("cards.branding.title")}</p>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                {t("cards.branding.body")}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <Link
              href={ROUTES.CONTACT}
              className="text-sm font-semibold text-white/90 hover:text-white transition-colors no-underline inline-flex items-center gap-2"
            >
              {t("cards.branding.link")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

