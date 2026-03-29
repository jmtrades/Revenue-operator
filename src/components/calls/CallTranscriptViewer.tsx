"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bot, User, Search, Clock, MessageSquare } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Utterance {
  id: string;
  speaker: "caller" | "agent" | string;
  text: string;
  start_time?: number | null;
}

interface TranscriptMetadata {
  duration_seconds?: number;
  sentiment?: "positive" | "neutral" | "negative";
  outcome?: string;
  created_at?: string;
}

interface SearchResponse {
  recordings: Array<{
    id: string;
    call_sid: string;
    caller_phone: string;
    duration_seconds: number;
    sentiment: "positive" | "neutral" | "negative";
    keywords: string[];
    transcript_preview: string;
    recording_url: string;
    created_at: string;
    has_transcript: boolean;
  }>;
  total: number;
}

interface CallTranscriptViewerProps {
  callId: string;
  workspaceId: string;
  utterances?: Utterance[] | null;
  metadata?: TranscriptMetadata;
}

function formatTime(seconds?: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function highlightText(text: string, query: string): React.ReactElement[] {
  if (!query.trim()) return [<span key="0">{text}</span>];

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, idx) => (
    <span
      key={idx}
      className={
        part.toLowerCase() === query.toLowerCase()
          ? "bg-yellow-300 dark:bg-yellow-500"
          : ""
      }
    >
      {part}
    </span>
  ));
}

function getSentimentColor(
  sentiment?: "positive" | "neutral" | "negative"
): string {
  if (!sentiment) return "text-[var(--text-secondary)]";
  if (sentiment === "positive")
    return "text-green-600 dark:text-green-400";
  if (sentiment === "negative") return "text-red-600 dark:text-red-400";
  return "text-[var(--text-secondary)]";
}

export default function CallTranscriptViewer({
  callId,
  workspaceId,
  utterances: initialUtterances,
  metadata,
}: CallTranscriptViewerProps) {
  const [utterances, setUtterances] = useState<Utterance[] | null>(
    initialUtterances ?? null
  );
  const [loading, setLoading] = useState(!initialUtterances);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasSearched = searchQuery.trim().length > 0;

  useEffect(() => {
    if (initialUtterances || !callId || !workspaceId) return;

    let cancelled = false;

    const fetchTranscript = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await apiFetch<SearchResponse>(
          `/api/recordings/search?workspace_id=${encodeURIComponent(workspaceId)}&call_id=${encodeURIComponent(callId)}`
        );

        if (cancelled) return;

        if (data.recordings && data.recordings.length > 0) {
          const recording = data.recordings[0];
          setUtterances(null);
        } else {
          setUtterances(null);
          setError("No transcript available for this call");
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to load transcript";
        setError(message);
        setUtterances(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTranscript();

    return () => {
      cancelled = true;
    };
  }, [callId, workspaceId, initialUtterances]);

  useEffect(() => {
    if (!utterances || !searchQuery.trim()) {
      setMatchCount(0);
      return;
    }

    const count = utterances.filter((u) =>
      u.text.toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
    setMatchCount(count);
  }, [utterances, searchQuery]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [utterances]);

  const filteredUtterances = utterances
    ? utterances.filter((u) => {
        if (!searchQuery.trim()) return true;
        return u.text.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : null;

  const durationSeconds = metadata?.duration_seconds;
  const formattedDuration = durationSeconds
    ? formatTime(durationSeconds)
    : null;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)]">
      <div className="flex flex-col gap-4 p-5 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Call Transcript
          </h2>

          {metadata && (
            <div className="flex items-center gap-3 flex-wrap">
              {formattedDuration && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formattedDuration}</span>
                </div>
              )}

              {metadata.sentiment && (
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full border border-[var(--border-medium)]",
                    getSentimentColor(metadata.sentiment)
                  )}
                >
                  {metadata.sentiment}
                </span>
              )}

              {metadata.outcome && (
                <span className="text-xs px-2 py-1 rounded-full border border-[var(--border-medium)] text-[var(--text-secondary)]">
                  {metadata.outcome}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          />
          {hasSearched && matchCount > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">
              {matchCount} match{matchCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex gap-3 p-3 rounded-xl">
                  <div className="shrink-0 w-7 h-7 bg-[var(--bg-inset)] rounded-full skeleton-shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-[var(--bg-inset)] rounded skeleton-shimmer" />
                    <div className="h-3 w-full bg-[var(--bg-inset)] rounded skeleton-shimmer" />
                    <div className="h-3 w-3/4 bg-[var(--bg-inset)] rounded skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[var(--text-tertiary)] text-center">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && (!filteredUtterances || filteredUtterances.length === 0) && !utterances && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[var(--text-tertiary)]">
              No transcript available for this call
            </p>
          </div>
        )}

        {!loading && !error && utterances && filteredUtterances && filteredUtterances.length === 0 && hasSearched && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-[var(--text-tertiary)]">
              No messages match your search
            </p>
          </div>
        )}

        {!loading && filteredUtterances && filteredUtterances.length > 0 && (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {filteredUtterances.map((utterance, idx) => {
              const isAgent = utterance.speaker === "agent";
              return (
                <motion.div
                  key={utterance.id || idx}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex gap-3 p-3 rounded-xl",
                    isAgent
                      ? "bg-blue-50 dark:bg-blue-950"
                      : "bg-[var(--bg-inset)]"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {isAgent ? (
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--bg-inset)] flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isAgent
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-[var(--text-tertiary)]"
                        )}
                      >
                        {isAgent ? "Agent" : "Caller"}
                      </span>
                      {utterance.start_time !== null &&
                        utterance.start_time !== undefined && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {formatTime(utterance.start_time)}
                          </span>
                        )}
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
                      {highlightText(utterance.text, searchQuery)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
