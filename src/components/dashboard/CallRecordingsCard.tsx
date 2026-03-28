"use client";

import { useEffect, useState, useCallback } from "react";
import { Mic, Search, Play, Download, Clock, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface CallRecording {
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
}

interface SearchResponse {
  recordings: CallRecording[];
  total: number;
}

export function CallRecordingsCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(
    (term: string = "", off: number = 0) => {
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: "5",
        offset: off.toString(),
      });
      if (term) params.append("q", term);

      fetch(`/api/recordings/search?${params.toString()}`, {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: SearchResponse | null) => {
          setRecordings(data?.recordings ?? []);
          setTotal(data?.total ?? 0);
        })
        .catch(() => {
          setRecordings([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    },
    [workspaceId]
  );

  useEffect(() => {
    load("", 0);
  }, [load]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setOffset(0);
    load(term, 0);
  };

  const handleLoadMore = () => {
    const nextOffset = offset + 5;
    setOffset(nextOffset);
    load(searchTerm, nextOffset);
  };

  const maskPhoneNumber = (phone: string): string => {
    if (phone.length < 4) return phone;
    return `***-***-${phone.slice(-4)}`;
  };

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment) {
      case "positive":
        return "text-emerald-400";
      case "negative":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  const getSentimentBg = (sentiment: string): string => {
    switch (sentiment) {
      case "positive":
        return "bg-emerald-500/10";
      case "negative":
        return "bg-red-500/10";
      default:
        return "bg-blue-500/10";
    }
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading && recordings.length === 0) {
    return (
      <div className="dash-section p-5 md:p-6 animate-pulse">
        <div className="h-5 w-40 rounded bg-[var(--bg-hover)] mb-4" />
        <div className="space-y-3">
          <div className="h-20 rounded-lg bg-[var(--bg-hover)]" />
          <div className="h-20 rounded-lg bg-[var(--bg-hover)]" />
        </div>
      </div>
    );
  }

  if (recordings.length === 0 && !loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mic className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Call Recordings</h2>
        </div>
        <div className="py-5 text-center space-y-2">
          <p className="text-sm text-[var(--text-secondary)]">
            {searchTerm ? "No recordings found. Try a different search." : "Recordings appear here automatically after each call."}
          </p>
          {!searchTerm && (
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Every call is transcribed and searchable. Review conversations, coach your team, and track quality.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Call Recordings</h2>
        {total > 0 && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
            {total} total
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search by phone, keyword, or transcript..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
      </div>

      {/* Recordings List */}
      <div className="space-y-3">
        {recordings.map((recording) => {
          const isExpanded = expandedId === recording.id;
          return (
            <div
              key={recording.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 hover:border-[var(--border-hover)] transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {maskPhoneNumber(recording.caller_phone)}
                    </p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getSentimentBg(recording.sentiment)} ${getSentimentColor(recording.sentiment)}`}>
                      {recording.sentiment}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(recording.created_at)}
                    </span>
                    <span>{formatDuration(recording.duration_seconds)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <a
                    href={recording.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                    title="Play recording"
                  >
                    <Play className="w-4 h-4" />
                  </a>
                  <a
                    href={recording.recording_url}
                    download
                    className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                    title="Download recording"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Keywords */}
              {recording.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {recording.keywords.slice(0, 3).map((keyword, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {keyword}
                    </span>
                  ))}
                  {recording.keywords.length > 3 && (
                    <span className="text-[11px] text-[var(--text-tertiary)] px-2 py-1">
                      +{recording.keywords.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Transcript Preview */}
              {recording.has_transcript && recording.transcript_preview && (
                <div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : recording.id)}
                    className="flex items-center gap-2 w-full text-left group mb-2"
                  >
                    <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      Transcript
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    )}
                  </button>

                  {isExpanded && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded-lg p-3 leading-relaxed">
                      {recording.transcript_preview}
                    </p>
                  )}

                  {!isExpanded && (
                    <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">
                      {recording.transcript_preview}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {offset + 5 < total && (
        <button
          onClick={handleLoadMore}
          disabled={loading}
          className="w-full mt-4 py-2 rounded-lg border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading..." : `Load more (${total - (offset + 5)} remaining)`}
        </button>
      )}
    </div>
  );
}
