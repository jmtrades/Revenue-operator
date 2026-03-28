"use client";

import { useRef, useState } from "react";
import { Play, Pause, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

interface VoicePreviewPlayerProps {
  voiceId: string;
  greeting: string;
  agentName?: string;
  voiceName?: string;
  className?: string;
}

const VOICE_SERVER_URL = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_VOICE_SERVER_URL || "https://recall-voice.fly.dev")
  : "https://recall-voice.fly.dev";

export function VoicePreviewPlayer({
  voiceId,
  greeting,
  agentName = "Agent",
  voiceName = "Voice",
  className,
}: VoicePreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generatePreview = async () => {
    if (audioUrl && audioRef.current) {
      // If audio already exists, just play it
      audioRef.current.play();
      setPlaying(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${VOICE_SERVER_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: greeting.slice(0, 5000),
          voice_id: voiceId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate audio preview");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlaying(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      generatePreview();
    }
  };

  const handleAudioEnded = () => {
    setPlaying(false);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 transition-all duration-300",
          playing && "border-[var(--accent-primary)]/50 shadow-lg shadow-[var(--accent-primary)]/10"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Hear {agentName}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{voiceName}</p>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={togglePlay}
            disabled={loading || !!error}
            className={cn(
              "flex-shrink-0 rounded-full p-3 transition-all duration-300",
              loading || error
                ? "bg-[var(--bg-hover)] text-[var(--text-secondary)] cursor-not-allowed opacity-50"
                : playing
                  ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 shadow-lg shadow-[var(--accent-primary)]/30"
                  : "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
            )}
            aria-label={playing ? "Pause audio" : "Play audio preview"}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>

          {/* Waveform animation */}
          <div className="flex items-center gap-1 flex-1 h-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full bg-[var(--accent-primary)]/30 transition-all duration-300",
                  playing && `animate-pulse`
                )}
                style={{
                  height: playing ? `${20 + i * 8}px` : "4px",
                  animationDelay: playing ? `${i * 100}ms` : "0ms",
                  animationDuration: playing ? "600ms" : "0ms",
                }}
                aria-hidden
              />
            ))}
          </div>
        </div>

        {/* Greeting preview */}
        {!error && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-input)]/40 p-2 rounded-lg">
            {greeting.slice(0, 140)}
            {greeting.length > 140 ? "…" : ""}
          </p>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-300">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  generatePreview();
                }}
                className="text-xs text-red-300 hover:text-red-200 underline underline-offset-1 mt-1 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
