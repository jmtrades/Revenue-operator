"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Mic, Play, Pause, Download, ChevronLeft, ChevronRight, Upload, MessageSquare } from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";

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

type SentimentFilter = "all" | "positive" | "neutral" | "negative";
type DateRangeFilter = "7" | "30" | "90" | "all";
type SortOption = "newest" | "oldest" | "duration_long" | "duration_short";

const maskPhone = (phone: string): string => {
  if (!phone || phone.length < 4) return phone;
  return `***-***-${phone.slice(-4)}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getDateRange = (range: DateRangeFilter): { from: string; to: string } | null => {
  if (range === "all") return null;

  const days = parseInt(range);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};

function RecordingCard({
  recording,
  expandedId,
  playingId,
  onToggleExpand,
  onTogglePlay,
}: {
  recording: CallRecording;
  expandedId: string | null;
  playingId: string | null;
  onToggleExpand: (id: string) => void;
  onTogglePlay: (id: string) => void;
}) {
  const isPlaying = playingId === recording.id;
  const isExpanded = expandedId === recording.id;

  const sentimentColors: Record<string, string> = {
    positive: "bg-[color:var(--accent-primary)]/10 text-[var(--accent-primary)]",
    neutral: "bg-[var(--bg-inset)] text-[var(--text-primary)]",
    negative: "bg-[color:var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)]",
  };

  return (
    <Card className="overflow-hidden border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors">
      <div className="p-4 md:p-6">
        {/* Header with play button and caller info */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => onTogglePlay(recording.id)}
            className="mt-1 flex-shrink-0 h-10 w-10 rounded-full bg-[var(--accent-primary)] hover:opacity-90 transition-opacity flex items-center justify-center text-white"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-semibold text-[var(--text-primary)]">
                {maskPhone(recording.caller_phone)}
              </h3>
              <Badge className={sentimentColors[recording.sentiment]}>
                {recording.sentiment.charAt(0).toUpperCase() + recording.sentiment.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] flex-wrap">
              <span>{formatDuration(recording.duration_seconds)}</span>
              <span>•</span>
              <span>{formatDate(recording.created_at)}</span>
            </div>

            {/* Keywords */}
            {recording.keywords.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {recording.keywords.slice(0, 3).map((keyword) => (
                  <Badge key={keyword} variant="neutral" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
                {recording.keywords.length > 3 && (
                  <Badge variant="neutral" className="text-xs">
                    +{recording.keywords.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {recording.has_transcript && (
              <button
                onClick={() => onToggleExpand(recording.id)}
                title="View transcript"
                className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <a
              href={recording.recording_url}
              download
              title="Download recording"
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Audio player */}
        {isPlaying && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
            <audio controls className="w-full" autoPlay>
              <source src={recording.recording_url} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Transcript preview */}
        {isExpanded && recording.has_transcript && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {recording.transcript_preview}
              {recording.transcript_preview.length >= 100 && "..."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function RecordingsPage() {
  const workspace = useWorkspaceSafe();
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [sentiment, setSentiment] = useState<SentimentFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const offset = (currentPage - 1) * pageSize;

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Fetch recordings
  const fetchRecordings = useCallback(async () => {
    if (!workspace?.workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspace_id: workspace.workspaceId,
        limit: pageSize.toString(),
        offset: offset.toString(),
      });

      if (debouncedQuery) {
        params.append("q", debouncedQuery);
      }

      if (sentiment !== "all") {
        params.append("sentiment", sentiment);
      }

      const dateRangeObj = getDateRange(dateRange);
      if (dateRangeObj) {
        params.append("from", dateRangeObj.from);
        params.append("to", dateRangeObj.to);
      }

      const response = await fetch(`/api/recordings/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch recordings");
      }

      const data: SearchResponse = await response.json();

      // Sort client-side
      let sorted = [...data.recordings];
      if (sortBy === "oldest") {
        sorted.reverse();
      } else if (sortBy === "duration_long") {
        sorted.sort((a, b) => b.duration_seconds - a.duration_seconds);
      } else if (sortBy === "duration_short") {
        sorted.sort((a, b) => a.duration_seconds - b.duration_seconds);
      }

      setRecordings(sorted);
      setTotal(data.total);
    } catch (err) {
      setError("Unable to load recordings. Please try again.");
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, [workspace?.workspaceId, offset, debouncedQuery, sentiment, dateRange, sortBy]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const totalPages = Math.ceil(total / pageSize);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleTogglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  if (!workspace) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
        <EmptyState
          icon={Mic}
          title="No workspace"
          description="Please select a workspace to view recordings"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-primary)] rounded-lg text-white">
              <Mic className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Call Recordings</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              {total} recordings
            </Badge>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Input
            placeholder="Search by phone, keywords..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full"
          />

          <select
            value={sentiment}
            onChange={(e) => {
              setSentiment(e.target.value as SentimentFilter);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value as DateRangeFilter);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
            }}
            className="px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="duration_long">Duration: Longest</option>
            <option value="duration_short">Duration: Shortest</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] skeleton-shimmer" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <EmptyState
              icon={MessageSquare}
              title="Something went wrong"
              description={error}
            />
            <Button
              onClick={fetchRecordings}
              className="mt-6 bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
            >
              Try Again
            </Button>
          </div>
        ) : recordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <EmptyState
              icon={Mic}
              title="No recordings found"
              description="Try adjusting your filters or search terms"
            />
            <Button
              href="/app/agents"
              className="mt-6 bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
            >
              Set Up an Operator
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-8">
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  expandedId={expandedId}
                  playingId={playingId}
                  onToggleExpand={handleToggleExpand}
                  onTogglePlay={handleTogglePlay}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <span className="text-sm text-[var(--text-secondary)]">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
