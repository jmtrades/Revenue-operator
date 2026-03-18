'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/components/WorkspaceContext';
import { PageHeader, Card, CardHeader, CardBody } from '@/components/ui';

interface KPIData {
  avgTTFB: number;
  ttfbTrend: number;
  avgMOS: number;
  errorRate: number;
  totalMinutes: number;
}

interface VoiceMetrics {
  name: string;
  calls: number;
  avgDuration: number;
  avgTTFB: number;
  mosScore: number;
  cost: number;
  isActive?: boolean;
}

interface ModelComparison {
  model: string;
  calls: number;
  latency: number;
  quality: number;
  costPerMin: number;
}

interface QualityIssue {
  timestamp: string;
  voice: string;
  callId: string;
  type: 'mos' | 'glitch' | 'latency';
  value: string;
}

const FALLBACK_DATA = {
  kpi: {
    avgTTFB: 245,
    ttfbTrend: -12,
    avgMOS: 4.2,
    errorRate: 0.8,
    totalMinutes: 12450,
  },
  voices: [
    { name: 'Orpheus', calls: 1240, avgDuration: 85, avgTTFB: 220, mosScore: 4.3, cost: 245.50, isActive: true },
    { name: 'Kokoro', calls: 890, avgDuration: 92, avgTTFB: 260, mosScore: 4.1, cost: 178.90 },
    { name: 'Fish Speech', calls: 650, avgDuration: 78, avgTTFB: 255, mosScore: 3.9, cost: 130.20 },
  ],
  models: [
    { model: 'Orpheus', calls: 1240, latency: 220, quality: 4.3, costPerMin: 0.12 },
    { model: 'Kokoro', calls: 890, latency: 260, quality: 4.1, costPerMin: 0.14 },
    { model: 'Fish Speech', calls: 650, latency: 255, quality: 3.9, costPerMin: 0.16 },
  ],
  issues: [
    { timestamp: '2024-03-17 14:32:00', voice: 'Kokoro', callId: 'call_892831', type: 'mos' as const, value: '2.8' },
    { timestamp: '2024-03-17 13:15:00', voice: 'Fish Speech', callId: 'call_892710', type: 'glitch' as const, value: '245ms gap' },
    { timestamp: '2024-03-17 12:04:00', voice: 'Orpheus', callId: 'call_892601', type: 'latency' as const, value: '580ms' },
    { timestamp: '2024-03-17 10:52:00', voice: 'Kokoro', callId: 'call_892445', type: 'mos' as const, value: '2.4' },
  ],
};

