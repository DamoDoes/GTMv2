"use client";
import { useMemo } from "react";
import type { Anomaly } from "@/types";
import { cn } from "@/lib/utils";

interface TickerAnomaly extends Anomaly {
  state: string;
}

interface Props {
  anomalies: TickerAnomaly[];
  onStateClick: (abbr: string) => void;
}

export default function AnomalyTicker({ anomalies, onStateClick }: Props) {
  const extremes = useMemo(
    () =>
      anomalies
        .filter((a) => a.severity === "extreme")
        .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
        .slice(0, 20),
    [anomalies]
  );

  if (extremes.length === 0) return null;

  return (
    <div className="h-6 bg-[var(--accent-red)]/5 border-b border-[var(--accent-red)]/20 flex items-center overflow-hidden px-3">
      <span className="text-[8px] font-mono uppercase text-[var(--accent-red)] mr-3 flex-shrink-0 anomaly-indicator">
        ⚠ ANOMALIES
      </span>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {extremes.map((a, i) => (
          <button
            key={i}
            onClick={() => onStateClick(a.state)}
            className="flex items-center gap-1 text-[9px] font-mono flex-shrink-0 hover:text-[var(--accent-red)] transition-colors"
          >
            <span className="text-[var(--accent-cyan)]">{a.state}</span>
            <span className={a.direction === "high" ? "text-[var(--accent-red)]" : "text-[var(--accent-blue)]"}>
              {a.direction === "high" ? "▲" : "▼"}
            </span>
            <span className="text-[var(--text-muted)]">{a.label}</span>
            <span className="text-[var(--text-muted)]">z={a.zScore.toFixed(1)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
