"use client";
import { useState, useMemo } from "react";
import type { ScoredState, ScoringConfig, Campus, DistrictMeta } from "@/types";
import { DIMENSION_KEYS, getQuadrantColor, getQuadrantLabel, getTierColor } from "@/lib/scoring";
import { cn, stateAbbrToName, formatNumber } from "@/lib/utils";

interface Props {
  scored: ScoredState[];
  data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  config: ScoringConfig;
  onConfigChange: (c: ScoringConfig) => void;
  presets: Record<string, ScoringConfig>;
  onStateSelect: (abbr: string | null) => void;
}

export default function TargetView({
  scored,
  data,
  config,
  onConfigChange,
  presets,
  onStateSelect,
}: Props) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);

  // Quadrant chart dimensions
  const chartW = 500;
  const chartH = 400;
  const pad = 40;

  const { maxAcq, maxCivic, acqMedian, civicMedian } = useMemo(() => {
    const acqs = scored.map((s) => s.acqScore);
    const civics = scored.map((s) => s.civicScore);
    const sortedAcq = [...acqs].sort((a, b) => a - b);
    const sortedCivic = [...civics].sort((a, b) => a - b);
    const p60 = Math.floor(sortedAcq.length * 0.6);
    return {
      maxAcq: Math.max(...acqs, 100),
      maxCivic: Math.max(...civics, 100),
      acqMedian: sortedAcq[p60] || 50,
      civicMedian: sortedCivic[p60] || 50,
    };
  }, [scored]);

  const handleWeightChange = (lens: "acquisitionWeights" | "civicWeights", key: string, val: number) => {
    onConfigChange({
      ...config,
      [lens]: { ...config[lens], [key]: val },
    });
  };

  return (
    <div className="flex h-full">
      {/* Scoring panel */}
      {showPanel && (
        <div className="w-80 flex-shrink-0 border-r border-[var(--border)] overflow-y-auto bg-[var(--bg-secondary)]">
          <div className="p-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                Scoring Config
              </span>
              <button
                onClick={() => setShowPanel(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div className="flex gap-1 mb-3">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => onConfigChange(preset)}
                  className={cn(
                    "px-2 py-1 text-[9px] font-mono uppercase rounded border",
                    config.alpha === preset.alpha
                      ? "border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
                  )}
                >
                  {key === "studentReach" ? "Students" : key === "politicalImpact" ? "Political" : "Balanced"}
                </button>
              ))}
            </div>

            {/* Alpha slider */}
            <div className="mb-4">
              <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] mb-1">
                <span className="text-[var(--accent-orange)]">← Civic</span>
                <span>α = {config.alpha.toFixed(2)}</span>
                <span className="text-[var(--accent-green)]">Acq →</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.alpha}
                onChange={(e) => onConfigChange({ ...config, alpha: parseFloat(e.target.value) })}
                className="w-full h-1 accent-[var(--accent-cyan)]"
              />
            </div>
          </div>

          {/* Weight sliders */}
          {(["acquisitionWeights", "civicWeights"] as const).map((lens) => (
            <div key={lens} className="p-3 border-b border-[var(--border)]">
              <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">
                {lens === "acquisitionWeights" ? "Acquisition Weights" : "Civic Weights"}
              </div>
              {Object.entries(DIMENSION_KEYS).map(([key, dim]) => (
                <div key={key} className="mb-2">
                  <div className="flex justify-between text-[9px] font-mono text-[var(--text-secondary)]">
                    <span>{dim.label}</span>
                    <span>{config[lens][key] || 0}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={config[lens][key] || 0}
                    onChange={(e) => handleWeightChange(lens, key, parseInt(e.target.value))}
                    className="w-full h-0.5 accent-[var(--accent-cyan)]"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="absolute left-2 top-14 z-10 bg-[var(--bg-panel)] border border-[var(--border)] rounded px-2 py-1 text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
          >
            ⚙ Config
          </button>
        )}

        <div className="flex-1 flex">
          {/* Quadrant chart */}
          <div className="flex-1 flex items-center justify-center p-4">
            <svg width={chartW} height={chartH} className="overflow-visible">
              {/* Grid */}
              <rect x={pad} y={0} width={chartW - pad * 2} height={chartH - pad} fill="rgba(26,34,53,0.5)" rx={4} />

              {/* Quadrant lines */}
              <line
                x1={pad + ((acqMedian / maxAcq) * (chartW - pad * 2))}
                y1={0}
                x2={pad + ((acqMedian / maxAcq) * (chartW - pad * 2))}
                y2={chartH - pad}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <line
                x1={pad}
                y1={chartH - pad - (civicMedian / maxCivic) * (chartH - pad)}
                x2={chartW - pad}
                y2={chartH - pad - (civicMedian / maxCivic) * (chartH - pad)}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />

              {/* Quadrant labels */}
              <text x={pad + 4} y={14} className="text-[8px] font-mono" fill="var(--accent-orange)" opacity={0.5}>
                CIVIC BEACHHEAD
              </text>
              <text x={chartW - pad - 4} y={14} textAnchor="end" className="text-[8px] font-mono" fill="var(--accent-blue)" opacity={0.5}>
                LAUNCH PRIORITY
              </text>
              <text x={pad + 4} y={chartH - pad - 4} className="text-[8px] font-mono" fill="var(--text-muted)" opacity={0.5}>
                DEPRIORITIZE
              </text>
              <text x={chartW - pad - 4} y={chartH - pad - 4} textAnchor="end" className="text-[8px] font-mono" fill="var(--accent-green)" opacity={0.5}>
                REVENUE OPP
              </text>

              {/* Axis labels */}
              <text x={chartW / 2} y={chartH - 5} textAnchor="middle" className="text-[9px] font-mono" fill="var(--text-muted)">
                Acquisition Score →
              </text>
              <text x={10} y={chartH / 2} textAnchor="middle" className="text-[9px] font-mono" fill="var(--text-muted)" transform={`rotate(-90, 10, ${chartH / 2})`}>
                Civic Score →
              </text>

              {/* State dots */}
              {scored.map((s) => {
                const x = pad + (s.acqScore / maxAcq) * (chartW - pad * 2);
                const y = chartH - pad - (s.civicScore / maxCivic) * (chartH - pad);
                const isHovered = hoveredState === s.abbr;
                return (
                  <g key={s.abbr}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 8 : s.tier === 1 ? 6 : s.tier === 2 ? 4.5 : 3.5}
                      fill={getQuadrantColor(s.quadrant)}
                      opacity={isHovered ? 1 : 0.7}
                      stroke={isHovered ? "#fff" : "none"}
                      strokeWidth={2}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredState(s.abbr)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => onStateSelect(s.abbr)}
                    />
                    {(isHovered || s.tier === 1) && (
                      <text
                        x={x}
                        y={y - (isHovered ? 12 : 9)}
                        textAnchor="middle"
                        className="text-[8px] font-mono font-bold pointer-events-none"
                        fill={isHovered ? "#fff" : "var(--text-secondary)"}
                      >
                        {s.abbr}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Results table */}
          <div className="w-80 border-l border-[var(--border)] overflow-y-auto">
            <div className="p-2 border-b border-[var(--border)]">
              <div className="text-[9px] font-mono uppercase text-[var(--text-muted)]">
                Rankings by Tier
              </div>
            </div>
            {[1, 2, 3].map((tier) => {
              const tierStates = scored.filter((s) => s.tier === tier);
              return (
                <div key={tier} className="border-b border-[var(--border)]">
                  <div
                    className="px-3 py-1.5 text-[9px] font-mono uppercase flex items-center gap-2"
                    style={{ color: getTierColor(tier) }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getTierColor(tier) }} />
                    Tier {tier} ({tierStates.length})
                  </div>
                  {tierStates.map((s) => (
                    <button
                      key={s.abbr}
                      onClick={() => onStateSelect(s.abbr)}
                      onMouseEnter={() => setHoveredState(s.abbr)}
                      onMouseLeave={() => setHoveredState(null)}
                      className={cn(
                        "w-full text-left px-3 py-1 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors",
                        hoveredState === s.abbr && "bg-[var(--bg-hover)]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] w-5">
                          #{s.rank}
                        </span>
                        <span className="text-xs font-mono font-bold">{s.abbr}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">
                          {stateAbbrToName(s.abbr)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono">{s.composite.toFixed(1)}</span>
                        {s.anomalies.length > 0 && (
                          <span className="text-[8px] text-[var(--accent-red)]">⚠</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
