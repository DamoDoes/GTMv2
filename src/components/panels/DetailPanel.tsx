"use client";
import { useMemo, useState } from "react";
import type { ScoredState, FilterState, Candidate, Campus, DistrictMeta, ProtestEvent } from "@/types";
import { formatNumber, formatPct, stateAbbrToName, parsePVI } from "@/lib/utils";
import { getQuadrantColor, getQuadrantLabel, DIMENSION_KEYS } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface Props {
  scored: ScoredState[];
  data: Record<string, any>;
  filters: FilterState;
  onDistrictSelect: (code: string | null) => void;
  onStateSelect: (abbr: string | null) => void;
}

function safeStr(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return "—";
  return String(v);
}

type DetailTab = "overview" | "districts" | "campuses" | "candidates" | "activism" | "trends";

export default function DetailPanel({ scored, data, filters, onDistrictSelect, onStateSelect }: Props) {
  const [tab, setTab] = useState<DetailTab>("overview");

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

  const stateProtests = useMemo(
    () =>
      filters.selectedState
        ? data.protests.filter((p: ProtestEvent) => p.state === filters.selectedState)
        : [],
    [data.protests, filters.selectedState]
  );

  const politicianIssues = useMemo(() => {
    if (!filters.selectedState || !data.politicianIssues) return null;
    return data.politicianIssues[filters.selectedState] || data.politicianIssues[stateAbbrToName(filters.selectedState!)] || null;
  }, [data.politicianIssues, filters.selectedState]);

  // Get trends for this state's districts
  const stateTrends = useMemo(() => {
    if (!filters.selectedState || !data.trendsByDistrict) return {};
    const trends: Record<string, Record<string, number>> = {};
    const tbd = data.trendsByDistrict as Record<string, Record<string, number>>;
    for (const [key, val] of Object.entries(tbd)) {
      if (key.startsWith(filters.selectedState + "-") || key.startsWith(filters.selectedState)) {
        trends[key] = val;
      }
    }
    return trends;
  }, [data.trendsByDistrict, filters.selectedState]);

  // Aggregate top trending issues across state
  const topTrends = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const districtTrends of Object.values(stateTrends)) {
      for (const [topic, score] of Object.entries(districtTrends)) {
        if (topic === "state" || topic === "district" || topic === "district_number") continue;
        if (!sums[topic]) sums[topic] = { total: 0, count: 0 };
        sums[topic].total += score;
        sums[topic].count += 1;
      }
    }
    return Object.entries(sums)
      .map(([topic, { total, count }]) => ({ topic, avg: total / count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 15);
  }, [stateTrends]);

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
          <div>{data.protests.length} protest events</div>
        </div>
      </div>
    );
  }

  if (!selectedScored) return null;

  const s = selectedScored;
  const sd = s.data;

  const TABS: { key: DetailTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "districts", label: "Districts", count: stateDistricts.length },
    { key: "campuses", label: "Campuses", count: stateCampuses.length },
    { key: "candidates", label: "Candidates", count: stateCandidates.length },
    { key: "activism", label: "Activism", count: stateProtests.length },
    { key: "trends", label: "Trends", count: topTrends.length },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* State header - always visible */}
      <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0">
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
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-[var(--bg-panel)] rounded p-1.5">
            <div className="text-sm font-mono font-bold">{s.composite.toFixed(1)}</div>
            <div className="text-[7px] text-[var(--text-muted)] uppercase">Composite</div>
          </div>
          <div className="bg-[var(--bg-panel)] rounded p-1.5">
            <div className="text-sm font-mono font-bold text-[var(--accent-green)]">{s.acqScore.toFixed(1)}</div>
            <div className="text-[7px] text-[var(--text-muted)] uppercase">Acquisition</div>
          </div>
          <div className="bg-[var(--bg-panel)] rounded p-1.5">
            <div className="text-sm font-mono font-bold text-[var(--accent-orange)]">{s.civicScore.toFixed(1)}</div>
            <div className="text-[7px] text-[var(--text-muted)] uppercase">Civic</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)] flex-shrink-0 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-2 py-0.5 text-[8px] font-mono uppercase rounded whitespace-nowrap flex items-center gap-1",
              tab === t.key
                ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {t.label}
            {t.count != null && (
              <span className="text-[7px] opacity-60">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <>
            {/* Anomalies */}
            {s.anomalies.length > 0 && (
              <div className="p-3 border-b border-[var(--border)] bg-[var(--accent-red)]/5">
                <div className="text-[9px] font-mono uppercase text-[var(--accent-red)] mb-2">
                  ⚠ {s.anomalies.length} Statistical Anomal{s.anomalies.length === 1 ? "y" : "ies"}
                </div>
                {s.anomalies.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono py-0.5">
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
              <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">Scoring Dimensions</div>
              {Object.entries(DIMENSION_KEYS).map(([key, dim]) => {
                const val = s.dimensionScores[key] || 0;
                return (
                  <div key={key} className="flex items-center gap-2 py-0.5">
                    <span className="text-[9px] text-[var(--text-secondary)] font-mono w-24 truncate">{dim.label}</span>
                    <div className="flex-1 h-1.5 bg-[var(--bg-primary)] rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${val}%`,
                          backgroundColor: val > 70 ? "#10b981" : val > 40 ? "#f59e0b" : "#64748b",
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-muted)] w-7 text-right">{val.toFixed(0)}</span>
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
              <div className="grid grid-cols-2 gap-1.5">
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
                  <div key={i} className="bg-[var(--bg-panel)] rounded p-1.5">
                    <div className="text-[7px] text-[var(--text-muted)] uppercase">{m.label}</div>
                    <div className="text-xs font-mono font-bold">{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Politician Issues */}
            {politicianIssues && (
              <div className="p-3 border-b border-[var(--border)]">
                <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-2">
                  Political Landscape
                </div>
                {politicianIssues.statewide_themes && politicianIssues.statewide_themes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {politicianIssues.statewide_themes.map((theme: string, i: number) => (
                      <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
                {politicianIssues.politicians?.slice(0, 4).map((pol: any, i: number) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-[var(--text-primary)] font-bold">{pol.name}</span>
                      <span className="text-[var(--text-muted)] text-[9px]">{pol.role}</span>
                      {pol.handle && <span className="text-[var(--accent-cyan)] text-[8px]">@{pol.handle}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {pol.issues?.slice(0, 3).map((issue: any, j: number) => (
                        <span key={j} className="text-[7px] font-mono px-1 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                          {issue.topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* DISTRICTS TAB */}
        {tab === "districts" && (
          <div className="p-3">
            <div className="space-y-1">
              {stateDistricts.map((d: DistrictMeta) => {
                const code = `${d.state}-${String(d.district_number).padStart(2, "0")}`;
                const isSelected = filters.selectedDistrict === code;
                const pvi = parsePVI(d.cook_pvi);
                return (
                  <button
                    key={code}
                    onClick={() => onDistrictSelect(isSelected ? null : code)}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded text-xs font-mono hover:bg-[var(--bg-hover)] transition-colors",
                      isSelected && "bg-[var(--bg-hover)] border border-[var(--accent-cyan)]/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
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
                        <span className="font-bold">{code}</span>
                        <span className="text-[var(--text-muted)] truncate max-w-[100px]">{d.member}</span>
                      </div>
                      <span className="text-[var(--text-muted)]">{d.cook_pvi}</span>
                    </div>
                    {isSelected && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <div className="bg-[var(--bg-primary)] rounded p-1.5">
                          <div className="text-[7px] text-[var(--text-muted)]">INCOME</div>
                          <div className="text-[10px] font-bold">{d.median_income ? `$${formatNumber(d.median_income)}` : "—"}</div>
                        </div>
                        <div className="bg-[var(--bg-primary)] rounded p-1.5">
                          <div className="text-[7px] text-[var(--text-muted)]">POVERTY</div>
                          <div className="text-[10px] font-bold">{d.poverty_rate != null ? formatPct(d.poverty_rate) : "—"}</div>
                        </div>
                        <div className="bg-[var(--bg-primary)] rounded p-1.5">
                          <div className="text-[7px] text-[var(--text-muted)]">MARGIN '24</div>
                          <div className="text-[10px] font-bold">{d.winner_margin_pct_2024 != null ? formatPct(d.winner_margin_pct_2024) : "—"}</div>
                        </div>
                        <div className="bg-[var(--bg-primary)] rounded p-1.5">
                          <div className="text-[7px] text-[var(--text-muted)]">COALITION</div>
                          <div className="text-[10px] font-bold">{d.coalition_threshold ? formatNumber(d.coalition_threshold) : "—"}</div>
                        </div>
                        {d.margin_trend && d.margin_trend.length > 0 && (
                          <div className="col-span-2 bg-[var(--bg-primary)] rounded p-1.5">
                            <div className="text-[7px] text-[var(--text-muted)] mb-1">MARGIN TREND</div>
                            <div className="flex gap-2">
                              {d.margin_trend.map((mt, mi) => (
                                <div key={mi} className="text-center">
                                  <div className="text-[8px]" style={{ color: mt.winner_party === "R" ? "#ef4444" : "#3b82f6" }}>
                                    {mt.margin_pct > 0 ? "+" : ""}{mt.margin_pct.toFixed(1)}%
                                  </div>
                                  <div className="text-[7px] text-[var(--text-muted)]">{mt.year}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CAMPUSES TAB */}
        {tab === "campuses" && (
          <div className="p-3 space-y-1">
            {stateCampuses
              .sort((a: Campus, b: Campus) => (b.properties.enrollment || 0) - (a.properties.enrollment || 0))
              .map((c: Campus, i: number) => (
                <div key={i} className="px-2 py-1.5 rounded hover:bg-[var(--bg-hover)] text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold truncate max-w-[200px]">{c.properties.name}</span>
                    <span className="text-[var(--accent-cyan)]">{formatNumber(c.properties.enrollment)}</span>
                  </div>
                  <div className="flex gap-3 text-[9px] text-[var(--text-muted)] mt-0.5">
                    <span>{c.properties.city}</span>
                    <span>{c.properties.campus_type}</span>
                    <span>Dist: {c.properties.primary_district}</span>
                    <span>Reach: {c.properties.districts_reached}</span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* CANDIDATES TAB */}
        {tab === "candidates" && (
          <div className="p-3 space-y-1">
            {stateCandidates.map((c: Candidate, i: number) => (
              <div key={i} className="px-2 py-1.5 rounded hover:bg-[var(--bg-hover)] text-xs font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full text-[7px] flex items-center justify-center"
                      style={{
                        backgroundColor: (c.party_code === "REP" || c.party === "REP") ? "#ef444433" : (c.party_code === "DEM" || c.party === "DEM") ? "#3b82f633" : "#64748b33",
                        color: (c.party_code === "REP" || c.party === "REP") ? "#ef4444" : (c.party_code === "DEM" || c.party === "DEM") ? "#3b82f6" : "#64748b",
                      }}
                    >
                      {(c.party_code || c.party || "?").charAt(0)}
                    </span>
                    <span className="font-bold truncate max-w-[160px]">{c.name}</span>
                  </div>
                  <div className="text-right text-[var(--text-muted)]">
                    <div className="text-[9px]">{c.office} · {c.district}</div>
                  </div>
                </div>
                <div className="flex gap-3 text-[9px] text-[var(--text-muted)] mt-0.5">
                  <span>{c.status}</span>
                  {c.total_receipts != null && <span className="text-[var(--accent-green)]">Raised: ${formatNumber(c.total_receipts)}</span>}
                  {c.total_disbursements != null && <span>Spent: ${formatNumber(c.total_disbursements)}</span>}
                  {c.campaign_website && <span className="text-[var(--accent-cyan)]">🌐</span>}
                </div>
              </div>
            ))}
            {stateCandidates.length === 0 && (
              <div className="text-center text-[var(--text-muted)] text-xs font-mono py-8">No candidates found</div>
            )}
          </div>
        )}

        {/* ACTIVISM TAB */}
        {tab === "activism" && (
          <div className="p-3">
            {stateProtests.length > 0 ? (
              <div className="space-y-2">
                {stateProtests
                  .sort((a: ProtestEvent, b: ProtestEvent) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((p: ProtestEvent, i: number) => (
                    <div key={i} className="px-2 py-2 rounded bg-[var(--bg-panel)] border border-[var(--border)]/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[8px] font-mono px-1.5 py-0.5 rounded",
                            p.valence === "pro" ? "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]"
                              : p.valence === "anti" ? "bg-[var(--accent-red)]/20 text-[var(--accent-red)]"
                              : "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]"
                          )}>
                            {p.issue || "Unknown"}
                          </span>
                          {p.size && <span className="text-[8px] font-mono text-[var(--text-muted)]">~{formatNumber(p.size)} people</span>}
                        </div>
                        <span className="text-[8px] font-mono text-[var(--text-muted)]">{p.date}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                        {p.description}
                      </div>
                      {(p.city || p.locality) && (
                        <div className="text-[8px] text-[var(--text-muted)] mt-1 font-mono">
                          📍 {p.city || p.locality}
                          {p.actor && ` · Actor: ${p.actor}`}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-[var(--text-muted)] text-xs font-mono py-8">
                No protest activity recorded
              </div>
            )}
          </div>
        )}

        {/* TRENDS TAB */}
        {tab === "trends" && (
          <div className="p-3">
            {topTrends.length > 0 ? (
              <>
                <div className="text-[9px] font-mono uppercase text-[var(--text-muted)] mb-3">
                  Google Trends — Avg Interest by Topic
                </div>
                {topTrends.map((t, i) => (
                  <div key={t.topic} className="flex items-center gap-2 py-1">
                    <span className="text-[9px] font-mono text-[var(--text-muted)] w-4 text-right">{i + 1}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono w-36 truncate">{t.topic}</span>
                    <div className="flex-1 h-2 bg-[var(--bg-primary)] rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${t.avg}%`,
                          backgroundColor: t.avg > 60 ? "#ef4444" : t.avg > 40 ? "#f59e0b" : t.avg > 20 ? "#06b6d4" : "#64748b",
                        }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-muted)] w-8 text-right">{t.avg.toFixed(0)}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center text-[var(--text-muted)] text-xs font-mono py-8">
                No trend data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
