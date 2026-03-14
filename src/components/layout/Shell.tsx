"use client";
import { cn } from "@/lib/utils";
import type { FilterState } from "@/types";

const METRICS = [
  { key: "composite", label: "Composite" },
  { key: "acqScore", label: "Acquisition" },
  { key: "civicScore", label: "Civic" },
  { key: "senatorResponsivenessScore", label: "Sen. Responsive" },
  { key: "civicEngagementScore", label: "Civic Engagement" },
  { key: "ccEnrollmentScore", label: "CC Enrollment" },
  { key: "eitcOpportunityScore", label: "EITC Opportunity" },
  { key: "competitiveDistrictDensityScore", label: "Competitive Dist." },
  { key: "urbanConcentrationScore", label: "Urban Conc." },
];

interface Props {
  view: string;
  onViewChange: (v: "command" | "explore" | "target") => void;
  filters: FilterState;
  toggleLayer: (l: keyof FilterState["layers"]) => void;
  metricOverlay: string;
  onMetricChange: (m: string) => void;
  onReset: () => void;
  children: React.ReactNode;
}

export default function Shell({
  view,
  onViewChange,
  filters,
  toggleLayer,
  metricOverlay,
  onMetricChange,
  onReset,
  children,
}: Props) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]" />
          <span className="text-xs font-bold tracking-[0.2em] text-[var(--accent-cyan)]">
            GTM COMMAND
          </span>
        </div>

        {/* View tabs */}
        <nav className="flex gap-1 ml-6">
          {(["command", "explore", "target"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={cn(
                "px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-colors",
                view === v
                  ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              {v === "command" ? "Command" : v === "explore" ? "Explore" : "Target"}
            </button>
          ))}
        </nav>

        {/* Layer toggles */}
        {view === "command" && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Layers</span>
            {(Object.keys(filters.layers) as Array<keyof FilterState["layers"]>).map((layer) => (
              <button
                key={layer}
                onClick={() => toggleLayer(layer)}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-mono uppercase rounded border transition-colors",
                  filters.layers[layer]
                    ? "border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                )}
              >
                {layer}
              </button>
            ))}

            <div className="w-px h-4 bg-[var(--border)] mx-1" />

            {/* Metric selector */}
            <select
              value={metricOverlay}
              onChange={(e) => onMetricChange(e.target.value)}
              className="bg-[var(--bg-panel)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] rounded px-2 py-0.5 font-mono"
            >
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              onClick={onReset}
              className="text-[9px] text-[var(--text-muted)] hover:text-[var(--accent-red)] font-mono uppercase"
            >
              Reset
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
