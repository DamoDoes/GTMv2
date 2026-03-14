"use client";
import { useState, useMemo } from "react";
import type { ScoredState, ScoringConfig } from "@/types";
import { getQuadrantColor, getQuadrantLabel, getTierColor } from "@/lib/scoring";
import { cn, stateAbbrToName } from "@/lib/utils";

interface Props {
  scored: ScoredState[];
  selectedState: string | null;
  onSelect: (abbr: string | null) => void;
  config: ScoringConfig;
}

export default function RankingPanel({ scored, selectedState, onSelect, config }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "anomalies" | "acq" | "civic">("rank");

  const filtered = useMemo(() => {
    let list = [...scored];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.abbr.toLowerCase().includes(q) ||
          stateAbbrToName(s.abbr).toLowerCase().includes(q)
      );
    }
    switch (sortBy) {
      case "anomalies":
        list.sort((a, b) => b.anomalies.length - a.anomalies.length);
        break;
      case "acq":
        list.sort((a, b) => b.acqScore - a.acqScore);
        break;
      case "civic":
        list.sort((a, b) => b.civicScore - a.civicScore);
        break;
      default:
        list.sort((a, b) => a.rank - b.rank);
    }
    return list;
  }, [scored, search, sortBy]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-2">
          State Rankings
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter states..."
          className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-cyan)] focus:outline-none"
        />
        <div className="flex gap-1 mt-2">
          {(["rank", "anomalies", "acq", "civic"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={cn(
                "px-2 py-0.5 text-[9px] font-mono uppercase rounded",
                sortBy === s
                  ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {s === "anomalies" ? "⚠ anom" : s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((s) => (
          <button
            key={s.abbr}
            onClick={() => onSelect(selectedState === s.abbr ? null : s.abbr)}
            className={cn(
              "w-full text-left px-3 py-2 border-b border-[var(--border)]/50 hover:bg-[var(--bg-hover)] transition-colors",
              selectedState === s.abbr && "bg-[var(--bg-hover)] border-l-2 border-l-[var(--accent-cyan)]"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono font-bold w-6 text-center"
                  style={{ color: getTierColor(s.tier) }}
                >
                  #{s.rank}
                </span>
                <div>
                  <div className="text-xs font-mono font-bold">{s.abbr}</div>
                  <div className="text-[9px] text-[var(--text-muted)]">
                    {stateAbbrToName(s.abbr)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono" style={{ color: getQuadrantColor(s.quadrant) }}>
                  {s.composite.toFixed(1)}
                </div>
                <div
                  className="text-[8px] font-mono uppercase"
                  style={{ color: getQuadrantColor(s.quadrant) }}
                >
                  {s.quadrant === "launch"
                    ? "LAUNCH"
                    : s.quadrant === "revenue"
                    ? "REVENUE"
                    : s.quadrant === "civic"
                    ? "CIVIC"
                    : "DEPR"}
                </div>
              </div>
            </div>

            {/* Score bars */}
            <div className="mt-1 flex gap-1">
              <div className="flex-1">
                <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-mono">
                  <span>ACQ</span>
                  <span>{s.acqScore.toFixed(0)}</span>
                </div>
                <div className="h-1 bg-[var(--bg-primary)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-green)] rounded"
                    style={{ width: `${s.acqScore}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-mono">
                  <span>CIV</span>
                  <span>{s.civicScore.toFixed(0)}</span>
                </div>
                <div className="h-1 bg-[var(--bg-primary)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-orange)] rounded"
                    style={{ width: `${s.civicScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Anomaly badges */}
            {s.anomalies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {s.anomalies.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[7px] font-mono px-1 rounded",
                      a.severity === "extreme"
                        ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                        : "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]"
                    )}
                  >
                    {a.direction === "high" ? "↑" : "↓"} {a.label}
                  </span>
                ))}
                {s.anomalies.length > 3 && (
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">
                    +{s.anomalies.length - 3}
                  </span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
