"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

const VOICE_SERVER_URL =
  process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "http://localhost:8100";

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

const DEMO_VOICES: Voice[] = [
  {
    id: "voice_alex",
    name: "Alex",
    gender: "male",
    accent: "American",
    tone: "Professional",
    industries: ["Tech", "Finance", "Consulting"],
  },
  {
    id: "voice_maya",
    name: "Maya",
    gender: "female",
    accent: "British",
    tone: "Warm",
    industries: ["Healthcare", "Education", "Hospitality"],
  },
  {
    id: "voice_river",
    name: "River",
    gender: "neutral",
    accent: "American",
    tone: "Friendly",
    industries: ["Retail", "E-commerce", "Services"],
  },
  {
    id: "voice_jordan",
    name: "Jordan",
    gender: "male",
    accent: "Australian",
    tone: "Energetic",
    industries: ["Sales", "Marketing", "Startup"],
  },
  {
    id: "voice_ash",
    name: "Ash",
    gender: "female",
    accent: "Neutral",
    tone: "Clinical",
    industries: ["Legal", "Finance", "Enterprise"],
  },
];

const DEMO_AB_TESTS: ABTest[] = [
  {
    id: "test_1",
    voiceA: "voice_alex",
    voiceB: "voice_maya",
    trafficSplit: 50,
    calls: 1250,
    satisfaction: 82,
    conversion: 28.5,
    status: "running",
  },
  {
    id: "test_2",
    voiceA: "voice_river",
    voiceB: "voice_jordan",
    trafficSplit: 60,
    calls: 920,
    satisfaction: 75,
    conversion: 24.2,
    status: "running",
  },
];

