"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Check } from "lucide-react";

function CheckIcon() {
  return <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
}
import { Confetti } from "@/components/Confetti";

export function ActivateStep({
  onFinalize,
  goBack,
}: {
  onFinalize: (e?: React.MouseEvent) => void;
  goBack: () => void;
}) {
  const t = useTranslations("activate.final");
  const [carrier, setCarrier] = useState<"att" | "verizon" | "tmobile" | "other">("att");

  let code: string;
  if (carrier === "att") code = "*21*[your Recall Touch number]#";
  else if (carrier === "verizon") code = "*72[your Recall Touch number]";
  else if (carrier === "tmobile") code = "**21*[your Recall Touch number]#";
  else code = t("forwardOtherHint");

  const carrierOptions = [
    { id: "att" as const, labelKey: "carrierAtt" },
    { id: "verizon" as const, labelKey: "carrierVerizon" },
    { id: "tmobile" as const, labelKey: "carrierTmobile" },
    { id: "other" as const, labelKey: "carrierOther" },
  ];

  return (
    <div className="space-y-6">
      <Confetti key="step5-confetti" />
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            {t("heading")}
          </span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <ul className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-slate-300">
        <li className="flex items-center gap-2"><CheckIcon /> {t("checklistBusiness")}</li>
        <li className="flex items-center gap-2"><CheckIcon /> {t("checklistPhone")}</li>
        <li className="flex items-center gap-2"><CheckIcon /> {t("checklistTemplate")}</li>
        <li className="flex items-center gap-2"><CheckIcon /> {t("checklistGreeting")}</li>
        <li className="flex items-center gap-2"><CheckIcon /> {t("checklistForward")}</li>
      </ul>

      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span>{t("activeBadge")}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-100">{t("forwardTitle")}</p>
          <p className="text-xs text-slate-400">
            {t("forwardDesc")}
          </p>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">{t("carrierLabel")}</label>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {carrierOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCarrier(c.id)}
                  className={`rounded-full border px-3 py-1 ${
                    carrier === c.id
                      ? "border-sky-400 bg-sky-500/10 text-slate-50"
                      : "border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
              <p className="font-medium mb-1">{t("forwardingCodeLabel")}</p>
              <p className="font-mono text-xs">{code}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                {t("forwardingHint")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-100">{t("useRecallNumberTitle")}</p>
          <p className="text-xs text-slate-400">
            {t("useRecallNumberDesc")}
          </p>
          <button
            type="button"
            onClick={() => onFinalize()}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
          >
            {t("generateNumber")}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-3">
        <button type="button" onClick={goBack} className="text-xs md:text-sm text-slate-400 hover:text-slate-100">
          {t("back")}
        </button>
        <button
          type="button"
          onClick={(e) => void onFinalize(e)}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-xs md:text-sm font-semibold text-[var(--text-on-accent)] hover:bg-emerald-400"
        >
          {t("activateCta")}
        </button>
      </div>
    </div>
  );
}
