"use client";

import {
  LayoutDashboard,
  Phone,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";

const ROWS = [
  { name: "Marcus Johnson", time: "09:14 AM", duration: "4m 32s", status: "governed" as const, jurisdiction: "US-CA" },
  { name: "Sarah Chen", time: "09:31 AM", duration: "2m 15s", status: "pending" as const, jurisdiction: "UK" },
  { name: "Alex Rivera", time: "10:02 AM", duration: "6m 48s", status: "governed" as const, jurisdiction: "US-CA" },
  { name: "Jamie Okafor", time: "10:17 AM", duration: "3m 05s", status: "governed" as const, jurisdiction: "EU" },
  { name: "Priya Sharma", time: "10:44 AM", duration: "1m 52s", status: "pending" as const, jurisdiction: "UK" },
];

const SIDEBAR_ICONS = [
  { icon: LayoutDashboard, active: false },
  { icon: Phone, active: true },
  { icon: FileText, active: false },
  { icon: BarChart3, active: false },
  { icon: Settings, active: false },
];

export function MockDashboard() {
  return (
    <div
      className="w-full max-w-[900px] mx-auto rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-inset)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-glow-lg)",
      }}
      role="img"
      aria-label="Recall Touch product view showing active call records"
      aria-hidden="true"
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
      >
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,95,86,0.9)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,189,90,0.9)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(39,201,63,0.9)" }} />
        </div>
        <span className="text-xs flex-1 text-center" style={{ color: "var(--text-tertiary)" }}>
          Recall Touch — Active records
        </span>
        <div className="w-12" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className="w-12 shrink-0 py-4 flex flex-col items-center gap-1 border-r hidden sm:flex"
          style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
        >
          {SIDEBAR_ICONS.map((item, idx) => (
            <div
              key={idx}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: item.active ? "var(--accent-primary-subtle)" : "transparent",
                color: item.active ? "var(--accent-primary)" : "var(--text-tertiary)",
              }}
            >
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 p-4 sm:p-6" style={{ background: "var(--bg-primary)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Active Records
            </h3>
            <div
              className="h-9 px-3 rounded-md border text-sm w-full sm:w-48"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border-default)",
                color: "var(--text-tertiary)",
              }}
            >
              Search calls…
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <th className="text-xs font-semibold uppercase tracking-wider py-3 px-4" style={{ color: "var(--text-tertiary)" }}>Name</th>
                  <th className="text-xs font-semibold uppercase tracking-wider py-3 px-4" style={{ color: "var(--text-tertiary)" }}>Time</th>
                  <th className="text-xs font-semibold uppercase tracking-wider py-3 px-4 hidden md:table-cell" style={{ color: "var(--text-tertiary)" }}>Duration</th>
                  <th className="text-xs font-semibold uppercase tracking-wider py-3 px-4" style={{ color: "var(--text-tertiary)" }}>Status</th>
                  <th className="text-xs font-semibold uppercase tracking-wider py-3 px-4 hidden lg:table-cell" style={{ color: "var(--text-tertiary)" }}>Jurisdiction</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.name}
                    className="transition-colors"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                    }}
                  >
                    <td className="py-3 px-4 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.name}</td>
                    <td className="py-3 px-4 text-mono text-sm" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-jetbrains-mono), var(--font-geist-mono), monospace" }}>{row.time}</td>
                    <td className="py-3 px-4 text-mono text-sm hidden md:table-cell" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-jetbrains-mono), var(--font-geist-mono), monospace" }}>{row.duration}</td>
                    <td className="py-3 px-4">
                      <span className={row.status === "governed" ? "pill-governed" : "pill-pending"}>
                        {row.status === "governed" && <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />}
                        {row.status === "governed" ? "Governed" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs hidden lg:table-cell" style={{ color: "var(--text-tertiary)" }}>{row.jurisdiction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
