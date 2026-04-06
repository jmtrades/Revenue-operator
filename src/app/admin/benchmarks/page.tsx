"use client";

import { useState, useEffect } from "react";

interface _Benchmark {
  metric: string;
  platform_avg: string;
  industry_avg: string;
  percentile: string;
}

function BenchmarkComparison({ metric, platformVal, industryVal, percentile }: { metric: string; platformVal: string; industryVal: string; percentile: string }) {
  const isWinning = percentile.startsWith("Top");
  return (
    <tr
      className="border-b"
      style={{
        borderColor: "var(--border-default)",
        background: isWinning ? "rgba(34, 197, 94, 0.05)" : "transparent",
      }}
    >
      <td className="p-3 font-medium" style={{ color: "var(--text-primary)" }}>
        {metric}
      </td>
      <td className="p-3" style={{ color: "var(--accent-primary)" }}>
        {platformVal}
      </td>
      <td className="p-3" style={{ color: "var(--text-secondary)" }}>
        {industryVal}
      </td>
      <td className="p-3 text-sm">
        <span
          style={{
            color: isWinning ? "var(--meaning-green)" : "var(--text-tertiary)",
            fontWeight: isWinning ? 600 : 400,
          }}
        >
          {percentile}
        </span>
      </td>
    </tr>
  );
}

interface BenchmarkData {
  metric: string;
  platform: string;
  industry: string;
  percentile: string;
}

interface IndustryBenchmarks {
  name: string;
  benchmarks: BenchmarkData[];
  dataSource?: string;
}

export default function BenchmarksPage() {
  const [selectedIndustry, setSelectedIndustry] = useState("saas");
  const [loading, setLoading] = useState(true);
  const [benchmarks, setBenchmarks] = useState<Record<string, IndustryBenchmarks> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/benchmarks", { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) {
            setError("Benchmark data endpoint not yet implemented");
          } else {
            throw new Error(`HTTP ${r.status}`);
          }
        } else {
          return r.json();
        }
      })
      .then((data) => {
        if (data) {
          setBenchmarks(data);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const industries: Record<string, IndustryBenchmarks> = benchmarks || {
    saas: {
      name: "SaaS",
      benchmarks: [],
      dataSource: "No data available",
    },
    enterprise: {
      name: "Enterprise Software",
      benchmarks: [],
      dataSource: "No data available",
    },
    comms: {
      name: "Communications Platform",
      benchmarks: [],
      dataSource: "No data available",
    },
  };

  if (loading) {
    return (
      <div className="max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Benchmarks</h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
            Compare your platform metrics against industry averages
          </p>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>Loading benchmarks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Benchmarks</h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
            Compare your platform metrics against industry averages
          </p>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: "var(--meaning-red)", background: "var(--bg-surface)" }}>
          <p style={{ color: "var(--meaning-red)" }}>Unable to load benchmarks: {error}</p>
          <p style={{ color: "var(--text-tertiary)" }} className="text-sm mt-2">
            Connect a data source to populate benchmark metrics.
          </p>
        </div>
      </div>
    );
  }

  type IndustryKey = keyof typeof industries;
  const current = industries[selectedIndustry as IndustryKey] || industries.saas;
  const hasBenchmarkData = current.benchmarks && current.benchmarks.length > 0;

  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Benchmarks</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-1">
          Compare your platform metrics against industry averages
        </p>
      </div>

      {/* Industry Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(industries).map(([key, industry]) => (
          <button
            key={key}
            onClick={() => setSelectedIndustry(key)}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: "var(--border-default)",
              background: selectedIndustry === key ? "var(--accent-primary-subtle)" : "transparent",
              color: selectedIndustry === key ? "var(--accent-primary)" : "var(--text-secondary)",
            }}
          >
            {industry.name}
          </button>
        ))}
      </div>

      {/* Benchmarks Table */}
      {!hasBenchmarkData ? (
        <div
          className="rounded-lg border p-12 text-center"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            No benchmark data available for {current.name}
          </p>
          <p style={{ color: "var(--text-tertiary)" }} className="text-sm mt-2">
            {current.dataSource || "Connect a data source to see benchmarks"}
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}>
                <th className="p-3 text-left font-medium">Metric</th>
                <th className="p-3 text-left font-medium">Your Platform</th>
                <th className="p-3 text-left font-medium">Industry Avg</th>
                <th className="p-3 text-left font-medium">Percentile</th>
              </tr>
            </thead>
            <tbody>
              {current.benchmarks.map((bench, i) => (
                <BenchmarkComparison
                  key={i}
                  metric={bench.metric}
                  platformVal={bench.platform}
                  industryVal={bench.industry}
                  percentile={bench.percentile}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend & Notes */}
      <section>
        <h2 className="text-lg font-semibold mb-4">How We Calculate Benchmarks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="rounded-lg border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h3 className="font-medium mb-3">Methodology</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>• Aggregated from 500+ platform customers</li>
              <li>• Monthly data refresh cycle</li>
              <li>• Anonymized and normalized</li>
              <li>• Segmented by customer tier</li>
              <li>• Rolling 90-day averages</li>
            </ul>
          </div>

          <div
            className="rounded-lg border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h3 className="font-medium mb-3">Data Quality</h3>
            <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>• Benchmarks build over time</li>
              <li>• Require 30+ data points per metric</li>
              <li>• Updated monthly</li>
              <li>• Machine learning outlier detection</li>
              <li>• Confidence intervals calculated</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}
