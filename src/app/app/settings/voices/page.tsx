"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Zap,
  TrendingUp,
  Crown,
  Upload,
  X,
  Check,
  Mic2,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { RECALL_VOICES } from "@/lib/constants/recall-voices";
import { HUMAN_VOICE_DEFAULTS } from "@/lib/voice/human-voice-defaults";

const VOICE_SERVER_URL =
  process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "";

interface Voice {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  tone: string;
  industries: string[];
  previewUrl?: string;
  isClone?: boolean;
  cloneProgress?: number;
  tier?: "free" | "growth" | "business" | "agency";
}

interface ABTest {
  id: string;
  voiceA: string;
  voiceB: string;
  trafficSplit: number;
  calls: number;
  satisfaction: number;
  conversion: number;
  status: "running" | "completed";
}

interface WorkspaceVoiceConfig {
  activeVoiceId: string;
  speed: number;
  stability: number;
  warmth: number;
  emotionIntensity: number;
  industryPreset: string;
}

/* Map voice index to tier */
const getTierForVoiceIndex = (index: number): "free" | "growth" | "business" | "agency" => {
  if (index < 8) return "free";
  if (index < 16) return "growth";
  if (index < 32) return "business";
  return "agency";
};

/* Map real RECALL_VOICES to the Voice interface for the library UI */
const BUILT_IN_VOICES: Voice[] = RECALL_VOICES.map((v, index) => ({
  id: v.id,
  name: v.name,
  gender: v.gender,
  accent: v.accent,
  tone: v.tone.charAt(0).toUpperCase() + v.tone.slice(1),
  industries: v.bestFor.split(", ").map((s) => s.trim()),
  tier: getTierForVoiceIndex(index),
}));

/* Default first voice ID for initial selection */
const DEFAULT_VOICE_ID = BUILT_IN_VOICES[0]?.id ?? "us-female-warm-receptionist";
const DEFAULT_VOICE_B_ID = BUILT_IN_VOICES[1]?.id ?? "us-female-confident-closer";

