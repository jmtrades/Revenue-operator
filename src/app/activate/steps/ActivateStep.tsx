"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Check, Loader, Phone, PhoneCall } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { VoicePreviewPlayer } from "@/components/agents/VoicePreviewPlayer";

function CheckIcon() {
  return <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
}

interface ActivateStepProps {
  onFinalize: (e?: React.MouseEvent) => void;
  goBack: () => void;
  finalizing?: boolean;
  phoneNumber?: string;
  agentName?: string;
  voiceId?: string;
  greeting?: string;
}

export function ActivateStep({
  onFinalize,
  goBack,
  finalizing = false,
  phoneNumber,
  agentName = "Agent",
  voiceId = "default",
  greeting = "Hi, how can I help you today?",
}: ActivateStepProps) {
  const t = useTranslations("activate.final");
  const [carrier, setCarrier] = useState<"att" | "verizon" | "tmobile" | "other">("att");

  let code: string;
  if (carrier === "att") code = "*21*[your Revenue Operator number]#";
  else if (carrier === "verizon") code = "*72[your Revenue Operator number]";
  else if (carrier === "tmobile") code = "**21*[your Revenue Operator number]#";
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
            disabled={finalizing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-slate-700 transition-opacity"
          >
            {finalizing && <Loader className="w-3 h-3 animate-spin" />}
            {finalizing ? t("generatingNumber", { defaultValue: "Generating..." }) : t("generateNumber")}
          </button>
        </div>
      </div>

      {finalizing && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 flex items-center gap-3">
          <Loader className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
          <p className="text-xs md:text-sm text-sky-200">{t("settingUp", { defaultValue: "Setting up your workspace..." })}</p>
        </div>
      )}

      <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <PhoneCall className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{t("agentLiveHeading", { defaultValue: "Your agent is live" })}</h3>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          {t("agentLiveDescription", { defaultValue: "Call your new number now to hear your AI operator in action. It uses your business details to greet callers and can be further customized in settings." })}
        </p>
        {phoneNumber && (
          <div className="flex items-center justify-center gap-3">
            <a
              href={`tel:${phoneNumber}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors active:scale-95"
            >
              <Phone className="w-5 h-5" />
              {t("callNumber", { defaultValue: "Call {number}", number: phoneNumber })}
            </a>
          </div>
        )}
        <p className="text-xs text-[var(--text-tertiary)]">{t("freeTestCall", { defaultValue: "Free test call — no minutes deducted" })}</p>
        {voiceId && voiceId !== "default" && greeting && (
          <div className="mt-4">
            <VoicePreviewPlayer
              voiceId={voiceId}
              greeting={greeting}
              agentName={agentName}
              className="mt-3"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 pt-3">
        <button type="button" onClick={goBack} disabled={finalizing} className="text-xs md:text-sm text-slate-400 hover:text-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors">
          {t("back")}
        </button>
        <button
          type="button"
          onClick={(e) => void onFinalize(e)}
          disabled={finalizing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs md:text-sm font-semibold text-[var(--text-on-accent)] hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-emerald-500 transition-opacity"
        >
          {finalizing && <Loader className="w-4 h-4 animate-spin" />}
          {finalizing ? t("activating", { defaultValue: "Activating..." }) : t("activateCta")}
        </button>
      </div>
    </div>
  );
}
