"use client";

import { useTranslations } from "next-intl";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { TestFeedback } from "./types";

export function TestStep({
  onPlayGreeting,
  onThumb,
  goBack,
}: {
  onPlayGreeting: () => void;
  onThumb: (fb: TestFeedback) => void;
  goBack: () => void;
}) {
  const t = useTranslations("activate.test");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">
          {t("heading")}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={onPlayGreeting}
          className="relative flex h-32 w-32 items-center justify-center rounded-full bg-slate-900/70 border border-sky-500/60 shadow-[0_0_40px_rgba(56,189,248,0.4)]"
        >
          <div className="absolute inset-0 rounded-full bg-sky-500/10 animate-[pulse_2.4s_ease-out_infinite]" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 border border-sky-400">
            <span className="text-xs font-medium text-slate-50">{t("tapToListen")}</span>
          </div>
        </button>
        <p className="text-xs text-slate-400">
          {t("hint")}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="text-sm text-slate-300">{t("howDidItSound")}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onThumb("down")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/40 px-4 py-2 text-xs text-slate-200 hover:border-slate-500"
          >
            <ThumbsDown className="h-4 w-4" />
            {t("adjustSettings")}
          </button>
          <button
            type="button"
            onClick={() => onThumb("up")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-slate-100"
          >
            <ThumbsUp className="h-4 w-4" />
            {t("looksGreat")}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button type="button" onClick={goBack} className="text-xs md:text-sm text-slate-400 hover:text-slate-100">
          {t("back")}
        </button>
      </div>
    </div>
  );
}