export default function VoicesSettingsPage() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("voices");
  const [voices, setVoices] = useState<Voice[]>(BUILT_IN_VOICES);
  // Voice server can override built-in voices with live data
  const [, setHasRealData] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [voiceConfig, setVoiceConfig] = useState<WorkspaceVoiceConfig>({
    activeVoiceId: DEFAULT_VOICE_ID,
    speed: HUMAN_VOICE_DEFAULTS.speed,
    stability: HUMAN_VOICE_DEFAULTS.stability,
    warmth: HUMAN_VOICE_DEFAULTS.warmth,
    emotionIntensity: HUMAN_VOICE_DEFAULTS.style,
    industryPreset: "tech",
  });
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testVoiceAId, setTestVoiceAId] = useState<string>(DEFAULT_VOICE_ID);
  const [testVoiceBId, setTestVoiceBId] = useState<string>(DEFAULT_VOICE_B_ID);
  const [testTrafficSplit, setTestTrafficSplit] = useState<number>(50);
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterAccent, setFilterAccent] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [testCustomText, setTestCustomText] = useState<string>("Hello, I'm testing this voice. How does it sound?");

  // Set document title
  useEffect(() => {
    document.title = `${t("pageTitle", { defaultValue: "Voice Library" })} — Recall Touch`;
  }, [t]);

  // Fetch voices from voice server on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch(`${VOICE_SERVER_URL}/voices`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.voices && data.voices.length > 0) {
            setVoices(data.voices);
            setHasRealData(true);
          }
        }
      } catch {
        // Built-in voices used as fallback
      }
    };
    fetchVoices();
  }, []);

  const filteredVoices = voices.filter((voice) => {
    if (filterGender !== "all" && voice.gender !== filterGender) return false;
    if (filterAccent !== "all" && voice.accent !== filterAccent) return false;
    if (filterIndustry !== "all" && !voice.industries.includes(filterIndustry)) return false;
    if (searchTerm && !voice.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handlePreviewVoice = useCallback(async (voiceId: string) => {
    setPlayingVoiceId(voiceId === playingVoiceId ? null : voiceId);
    if (voiceId !== playingVoiceId) {
      const previewText = t("previewText");
      let audioUrl: string | null = null;
      let previewMethod = "none";

      try {
        // Method 1: Try voice server /tts/preview endpoint
        if (process.env.NEXT_PUBLIC_VOICE_SERVER_URL) {
          try {
            const response = await fetch(`${VOICE_SERVER_URL}/tts/preview`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                voice_id: voiceId,
                text: previewText,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.audio_url) {
                audioUrl = data.audio_url;
                previewMethod = "voice-server";
              }
            }
          } catch {
            // Fall through to next method
          }
        }

        // Method 2: Try /api/demo/voice-preview endpoint
        if (!audioUrl) {
          try {
            const demoResponse = await fetch(
              `/api/demo/voice-preview?voice_id=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(previewText)}`
            );
            if (demoResponse.ok) {
              const demoData = await demoResponse.json();
              if (demoData.audio_url) {
                audioUrl = demoData.audio_url;
                previewMethod = "demo-api";
              }
            }
          } catch {
            // Fall through to next method
          }
        }

        // Method 3: Fall back to browser Web Speech API
        if (!audioUrl) {
          previewMethod = "web-speech";
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(previewText);
            utterance.onend = () => setPlayingVoiceId(null);
            utterance.onerror = () => {
              toast.error(t("toast.previewUnavailable"));
              setPlayingVoiceId(null);
            };
            window.speechSynthesis.speak(utterance);
            toast.info(t("toast.browserSpeech"));
            return;
          }
        }

        // Play audio if we have a URL
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.play().catch(() => {
            setPlayingVoiceId(null);
          });
          audio.onended = () => setPlayingVoiceId(null);

          // Show which method was used
          if (previewMethod === "demo-api") {
            toast.info(t("toast.demoApi"));
          } else if (previewMethod === "voice-server") {
            toast.info(t("toast.voiceServer"));
          }
        } else {
          toast.error(t("toast.previewUnavailable"));
          setPlayingVoiceId(null);
        }
      } catch (error) {
        toast.error(t("toast.previewUnavailable"));
        setPlayingVoiceId(null);
      }
    }
  }, [playingVoiceId, t]);

  const handleSelectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setVoiceConfig((prev) => ({ ...prev, activeVoiceId: voiceId }));

    // Persist voice selection to database
    fetch("/api/workspace/agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceId: voiceId }),
      credentials: "include",
    }).catch((error) => {
      // silenced
    });
  }, []);

  const getAudioDurationSec = useCallback(async (file: File): Promise<number> => {
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const duration = Number(audio.duration || 0);
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Invalid audio file."));
      };
      audio.src = url;
    });
  }, []);

  const handleCloneVoice = useCallback(async () => {
  if (!cloneFile || !cloneName.trim() || !workspaceId) return;
    setCloneError(null);
    setIsCloning(true);

    try {
      const allowedMime = new Set(["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3"]);
      const allowedExt = /\.(wav|mp3)$/i.test(cloneFile.name);
      if (!allowedMime.has(cloneFile.type) && !allowedExt) {
        setCloneError(t("cloneErrorFormat"));
        return;
      }
      if (cloneFile.size > 5 * 1024 * 1024) {
        setCloneError(t("cloneErrorSize"));
        return;
      }
      const durationSec = await getAudioDurationSec(cloneFile);
      if (durationSec < 10 || durationSec > 30) {
        setCloneError(t("cloneErrorDuration"));
        return;
      }

      // 1. Record voice_clone consent before cloning
      // Record explicit legal consent for voice cloning before uploading audio.
      const consentText =
        'I confirm that (a) this is my own voice or I have written authorization from the voice owner, ' +
        '(b) I understand this voice will be used by an AI to make phone calls on my behalf, ' +
        '(c) I accept the Voice Cloning Terms of Service.';

      await fetch(`/api/voice/consents?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: "clone_upload",
          consent_type: "voice_clone",
          consent_given: true,
          consent_method: "upload_ui",
          consent_text: consentText,
          metadata: {
            file_name: cloneFile.name,
            file_size: cloneFile.size,
            file_duration_sec: Math.round(durationSec),
            consent_version: "voice-clone-v1",
          },
        }),
      });

      // 2. Send clone request to voice server
      const formData = new FormData();
      formData.append("audio_file", cloneFile);
      formData.append("name", cloneName);
      formData.append("description", cloneDescription);

      const response = await fetch(`${VOICE_SERVER_URL}/voices/clone`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setVoices((prev) => [
          ...prev,
          {
            id: data.voice_id,
            name: cloneName,
            gender: "neutral",
            accent: "Custom",
            tone: "Cloned",
            industries: [],
            isClone: true,
            cloneProgress: 100,
          },
        ]);
        setCloneFile(null);
        setCloneName("");
        setCloneDescription("");
        setCloneError(null);
        setShowCloneModal(false);
      }
    } catch {
      setCloneError(t("cloneErrorGeneric"));
    } finally {
      setIsCloning(false);
    }
  }, [cloneFile, cloneName, cloneDescription, workspaceId, getAudioDurationSec]);

  const handleDeleteClone = useCallback((voiceId: string) => {
    setVoices((prev) => prev.filter((v) => v.id !== voiceId));
  }, []);

  const handleCreateABTest = useCallback(async () => {
    const newTest: ABTest = {
      id: `test_${Date.now()}`,
      voiceA: testVoiceAId,
      voiceB: testVoiceBId,
      trafficSplit: testTrafficSplit,
      calls: 0,
      satisfaction: 0,
      conversion: 0,
      status: "running",
    };
    setAbTests((prev) => [...prev, newTest]);
    setShowTestModal(false);
  }, [testVoiceAId, testVoiceBId, testTrafficSplit]);

  const handleTestVoice = useCallback(async () => {
    if (!testCustomText.trim()) return;
    try {
      const response = await fetch(`${VOICE_SERVER_URL}/tts/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          voice_id: selectedVoiceId,
          text: testCustomText,
          speed: voiceConfig.speed,
          stability: voiceConfig.stability,
          warmth: voiceConfig.warmth,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.audio_url) {
          const audio = new Audio(data.audio_url);
          audio.play().catch(() => {});
        }
      }
    } catch {
      // Silently fail
    }
  }, [selectedVoiceId, testCustomText, voiceConfig]);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);
  const uniqueAccents = Array.from(new Set(voices.map((v) => v.accent)));
  const uniqueIndustries = Array.from(
    new Set(voices.flatMap((v) => v.industries))
  );
  const genderOptions = [
    { value: "male", label: t("genderMale") },
    { value: "female", label: t("genderFemale") },
    { value: "neutral", label: t("genderNeutral") },
  ];

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <PageHeader
          title={t("pageTitle")}
          subtitle={t("pageSubtitle")}
        />
        <EmptyState
          icon="pulse"
          title={t("selectWorkspace")}
          subtitle={t("selectWorkspaceDesc")}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
      />

      {/* Active Voice Configuration */}
      {selectedVoice && (
        <div
          className="rounded-2xl border p-8"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-surface)",
          }}
        >
          <h2
            className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-6"
          >
            {t("activeConfig")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("voiceLabel")}
              </p>
              <div
                className="rounded-xl p-4 flex items-center gap-3 border"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                }}
              >
                <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)]" />
                <div>
                  <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                    {selectedVoice.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {selectedVoice.gender} • {selectedVoice.accent}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("industryPreset")}
              </p>
              <select
                value={voiceConfig.industryPreset}
                onChange={(e) =>
                  setVoiceConfig((prev) => ({
                    ...prev,
                    industryPreset: e.target.value,
                  }))
                }
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="tech">{t("presetTech")}</option>
                <option value="finance">{t("presetFinance")}</option>
                <option value="healthcare">{t("presetHealthcare")}</option>
                <option value="sales">{t("presetSales")}</option>
              </select>
            </div>

            <div>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                {t("toneLabel")}
              </p>
              <p
                className="rounded-xl p-3 text-sm font-medium border"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                {selectedVoice.tone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: t("speedLabel"),
                value: voiceConfig.speed,
                min: 0.5,
                max: 2,
                step: 0.1,
              },
              {
                label: t("stabilityLabel"),
                value: voiceConfig.stability,
                min: 0,
                max: 1,
                step: 0.05,
              },
              {
                label: t("warmthLabel"),
                value: voiceConfig.warmth,
                min: 0,
                max: 1,
                step: 0.05,
              },
              {
                label: t("emotionLabel"),
                value: voiceConfig.emotionIntensity,
                min: 0,
                max: 1,
                step: 0.05,
              },
            ].map((slider) => (
              <div key={slider.label}>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  {slider.label}
                </p>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={slider.value}
                  onChange={(e) => {
                    const key = slider.label.toLowerCase().replace(/\s+/g, "") as keyof WorkspaceVoiceConfig;
                    setVoiceConfig((prev) => ({
                      ...prev,
                      [key]: parseFloat(e.target.value),
                    }));
                  }}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {slider.value.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleTestVoice}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold px-4 py-2.5 text-sm hover:bg-[var(--accent-primary)] transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              <Play className="w-4 h-4" />
              {t("testVoice")}
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={testCustomText}
                onChange={(e) => setTestCustomText(e.target.value)}
                placeholder={t("testPlaceholder")}
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Voice Cloning Info */}
      <div className="mb-6 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-start gap-3">
        <Mic2 className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {t("cloneComingSoon", { defaultValue: "Custom voice cloning" })}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Upload a voice sample to create a custom AI voice for your agents. Supports WAV and MP3 files up to 10MB.
          </p>
        </div>
      </div>

      {/* Voice Library Browser */}
      <div
        className="rounded-2xl border p-8"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <h2
          className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-6"
        >
          {t("libraryTitle")}
        </h2>

        {voices.length === 0 ? (
          <EmptyState
            icon="pulse"
            title={t("noVoices")}
            subtitle={t("voicesLoading")}
          />
        ) : (
          <>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="all">{t("allGenders")}</option>
                {genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filterAccent}
                onChange={(e) => setFilterAccent(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="all">{t("allAccents")}</option>
                {uniqueAccents.map((accent) => (
                  <option key={accent} value={accent}>
                    {accent}
                  </option>
                ))}
              </select>
              <select
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="all">{t("allIndustries")}</option>
                {uniqueIndustries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCloneModal(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold px-3 py-2 text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                {t("cloneVoice")}
              </button>
            </div>

            {/* Voice Grid */}
            {filteredVoices.length === 0 ? (
              <EmptyState
                icon="pulse"
                title="No voices found"
                subtitle="Try adjusting your filters."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.id}
                    className="rounded-xl border p-5 transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]"
                    style={{
                      borderColor:
                        voice.id === selectedVoiceId
                          ? "var(--meaning-blue)"
                          : "var(--border-default)",
                      background:
                        voice.id === selectedVoiceId
                          ? "rgba(var(--tier-growth), 0.08)"
                          : "var(--bg-primary)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {voice.name}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {voice.gender === "male" ? "♂" : voice.gender === "female" ? "♀" : "◐"}{" "}
                          {voice.accent}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {voice.tier && (
                          <span
                            className="text-[10px] font-semibold px-2 py-1 rounded-full border"
                            style={{
                              borderColor:
                                voice.tier === "free"
                                  ? "rgba(var(--tier-free), 0.3)"
                                  : voice.tier === "growth"
                                  ? "rgba(var(--tier-growth), 0.3)"
                                  : voice.tier === "business"
                                  ? "rgba(var(--tier-business), 0.3)"
                                  : "rgba(var(--tier-agency), 0.3)",
                              background:
                                voice.tier === "free"
                                  ? "rgba(var(--tier-free), 0.1)"
                                  : voice.tier === "growth"
                                  ? "rgba(var(--tier-growth), 0.1)"
                                  : voice.tier === "business"
                                  ? "rgba(var(--tier-business), 0.1)"
                                  : "rgba(var(--tier-agency), 0.1)",
                              color:
                                voice.tier === "free"
                                  ? "rgb(var(--tier-free))"
                                  : voice.tier === "growth"
                                  ? "rgb(var(--tier-growth))"
                                  : voice.tier === "business"
                                  ? "rgb(var(--tier-business))"
                                  : "rgb(var(--tier-agency))",
                            }}
                          >
                            {voice.tier === "free"
                              ? "Free"
                              : voice.tier === "growth"
                              ? "Growth+"
                              : voice.tier === "business"
                              ? "Business+"
                              : "Agency"}
                          </span>
                        )}
                        {voice.id === selectedVoiceId && (
                          <Check className="w-5 h-5 text-[var(--accent-primary)]" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                      {voice.tone}
                    </p>

                    {voice.industries.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {voice.industries.map((ind) => (
                          <span
                            key={ind}
                            className="text-[10px] px-2 py-1 rounded-full border"
                            style={{
                              borderColor: "var(--border-default)",
                              background: "var(--bg-surface)",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewVoice(voice.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                        style={{ borderColor: "var(--border-default)" }}
                      >
                        {playingVoiceId === voice.id ? (
                          <>
                            <Pause className="w-3 h-3" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Preview
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectVoice(voice.id)}
                        className="flex-1 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-xs px-2.5 py-1.5 hover:bg-[var(--accent-primary)] transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                      >
                        {t("select")}
                      </button>
                      {voice.isClone && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClone(voice.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-[var(--accent-danger)]/30 px-2.5 py-1.5 text-xs text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {voice.cloneProgress !== undefined && voice.cloneProgress < 100 && (
                      <div className="mt-3 bg-[var(--bg-inset)] rounded-full h-1.5">
                        <div
                          className="bg-[var(--accent-primary)] h-full rounded-full transition-[width]"
                          style={{ width: `${voice.cloneProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* A/B Testing Panel */}
      <div
        className="rounded-2xl border p-8"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)]"
          >
            {t("abTesting")}
          </h2>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold px-4 py-2 text-sm hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
          >
            <TrendingUp className="w-4 h-4" />
            {t("newTest")}
          </button>
        </div>

        {abTests.length === 0 ? (
          <EmptyState
            icon="pulse"
            title={t("noTests")}
            subtitle={t("noTestsDesc")}
          />
        ) : (
          <div className="space-y-4">
            {abTests.map((test) => {
              const voiceA = voices.find((v) => v.id === test.voiceA);
              const voiceB = voices.find((v) => v.id === test.voiceB);
              return (
                <div
                  key={test.id}
                  className="rounded-xl border p-5"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-primary)",
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        {t("voiceA")} ({test.trafficSplit}%)
                      </p>
                      <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                        {voiceA?.name} {voiceA?.isClone && <Crown className="w-3 h-3 inline ml-1" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        {t("voiceB")} ({100 - test.trafficSplit}%)
                      </p>
                      <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                        {voiceB?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        {t("calls")}
                      </p>
                      <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                        {test.calls.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        {t("satisfaction")}
                      </p>
                      <p style={{ color: "var(--meaning-green)" }} className="font-semibold">
                        {test.satisfaction}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        {t("conversion")}
                      </p>
                      <p style={{ color: "var(--meaning-blue)" }} className="font-semibold">
                        {test.conversion}%
                      </p>
                    </div>
                  </div>
                  {test.calls > 500 && test.status === "running" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 font-semibold text-xs px-3 py-1.5 hover:bg-[var(--accent-primary)]/20 transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                    >
                      <Zap className="w-3 h-3" />
                      {t("declareWinner")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-surface)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)]">
                {t("cloneVoice")}
              </h3>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Audio File (WAV/MP3, 10+ seconds)
                </label>
                <div
                  className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-[border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] hover:border-[var(--accent-primary)]/50"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-primary)",
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "audio/*";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        setCloneError(null);
                        setCloneFile(file);
                      }
                    };
                    input.click();
                  }}
                >
                  {cloneFile ? (
                    <p style={{ color: "var(--text-primary)" }} className="font-medium">
                      {cloneFile.name}
                    </p>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 mx-auto mb-2 text-[var(--text-secondary)]" />
                      <p style={{ color: "var(--text-primary)" }} className="font-medium">
                        Drop file or click to browse
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Voice Name
                </label>
                <input
                  type="text"
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="e.g., Sarah"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={cloneDescription}
                  onChange={(e) => setCloneDescription(e.target.value)}
                  placeholder="What is this voice like?"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <p className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                By cloning, you confirm voice rights and accept the{" "}
                <a href="/terms/voice-cloning" className="underline">
                  Voice Cloning Terms
                </a>
                .
              </p>
              {cloneError && (
                <p className="text-xs" style={{ color: "var(--accent-danger, #ef4444)" }}>
                  {cloneError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCloneVoice}
                disabled={isCloning || !cloneFile || !cloneName.trim()}
                className="flex-1 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold py-2.5 text-sm hover:bg-[var(--accent-primary)] transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCloning ? t("cloning") : t("cloneVoice")}
              </button>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A/B Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-surface)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)]">
                {t("createTest")}
              </h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  {t("voiceA")}
                </label>
                <select
                  value={testVoiceAId}
                  onChange={(e) => setTestVoiceAId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  {t("voiceB")}
                </label>
                <select
                  value={testVoiceBId}
                  onChange={(e) => setTestVoiceBId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                  }}
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  {t("trafficSplit")}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={testTrafficSplit}
                    onChange={(e) => setTestTrafficSplit(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span style={{ color: "var(--text-primary)" }} className="font-semibold w-12 text-right">
                    {testTrafficSplit}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreateABTest}
                className="flex-1 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold py-2.5 text-sm hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {t("createTest")}
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
