"use client";

import { useTranslations } from "next-intl";
import type { Agent } from "../AgentsPageClient";
import type { RecallVoice as CuratedVoice } from "@/lib/constants/recall-voices";
import { Play, Square } from "lucide-react";

type Props = {
  agent: Agent;
  voices: CuratedVoice[];
  previewingVoiceId: string | null;
  onChange: (partial: Partial<Agent>) => void;
  onVoicePreview: (voiceId: string) => void;
};

type RangeProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  note?: string;
  onChange: (value: number) => void;
};

function RangeSetting({
  label,
  value,
  min,
  max,
  step,
  suffix,
  note,
  onChange,
}: RangeProps) {
  return (
    <div>
      <label className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>{label}</span>
        <span className="text-[var(--text-secondary)]">
          {value}
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-2 w-full accent-white"
      />
      {note ? <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{note}</p> : null}
    </div>
  );
}

type VoiceCardProps = {
  voice: CuratedVoice;
  selected: boolean;
  previewing: boolean;
  selectedLabel: string;
  selectThisVoiceLabel: string;
  previewAriaLabel: string;
  onSelect: () => void;
  onPreview: () => void;
};

function VoiceCard({
  voice,
  selected,
  previewing,
  selectedLabel,
  selectThisVoiceLabel,
  previewAriaLabel,
  onSelect,
  onPreview,
}: VoiceCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      aria-label={`${voice.name}, ${voice.description}. ${
        selected ? selectedLabel : selectThisVoiceLabel
      }`}
      className={`relative cursor-pointer rounded-xl p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        selected
          ? "border-2 border-white bg-[var(--bg-hover)] ring-1 ring-white/20"
          : "border border-[var(--border-default)] bg-[var(--bg-card)] hover:border-[var(--border-medium)]"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        aria-label={previewAriaLabel}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-hover)] transition-colors hover:bg-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {previewing ? (
          <Square className="h-3 w-3 fill-current text-[var(--text-secondary)]" />
        ) : (
          <Play className="h-3 w-3 fill-current text-[var(--text-secondary)]" />
        )}
      </button>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        {voice.name}
      </p>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{voice.description}</p>
      <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
        {voice.accent}
      </p>
      <p className="mt-2 pr-8 text-[10px] leading-tight text-white/20">
        {voice.bestFor}
      </p>
    </div>
  );
}

export function VoiceSelector({
  agent,
  voices,
  previewingVoiceId,
  onChange,
  onVoicePreview,
}: Props) {
  const t = useTranslations("agents");
  return (
    <div>
      <p className="text-[11px] text-[var(--text-secondary)] mb-2">{t("voiceSelector.voiceLabel")}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            selected={agent.voice === voice.id}
            previewing={previewingVoiceId === voice.id}
            selectedLabel={t("voiceSelector.selectedLabel")}
            selectThisVoiceLabel={t("voiceSelector.selectThisVoiceLabel")}
            previewAriaLabel={t("voiceSelector.previewVoiceAria", { name: voice.name })}
            onSelect={() => onChange({ voice: voice.id })}
            onPreview={() => onVoicePreview(voice.id)}
          />
        ))}
      </div>
      <details className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <summary className="cursor-pointer text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          {t("voiceSelector.advancedVoiceSettings")}
        </summary>
        <div className="mt-4 space-y-4">
          <RangeSetting
            label={t("voiceSelector.stability")}
            value={agent.voiceSettings.stability}
            min={0}
            max={1}
            step={0.05}
            suffix=""
            note={t("voiceSelector.stabilityNote")}
            onChange={(value) =>
              onChange({
                voiceSettings: { ...agent.voiceSettings, stability: value },
              })
            }
          />
          <RangeSetting
            label={t("voiceSelector.speed")}
            value={agent.voiceSettings.speed}
            min={0.8}
            max={1.3}
            step={0.05}
            suffix="x"
            onChange={(value) =>
              onChange({
                voiceSettings: { ...agent.voiceSettings, speed: value },
              })
            }
          />
          <RangeSetting
            label={t("voiceSelector.responseDelay")}
            value={agent.voiceSettings.responseDelay}
            min={0}
            max={1.5}
            step={0.1}
            suffix="s"
            note={t("voiceSelector.responseDelayNote")}
            onChange={(value) =>
              onChange({
                voiceSettings: {
                  ...agent.voiceSettings,
                  responseDelay: value,
                },
              })
            }
          />
          <label className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <input
              type="checkbox"
              checked={agent.voiceSettings.backchannel}
              onChange={(e) =>
                onChange({
                  voiceSettings: {
                    ...agent.voiceSettings,
                    backchannel: e.target.checked,
                  },
                })
              }
              className="accent-white"
            />
            {t("voiceSelector.backchannelLabel")}
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <input
              type="checkbox"
              checked={agent.voiceSettings.denoising}
              onChange={(e) =>
                onChange({
                  voiceSettings: {
                    ...agent.voiceSettings,
                    denoising: e.target.checked,
                  },
                })
              }
              className="accent-white"
            />
            {t("voiceSelector.denoisingLabel")}
          </label>
        </div>
      </details>
    </div>
  );
}

