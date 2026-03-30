"use client";

import { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  MessageSquare,
  Clock,
  BarChart3,
  Zap,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";

type DateRange = "7d" | "30d" | "90d";

interface ConversationMetrics {
  total_conversations: number;
  avg_duration_seconds: number;
  conversion_rate: number;
  talk_to_listen_ratio: number;
  avg_response_time_seconds: number;
}

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

interface Objection {
  text: string;
  count: number;
  resolution_rate: number;
}

interface TalkTrack {
  phrase: string;
  success_rate: number;
  usage_count: number;
}

interface LosingTalkTrack {
  phrase: string;
  failure_rate: number;
  usage_count: number;
  suggested_alternative: string;
}

interface WordCloudItem {
  word: string;
  frequency: number;
}

interface FunnelStage {
  stage: string;
  conversations: number;
  drop_off_percentage: number;
}

interface ApiResponse<T> {
  data: T;
}

const SENTIMENT_COLORS = {
  positive: "#16A34A",
  neutral: "#8B5CF6",
  negative: "#DC2626",
};

export default function ConversationalAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [wordCloud, setWordCloud] = useState<WordCloudItem[]>([]);
  const [winningTalkTracks, setWinningTalkTracks] = useState<TalkTrack[]>([]);
  const [losingTalkTracks, setLosingTalkTracks] = useState<LosingTalkTrack[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch metrics and data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch main metrics
        const metricsRes = await apiFetch<ApiResponse<ConversationMetrics>>(
          `/api/analytics/conversations?range=${dateRange}`
        );
        setMetrics(metricsRes.data);

        // Fetch sentiment data
        try {
          const sentimentRes = await apiFetch<
            ApiResponse<{
              positive: number;
              neutral: number;
              negative: number;
            }>
          >("/api/analytics/conversations/sentiment");
          const sentiment = sentimentRes.data;
          setSentimentData([
            {
              name: "Positive",
              value: sentiment.positive,
              color: SENTIMENT_COLORS.positive,
            },
            {
              name: "Neutral",
              value: sentiment.neutral,
              color: SENTIMENT_COLORS.neutral,
            },
            {
              name: "Negative",
              value: sentiment.negative,
              color: SENTIMENT_COLORS.negative,
            },
          ]);
        } catch {
          // Sentiment endpoint optional
        }

        // Fetch objections
        try {
          const objectionsRes = await apiFetch<ApiResponse<Objection[]>>(
            "/api/analytics/conversations/objections"
          );
          setObjections(objectionsRes.data);
        } catch {
          // Objections endpoint optional
        }

        // Fetch word cloud
        try {
          const wordCloudRes = await apiFetch<ApiResponse<WordCloudItem[]>>(
            "/api/analytics/conversations/word-cloud"
          );
          setWordCloud(wordCloudRes.data);
        } catch {
          // Word cloud endpoint optional
        }

        // Fetch talk tracks
        try {
          const talkTracksRes = await apiFetch<
            ApiResponse<{
              winning: TalkTrack[];
              losing: LosingTalkTrack[];
            }>
          >("/api/analytics/conversations/talk-tracks");
          setWinningTalkTracks(talkTracksRes.data.winning || []);
          setLosingTalkTracks(talkTracksRes.data.losing || []);
        } catch {
          // Talk tracks endpoint optional
        }

        // Fetch funnel data
        try {
          const funnelRes = await apiFetch<ApiResponse<FunnelStage[]>>(
            "/api/analytics/conversations/funnel"
          );
          setFunnelData(funnelRes.data);
        } catch {
          // Funnel endpoint optional
        }
      } catch (err) {
        setError("Failed to load analytics data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Calculate max frequency for word cloud sizing
  const maxFrequency = useMemo(
    () => Math.max(...wordCloud.map((item) => item.frequency), 1),
    [wordCloud]
  );

  const getFontSize = (frequency: number) => {
    const minSize = 12;
    const maxSize = 32;
    const normalized = frequency / maxFrequency;
    return minSize + normalized * (maxSize - minSize);
  };

  const getWordColor = (frequency: number) => {
    const normalized = frequency / maxFrequency;
    if (normalized > 0.66) return "#3b82f6";
    if (normalized > 0.33) return "#a855f7";
    return "#64748b";
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="skeleton-shimmer space-y-6">
            <div className="h-10 bg-[var(--bg-inset)] rounded w-1/3"></div>
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-[var(--bg-inset)] rounded"
                ></div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="h-72 bg-[var(--bg-inset)] rounded"></div>
              <div className="h-72 bg-[var(--bg-inset)] rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Conversational Analytics
            </h1>
            <p className="text-[var(--text-secondary)]">
              Analyze conversation patterns, sentiment, and effectiveness
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-2 mt-4 md:mt-0">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-[background-color,border-color,color,transform] ${
                  dateRange === range
                    ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] shadow-lg"
                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 90 days"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[var(--accent-danger,#ef4444)]/5 border border-[var(--accent-danger,#ef4444)]/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[var(--accent-danger,#ef4444)] flex-shrink-0 mt-0.5" />
            <p className="text-[var(--accent-danger,#ef4444)]">{error}</p>
          </div>
        )}

        {/* KPI Row */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <KPICard
              label="Total Conversations"
              value={String(metrics.total_conversations)}
              icon={<MessageSquare className="h-5 w-5" />}
              trend={12}
            />
            <KPICard
              label="Avg Duration"
              value={`${Math.round(metrics.avg_duration_seconds / 60)}m`}
              icon={<Clock className="h-5 w-5" />}
              trend={5}
            />
            <KPICard
              label="Conversion Rate"
              value={`${(metrics.conversion_rate * 100).toFixed(1)}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={8}
            />
            <KPICard
              label="Talk-to-Listen"
              value={metrics.talk_to_listen_ratio.toFixed(2)}
              icon={<Sparkles className="h-5 w-5" />}
              subtitle="ratio"
            />
            <KPICard
              label="Avg Response Time"
              value={`${metrics.avg_response_time_seconds.toFixed(1)}s`}
              icon={<Zap className="h-5 w-5" />}
              trend={-3}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Sentiment Chart */}
          {sentimentData.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                Conversation Sentiment
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={undefined}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Objections */}
          {objections.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                Top Objections
              </h2>
              <div className="space-y-4 max-h-72 overflow-y-auto">
                {objections.slice(0, 8).map((objection, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {objection.text}
                      </p>
                      <span className="text-xs font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                        {objection.count}x
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-inset)] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-[width]"
                        style={{
                          width: `${objection.resolution_rate * 100}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {(objection.resolution_rate * 100).toFixed(0)}% resolved
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Word Cloud */}
        {wordCloud.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
              Conversation Word Cloud
            </h2>
            <div className="flex flex-wrap gap-4 justify-center items-center min-h-48 p-4">
              {wordCloud.slice(0, 50).map((item, idx) => (
                <div
                  key={idx}
                  className="transition-[opacity] hover:opacity-80 cursor-default"
                  style={{
                    fontSize: `${getFontSize(item.frequency)}px`,
                    color: getWordColor(item.frequency),
                    fontWeight: item.frequency > maxFrequency * 0.5 ? 700 : 500,
                  }}
                  title={`Frequency: ${item.frequency}`}
                >
                  {item.word}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Winning Talk Tracks */}
        {winningTalkTracks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Winning Talk Tracks
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {winningTalkTracks.slice(0, 6).map((track, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-3">
                        "{track.phrase}"
                      </p>
                    </div>
                    <ThumbsUp className="h-5 w-5 text-[var(--accent-primary)] flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>Success Rate</span>
                    <span className="font-semibold text-[var(--accent-primary)]">
                      {(track.success_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] mt-2">
                    Used {track.usage_count} times
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Losing Talk Tracks */}
        {losingTalkTracks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Phrases to Avoid
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {losingTalkTracks.slice(0, 6).map((track, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--accent-danger,#ef4444)]/5 border border-[var(--accent-danger,#ef4444)]/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                        ❌ "{track.phrase}"
                      </p>
                    </div>
                    <ThumbsDown className="h-5 w-5 text-[var(--accent-danger,#ef4444)] flex-shrink-0" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>Failure Rate</span>
                      <span className="font-semibold text-[var(--accent-danger,#ef4444)]">
                        {(track.failure_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[var(--accent-danger,#ef4444)]/30">
                      <p className="text-xs text-[var(--text-secondary)]">
                        Try instead: <span className="font-medium">"{track.suggested_alternative}"</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drop-off Funnel */}
        {funnelData.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
              Conversation Drop-off Funnel
            </h2>
            <div className="space-y-4">
              {funnelData.map((stage, idx) => {
                const maxConversations = Math.max(
                  ...funnelData.map((s) => s.conversations)
                );
                const width = (stage.conversations / maxConversations) * 100;

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-[var(--text-secondary)] min-w-32">
                        {stage.stage}
                      </span>
                      <div className="flex-1 bg-[var(--bg-inset)] rounded-full h-8 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-3 transition-[width] rounded-full"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-xs font-semibold text-white">
                            {String(stage.conversations)}
                          </span>
                        </div>
                      </div>
                      {stage.drop_off_percentage > 0 && (
                        <div className="text-right min-w-20">
                          <p className="text-xs font-semibold text-[var(--accent-danger,#ef4444)]">
                            -{stage.drop_off_percentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            drop-off
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!metrics && !loading && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No data available
            </h3>
            <p className="text-[var(--text-secondary)]">
              Conversational analytics data will appear here once conversations are analyzed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
}

function KPICard({ label, value, icon, trend, subtitle }: KPICardProps) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[var(--accent-primary)]">{icon}</div>
        {trend !== undefined && (
          <div
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              trend >= 0
                ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                : "bg-[var(--accent-danger,#ef4444)]/10 text-[var(--accent-danger,#ef4444)]"
            }`}
          >
            {trend >= 0 ? "+" : ""}
            {trend}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
        {value}
      </p>
      <p className="text-xs text-[var(--text-secondary)]">
        {label}
        {subtitle && <span> ({subtitle})</span>}
      </p>
    </div>
  );
}