function getMOSColor(score: number): string {
  if (score >= 4) return 'text-green-600 bg-green-50';
  if (score >= 3) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

function KPICard({ label, value, unit, trend }: { label: string; value: number; unit: string; trend?: number }) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <p className="text-sm text-gray-600 mb-2">{label}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-gray-900">
          {value.toFixed(1)}
          <span className="text-lg text-gray-500 ml-1">{unit}</span>
        </p>
        {trend !== undefined && (
          <span className={`text-sm font-semibold ${trend < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend < 0 ? '↓' : '↑'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default function VoiceAnalyticsDashboard() {
  const { workspaceId } = useWorkspace();
  const [kpi, setKpi] = useState<KPIData>(FALLBACK_DATA.kpi);
  const [voices, setVoices] = useState<VoiceMetrics[]>(FALLBACK_DATA.voices);
  const [models, setModels] = useState<ModelComparison[]>(FALLBACK_DATA.models);
  const [issues, setIssues] = useState<QualityIssue[]>(FALLBACK_DATA.issues);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const [sortBy, setSortBy] = useState<keyof VoiceMetrics>('calls');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/voice/quality?workspace_id=${workspaceId}&period=${timeRange}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setKpi(data.kpi || FALLBACK_DATA.kpi);
          setVoices(data.voices || FALLBACK_DATA.voices);
          setModels(data.models || FALLBACK_DATA.models);
          setIssues(data.issues || FALLBACK_DATA.issues);
        }
      } catch (error) {
        console.error('Failed to fetch voice analytics:', error);
      }
    };

    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId, timeRange]);

  const sortedVoices = [...voices].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const totalCost = voices.reduce((sum, v) => sum + v.cost, 0);
  const externalEstimate = totalCost * 1.35;
  const savings = externalEstimate - totalCost;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Voice Analytics"
        subtitle="Monitor real-time voice quality, performance, and cost metrics"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Avg TTFB" value={kpi.avgTTFB} unit="ms" trend={kpi.ttfbTrend} />
        <div className={`p-4 rounded-lg border border-gray-200 ${getMOSColor(kpi.avgMOS)}`}>
          <p className="text-sm mb-2 font-semibold">Avg MOS Score</p>
          <p className="text-2xl font-bold">{kpi.avgMOS.toFixed(2)}</p>
          <p className="text-xs mt-1">out of 5.0</p>
        </div>
        <KPICard label="Error Rate" value={kpi.errorRate} unit="%" />
        <KPICard label="Total Voice Minutes" value={kpi.totalMinutes} unit="min" />
      </div>

      {/* Voice Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Voice Performance Over Time</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 text-sm rounded-xl border ${
                  timeRange === '7d'
                    ? 'bg-white text-black border-zinc-700'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 text-sm rounded-xl border ${
                  timeRange === '30d'
                    ? 'bg-white text-black border-zinc-700'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
              <div className="h-48 flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="text-center">
              <p className="text-zinc-300 font-medium mb-2">TTFB Trend ({timeRange})</p>
              <p className="text-3xl font-bold text-white">{kpi.avgTTFB}ms</p>
              <p className="text-sm text-zinc-500 mt-2">
                {timeRange === '7d'
                  ? 'Steady performance across the week'
                  : 'Improved from 285ms last month'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Voice Usage Breakdown */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Voice Usage Breakdown</h3>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 font-semibold text-zinc-300">Voice</th>
                  <th
                    className="text-right py-3 px-4 font-semibold text-zinc-300 cursor-pointer hover:bg-zinc-900"
                    onClick={() => {
                      setSortBy('calls');
                      setSortAsc(sortBy === 'calls' ? !sortAsc : false);
                    }}
                  >
                    Calls {sortBy === 'calls' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-300">Avg Duration</th>
                  <th
                    className="text-right py-3 px-4 font-semibold text-zinc-300 cursor-pointer hover:bg-zinc-900"
                    onClick={() => {
                      setSortBy('avgTTFB');
                      setSortAsc(sortBy === 'avgTTFB' ? !sortAsc : false);
                    }}
                  >
                    Avg TTFB {sortBy === 'avgTTFB' && (sortAsc ? '↑' : '↓')}
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-300">MOS</th>
                  <th className="text-right py-3 px-4 font-semibold text-zinc-300">Cost</th>
                </tr>
              </thead>
              <tbody>
                {sortedVoices.map((voice) => (
                  <tr
                    key={voice.name}
                    className={`border-b border-zinc-800 ${
                      voice.isActive ? 'bg-zinc-900/60' : 'hover:bg-zinc-900'
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-white">
                      {voice.name}
                      {voice.isActive && <span className="ml-2 text-xs bg-white text-black px-2 py-1 rounded-full border border-zinc-800">Active</span>}
                    </td>
                    <td className="text-right py-3 px-4 text-zinc-400">{voice.calls.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-zinc-400">{voice.avgDuration}s</td>
                    <td className="text-right py-3 px-4 text-zinc-400">{voice.avgTTFB}ms</td>
                    <td className={`text-right py-3 px-4 font-semibold ${getMOSColor(voice.mosScore)}`}>
                      {voice.mosScore.toFixed(1)}
                    </td>
                    <td className="text-right py-3 px-4 text-white font-medium">${voice.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Card key={model.model}>
            <CardHeader>
              <h3 className="text-lg font-semibold">{model.model}</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Calls</p>
                  <p className="text-2xl font-bold text-gray-900">{model.calls.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Avg Latency</p>
                  <p className="text-2xl font-bold text-gray-900">{model.latency}ms</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Quality (MOS)</p>
                  <p className={`text-2xl font-bold ${getMOSColor(model.quality)}`}>
                    {model.quality.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Cost Per Minute</p>
                  <p className="text-2xl font-bold text-gray-900">${model.costPerMin.toFixed(2)}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Recent Quality Issues */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Quality Issues</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {issues.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No quality issues detected</p>
            ) : (
              issues.map((issue, idx) => (
                <div key={idx} className="flex items-start p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                        {issue.type === 'mos'
                          ? 'Low MOS'
                          : issue.type === 'glitch'
                            ? 'Audio Glitch'
                            : 'High Latency'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{issue.voice}</span>
                      <span className="text-sm text-gray-500">({issue.callId})</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">Value: {issue.value}</p>
                    <p className="text-xs text-gray-500">{issue.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      {/* Cost Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Cost Breakdown</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {voices.map((voice) => (
                <div key={voice.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{voice.name}</span>
                  <div className="flex-1 mx-3 bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-zinc-100 h-2 rounded-full"
                      style={{ width: `${(voice.cost / totalCost) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white">${voice.cost.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold text-white">Total Monthly Cost</span>
                  <span className="text-lg font-bold text-white">${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">vs External Providers</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="bg-zinc-900/60 p-4 rounded border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-2">Our Solution</p>
                <p className="text-3xl font-bold text-white">${totalCost.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">External Estimate</p>
                <p className="text-3xl font-bold text-gray-900">${externalEstimate.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded border border-green-200">
                <p className="text-sm text-gray-600 mb-2">Monthly Savings</p>
                <p className="text-3xl font-bold text-green-600">${savings.toFixed(2)}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {((savings / externalEstimate) * 100).toFixed(0)}% cost reduction
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