export default function VoicesSettingsPage() {
  const { workspaceId } = useWorkspace();
  const [voices, setVoices] = useState<Voice[]>(DEMO_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("voice_alex");
  const [voiceConfig, setVoiceConfig] = useState<WorkspaceVoiceConfig>({
    activeVoiceId: "voice_alex",
    speed: 1,
    stability: 0.7,
    warmth: 0.5,
    emotionIntensity: 0.6,
    industryPreset: "tech",
  });
  const [abTests, setAbTests] = useState<ABTest[]>(DEMO_AB_TESTS);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testVoiceAId, setTestVoiceAId] = useState<string>("voice_alex");
  const [testVoiceBId, setTestVoiceBId] = useState<string>("voice_maya");
  const [testTrafficSplit, setTestTrafficSplit] = useState<number>(50);
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterAccent, setFilterAccent] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [testCustomText, setTestCustomText] = useState<string>("Hello, I'm testing this voice. How does it sound?");

  // Fetch voices from voice server on mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch(`${VOICE_SERVER_URL}/voices`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setVoices(data.voices || DEMO_VOICES);
        }
      } catch {
        // Use demo data on error
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
      try {
        const response = await fetch(`${VOICE_SERVER_URL}/tts/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            voice_id: voiceId,
            text: "Hi there, how can I help you today?",
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.audio_url) {
            const audio = new Audio(data.audio_url);
            audio.play().catch(() => {
              setPlayingVoiceId(null);
            });
            audio.onended = () => setPlayingVoiceId(null);
          }
        }
      } catch {
        setPlayingVoiceId(null);
      }
    }
  }, [playingVoiceId]);

  const handleSelectVoice = useCallback((voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setVoiceConfig((prev) => ({ ...prev, activeVoiceId: voiceId }));
  }, []);

  const handleCloneVoice = useCallback(async () => {
    if (!cloneFile || !cloneName.trim() || !workspaceId) return;
    setIsCloning(true);

    try {
      // 1. Record voice_clone consent before cloning
      await fetch(`/api/voice/consents?workspace_id=${encodeURIComponent(workspaceId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: "clone_upload",
          consent_type: "voice_clone",
          consent_given: true,
          consent_method: "upload_ui",
          consent_text: `Voice clone consent for "${cloneName}" via dashboard upload.`,
          metadata: { file_name: cloneFile.name, file_size: cloneFile.size },
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
        setShowCloneModal(false);
      }
    } catch {
      // Handle error silently, keep modal open for retry
    } finally {
      setIsCloning(false);
    }
  }, [cloneFile, cloneName, cloneDescription, workspaceId]);

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
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "neutral", label: "Neutral" },
  ];

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <PageHeader
          title="Voice Library"
          subtitle="Manage and configure AI voice settings."
        />
        <EmptyState
          icon="pulse"
          title="Select a workspace"
          subtitle="Voice settings will appear here."
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Voice Library"
        subtitle="Configure and manage AI voices for your workspace."
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
            className="text-lg font-semibold mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Active Voice Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Voice
              </p>
              <div
                className="rounded-xl p-4 flex items-center gap-3 border"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-primary)",
                }}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
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
                Industry Preset
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
                <option value="tech">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="sales">Sales</option>
              </select>
            </div>

            <div>
              <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Tone
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
                label: "Speed",
                value: voiceConfig.speed,
                min: 0.5,
                max: 2,
                step: 0.1,
              },
              {
                label: "Stability",
                value: voiceConfig.stability,
                min: 0,
                max: 1,
                step: 0.05,
              },
              {
                label: "Warmth",
                value: voiceConfig.warmth,
                min: 0,
                max: 1,
                step: 0.05,
              },
              {
                label: "Emotion Intensity",
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-black font-semibold px-4 py-2.5 text-sm hover:bg-emerald-400 transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Voice
            </button>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={testCustomText}
                onChange={(e) => setTestCustomText(e.target.value)}
                placeholder="Enter custom text for testing..."
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

      {/* Voice Library Browser */}
      <div
        className="rounded-2xl border p-8"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <h2
          className="text-lg font-semibold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Voice Library
        </h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <input
            type="text"
            placeholder="Search voices..."
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
            <option value="all">All Genders</option>
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
            <option value="all">All Accents</option>
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
            <option value="all">All Industries</option>
            {uniqueIndustries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCloneModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white text-black font-semibold px-3 py-2 text-sm hover:bg-zinc-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Clone Voice
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
                className="rounded-xl border p-5 transition-all"
                style={{
                  borderColor:
                    voice.id === selectedVoiceId
                      ? "var(--meaning-blue)"
                      : "var(--border-default)",
                  background:
                    voice.id === selectedVoiceId
                      ? "rgba(59, 130, 246, 0.08)"
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
                  {voice.id === selectedVoiceId && (
                    <Check className="w-5 h-5 text-emerald-400" />
                  )}
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
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
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
                    className="flex-1 rounded-lg bg-emerald-500 text-black font-semibold text-xs px-2.5 py-1.5 hover:bg-emerald-400 transition-colors"
                  >
                    Select
                  </button>
                  {voice.isClone && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClone(voice.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {voice.cloneProgress !== undefined && voice.cloneProgress < 100 && (
                  <div className="mt-3 bg-[var(--bg-inset)] rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${voice.cloneProgress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
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
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            A/B Testing
          </h2>
          <button
            type="button"
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black font-semibold px-4 py-2 text-sm hover:bg-zinc-100 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            New Test
          </button>
        </div>

        {abTests.length === 0 ? (
          <EmptyState
            icon="pulse"
            title="No A/B tests yet"
            subtitle="Create a test to compare voice performance."
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
                        Voice A ({test.trafficSplit}%)
                      </p>
                      <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                        {voiceA?.name} {voiceA?.isClone && <Crown className="w-3 h-3 inline ml-1" />}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        Voice B ({100 - test.trafficSplit}%)
                      </p>
                      <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                        {voiceB?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        Calls
                      </p>
                      <p style={{ color: "var(--text-primary)" }} className="font-semibold">
                        {test.calls.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        Satisfaction
                      </p>
                      <p style={{ color: "var(--meaning-green)" }} className="font-semibold">
                        {test.satisfaction}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        Conversion
                      </p>
                      <p style={{ color: "var(--meaning-blue)" }} className="font-semibold">
                        {test.conversion}%
                      </p>
                    </div>
                  </div>
                  {test.calls > 500 && test.status === "running" && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold text-xs px-3 py-1.5 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Declare Winner
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
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Clone Voice
              </h3>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="text-[var(--text-secondary)] hover:text-zinc-300"
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
                  className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors hover:border-emerald-500/50"
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
                      if (file) setCloneFile(file);
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
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCloneVoice}
                disabled={isCloning || !cloneFile || !cloneName.trim()}
                className="flex-1 rounded-xl bg-emerald-500 text-black font-semibold py-2.5 text-sm hover:bg-emerald-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCloning ? "Cloning..." : "Clone Voice"}
              </button>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-[var(--bg-inset)] transition-colors"
              >
                Cancel
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
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Create A/B Test
              </h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-[var(--text-secondary)] hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                  Voice A
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
                  Voice B
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
                  Traffic Split (Voice A %)
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
                className="flex-1 rounded-xl bg-white text-black font-semibold py-2.5 text-sm hover:bg-zinc-100 transition-colors"
              >
                Create Test
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-[var(--bg-inset)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
