"use client";
import { useMemo } from "react";
import type { ScoredState, FilterState, Candidate, Campus, DistrictMeta } from "@/types";
import { formatNumber, formatPct, stateAbbrToName, parsePVI } from "@/lib/utils";
import { getQuadrantColor, getQuadrantLabel, DIMENSION_KEYS } from "@/lib/scoring";

interface Props {
  scored: ScoredState[];
  data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  filters: FilterState;
  onDistrictSelect: (code: string | null) => void;
  onStateSelect: (abbr: string | null) => void;
}

// Safely render a value - if it's an object, return "—"
function safeStr(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return "—";
  return String(v);
}

export default function DetailPanel({ scored, data, filters, onDistrictSelect, onStateSelect }: Props) {
  const selectedScored = useMemo(
    () => scored.find((s) => s.abbr === filters.selectedState),
    [scored, filters.selectedState]
  );

  const stateDistricts = useMemo(
    () =>
      filters.selectedState
        ? data.districts.filter((d: DistrictMeta) => d.state === filters.selectedState)
        : [],
    [data.districts, filters.selectedState]
  );

  const stateCampuses = useMemo(
    () =>
      filters.selectedState
        ? data.campuses.filter((c: Campus) => c.properties.state === filters.selectedState)
        : [],
    [data.campuses, filters.selectedState]
  );

  const stateCandidates = useMemo(
    () =>
      filters.selectedState
        ? data.candidates.filter(
            (c: Candidate) =>
              c.state_code === filters.selectedState ||
              c.state === stateAbbrToName(filters.selectedState!)
          )
        : [],
    [data.candidates, filters.selectedState]
  );

  const selectedDistrict = useMemo(
    () =>
      filters.selectedDistrict
        ? data.districts.find(
            (d: DistrictMeta) =>
              `${d.state}-${String(d.district_number).padStart(2, "0")}` ===
              filters.selectedDistrict
          )
        : null,
    [data.districts, filters.selectedDistrict]
  );

  if (!filters.selectedState) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-3 opacity-20">⬡</div>
        <div className="text-sm text-[var(--text-muted)] font-mono">
          Select a state to inspect
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-2 font-mono">
          Click on the map or ranking list
        </div>
        <div className="mt-6 text-[10px] text-[var(--text-muted)] font-mono max-w-[200px]">
          <div className="mb-1 text-[var(--text-secondary)]">Quick stats</div>
          <div>{scored.length} states scored</div>
          <div>{data.campuses.length} campuses tracked</div>
          <div>{data.candidates.length} candidates filed</div>
          <div>{data.districts.length} districts mapped</div>
        </div>
      </div>
    );
  }

  if (!selectedScored) return null;

  const s = selectedScored;
  const sd = s.data;

  return (
    <div className="h-full overflow-y-auto">
      {/* State header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-mono font-bold">{s.abbr}</div>
            <div className="text-xs text-[var(--text-muted)]">{stateAbbrToName(s.abbr)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-bold" style={{ color: getQuadrantColor(s.quadrant) }}>
              #{s.rank}
            </div>
            <div className="text-[9px] font-mono uppercase" style={{ color: getQuadrantColor(s.quadrant) }}>
              {getQuadrantLabel(s.quadrant)}
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-[var(--bg-panel)] rounded p-2">
            <div className="text-lg font-mono font-bold">{s.composite.toFixed(1)}</div>
            <div className="text-[8px] text-[var(--text-muted)] uppercase">Composite</div>
          </div>
          <div className="bg-[var(--bg-panel)] rounded p-2">
            <div className="text-lg font-mono font-bold text-[var(--accent-green)]">
              {s.acqScore.toFixed(1)}
            </div>
            <div className="text-[8px] text-[var(--text-muted)] uppercase">Acquisition</div>
          </div>
          <div className="bg-[var(--bg-panel)] rounded p-2">
            <div className="text-lg font-mono font-bold text-[var(--accent-orange)]">
              {s.civicScore.toFixed(1)}
            </div>
            <div className="text-[8px] text-[var(--text-muted)] uppercase">Civic</div>
          </div>
        </div>
      </div>

      {/* Anomalies */}
      {s.anomalies.length > 0 && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--accent-red)]/5">
          <div className="text-[9px] font-mono uppercase text-[var(--accent-red)] mb-2">
            ⚠ {s.anomalies.length} Statistical Anomal{s.anomalies.length === 1 ? "y" : "ies"}
          </div>
          {s.anomalies.map((a, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-mono py-1">
              <span className="text-[var(--text-secondary)]">{a.label}</span>
              <div className="flex items-center gap-2">
                <span className={a.direction === "high" ? "text-[var(--accent-red)]" : "text-[var(--accent-blue)]"}>
                  {a.direction === "high" ? "▲" : "▼"} z={a.zScore.toFixed(1)}
                </span>
                <span className="text-[var(--text-muted)]">{formatNumber(a.value)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dimension scores */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">
          Scoring Dimensions
        </div>
        {Object.entries(DIMENSION_KEYS).map(([key, dim]) => {
          const val = s.dimensionScores[key] || 0;
          return (
            <div key={key} className="flex items-center gap-2 py-1">
              <span className="text-[10px] text-[var(--text-secondary)] font-mono w-28 truncate">
                {dim.label}
              </span>
              <div className="flex-1 h-1.5 bg-[var(--bg-primary)] rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${val}%`,
                    backgroundColor: val > 70 ? "#10b981" : val > 40 ? "#f59e0b" : "#64748b",
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-right">
                {val.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Senators */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">Senators</div>
        {[1, 2].map((n) => {
          const name = sd[`senator${n}` as keyof typeof sd] as string;
          const party = sd[`senator${n}Party` as keyof typeof sd] as string;
          const margin = sd[`senator${n}LastMargin` as keyof typeof sd] as number;
          const nextElection = sd[`senator${n}NextElection` as keyof typeof sd] as number;
          if (!name) return null;
          return (
            <div key={n} className="flex items-center justify-between py-1 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: party === "R" ? "#ef444433" : "#3b82f633",
                    color: party === "R" ? "#ef4444" : "#3b82f6",
                  }}
                >
                  {party}
                </span>
                <span className="text-[var(--text-primary)]">{name}</span>
              </div>
              <div className="text-right text-[var(--text-muted)]">
                <div>+{margin?.toFixed(1)}%</div>
                <div className="text-[8px]">Up {nextElection}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key metrics */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">Key Metrics</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Cook PVI", value: safeStr(sd.cookPVI) },
            { label: "Midterm Turnout", value: typeof sd.midtermTurnout2022 === "number" ? formatPct(sd.midtermTurnout2022) : "—" },
            { label: "Urban Pop", value: typeof sd.urbanPopPct === "number" ? formatPct(sd.urbanPopPct as number) : "—" },
            { label: "EITC Unclaimed", value: typeof sd.eitcUnclaimedRate === "number" ? formatPct(sd.eitcUnclaimedRate as number) : "—" },
            { label: "Fed Tax Paid", value: typeof sd.totalFedTaxPaidB === "number" ? `$${sd.totalFedTaxPaidB}B` : "—" },
            { label: "Young Profs", value: formatNumber(sd.youngProfessionalPop as number) },
            { label: "CC Enrollment", value: formatNumber(sd.collegeEnrollment as number) },
            { label: "Adult Pop", value: formatNumber(sd.adultPop18 as number) },
          ].map((m, i) => (
            <div key={i} className="bg-[var(--bg-panel)] rounded p-2">
              <div className="text-[8px] text-[var(--text-muted)] uppercase">{m.label}</div>
              <div className="text-xs font-mono font-bold">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Districts */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">
          Districts ({stateDistricts.length})
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {stateDistricts.map((d: DistrictMeta) => {
            const code = `${d.state}-${String(d.district_number).padStart(2, "0")}`;
            const isSelected = filters.selectedDistrict === code;
            return (
              <button
                key={code}
                onClick={() => onDistrictSelect(isSelected ? null : code)}
                className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono hover:bg-[var(--bg-hover)] ${
                  isSelected ? "bg-[var(--bg-hover)] border border-[var(--accent-cyan)]/30" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: d.party === "R" ? "#ef444433" : "#3b82f633",
                      color: d.party === "R" ? "#ef4444" : "#3b82f6",
                    }}
                  >
                    {d.party}
                  </span>
                  <span>{code}</span>
                  <span className="text-[var(--text-muted)] truncate max-w-[100px]">{d.member}</span>
                </div>
                <span className="text-[var(--text-muted)]">{d.cook_pvi}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campuses */}
      <div className="p-3 border-b border-[var(--border)]">
        <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">
          Campuses ({stateCampuses.length})
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {stateCampuses
            .sort((a: Campus, b: Campus) => (b.properties.enrollment || 0) - (a.properties.enrollment || 0))
            .slice(0, 20)
            .map((c: Campus, i: number) => (
              <div key={i} className="flex items-center justify-between px-2 py-1 text-xs font-mono">
                <span className="truncate max-w-[180px] text-[var(--text-secondary)]">
                  {c.properties.name}
                </span>
                <span className="text-[var(--accent-cyan)]">
                  {formatNumber(c.properties.enrollment)}
                </span>
              </div>
            ))}
          {stateCampuses.length > 20 && (
            <div className="text-[9px] text-[var(--text-muted)] text-center font-mono">
              +{stateCampuses.length - 20} more
            </div>
          )}
        </div>
      </div>

      {/* Candidates */}
      <div className="p-3">
        <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">
          2026 Candidates ({stateCandidates.length})
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {stateCandidates.slice(0, 15).map((c: Candidate, i: number) => (
            <div key={i} className="flex items-center justify-between px-2 py-1 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full text-[7px] flex items-center justify-center"
                  style={{
                    backgroundColor:
                      c.party_code === "REP" || c.party === "REP"
                        ? "#ef444433"
                        : c.party_code === "DEM" || c.party === "DEM"
                        ? "#3b82f633"
                        : "#64748b33",
                    color:
                      c.party_code === "REP" || c.party === "REP"
                        ? "#ef4444"
                        : c.party_code === "DEM" || c.party === "DEM"
                        ? "#3b82f6"
                        : "#64748b",
                  }}
                >
                  {(c.party_code || c.party || "?").charAt(0)}
                </span>
                <span className="truncate max-w-[140px]">{c.name}</span>
              </div>
              <div className="text-right text-[var(--text-muted)]">
                <div className="text-[9px]">{c.district}</div>
                {c.total_receipts != null && (
                  <div className="text-[8px]">${formatNumber(c.total_receipts)}</div>
                )}
              </div>
            </div>
          ))}
          {stateCandidates.length > 15 && (
            <div className="text-[9px] text-[var(--text-muted)] text-center font-mono">
              +{stateCandidates.length - 15} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
