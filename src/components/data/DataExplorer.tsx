"use client";
import { useState, useMemo } from "react";
import type { ScoredState, FilterState, Campus, Candidate, DistrictMeta } from "@/types";
import { cn, formatNumber, formatPct, stateAbbrToName, parsePVI } from "@/lib/utils";
import { getQuadrantColor } from "@/lib/scoring";

type Tab = "states" | "districts" | "campuses" | "candidates" | "primaries";

interface Props {
  data: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  scored: ScoredState[];
  filters: FilterState;
  onStateSelect: (abbr: string | null) => void;
  onDistrictSelect: (code: string | null) => void;
}

export default function DataExplorer({ data, scored, filters, onStateSelect, onDistrictSelect }: Props) {
  const [tab, setTab] = useState<Tab>("states");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const scoreMap = useMemo(() => {
    const m: Record<string, ScoredState> = {};
    for (const s of scored) m[s.abbr] = s;
    return m;
  }, [scored]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ col, label, className }: { col: string; label: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      className={cn(
        "px-2 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] select-none",
        sortCol === col && "text-[var(--accent-cyan)]",
        className
      )}
    >
      {label} {sortCol === col && (sortDir === "asc" ? "↑" : "↓")}
    </th>
  );

  const filteredStates = useMemo(() => {
    let list = [...scored];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.abbr.toLowerCase().includes(q) ||
          stateAbbrToName(s.abbr).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va: number, vb: number;
      switch (sortCol) {
        case "rank": va = a.rank; vb = b.rank; break;
        case "composite": va = a.composite; vb = b.composite; break;
        case "acq": va = a.acqScore; vb = b.acqScore; break;
        case "civic": va = a.civicScore; vb = b.civicScore; break;
        case "anomalies": va = a.anomalies.length; vb = b.anomalies.length; break;
        case "enrollment": va = (a.data.collegeEnrollment as number) || 0; vb = (b.data.collegeEnrollment as number) || 0; break;
        case "turnout": va = (a.data.midtermTurnout2022 as number) || 0; vb = (b.data.midtermTurnout2022 as number) || 0; break;
        default: va = a.rank; vb = b.rank;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [scored, search, sortCol, sortDir]);

  const filteredDistricts = useMemo(() => {
    let list = [...data.districts];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.state.toLowerCase().includes(q) ||
          d.member?.toLowerCase().includes(q) ||
          d.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data.districts, search]);

  const filteredCampuses = useMemo(() => {
    let list = [...data.campuses];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.properties.name.toLowerCase().includes(q) ||
          c.properties.state.toLowerCase().includes(q) ||
          c.properties.city?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.properties.enrollment || 0) - (a.properties.enrollment || 0));
    return list;
  }, [data.campuses, search]);

  const filteredCandidates = useMemo(() => {
    let list = [...data.candidates];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.state || "").toLowerCase().includes(q) ||
          (c.district || "").toLowerCase().includes(q) ||
          (c.party || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data.candidates, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center px-4 gap-4">
        <div className="flex gap-1">
          {(["states", "districts", "campuses", "candidates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(""); setSortCol("rank"); }}
              className={cn(
                "px-3 py-1 text-[10px] font-mono uppercase rounded",
                tab === t
                  ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${tab}...`}
          className="bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-1 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-64 focus:border-[var(--accent-cyan)] focus:outline-none"
        />
        <div className="ml-auto text-[9px] font-mono text-[var(--text-muted)]">
          {tab === "states" && `${filteredStates.length} states`}
          {tab === "districts" && `${filteredDistricts.length} districts`}
          {tab === "campuses" && `${filteredCampuses.length} campuses`}
          {tab === "candidates" && `${filteredCandidates.length} candidates`}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          {tab === "states" && (
            <>
              <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                <tr>
                  <SortHeader col="rank" label="#" />
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">State</th>
                  <SortHeader col="composite" label="Score" />
                  <SortHeader col="acq" label="Acq" />
                  <SortHeader col="civic" label="Civic" />
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Quadrant</th>
                  <SortHeader col="enrollment" label="CC Enroll" />
                  <SortHeader col="turnout" label="Turnout" />
                  <SortHeader col="anomalies" label="Anomalies" />
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">PVI</th>
                </tr>
              </thead>
              <tbody>
                {filteredStates.map((s) => (
                  <tr
                    key={s.abbr}
                    onClick={() => onStateSelect(s.abbr)}
                    className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">
                      {s.rank}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="text-xs font-mono font-bold">{s.abbr}</div>
                      <div className="text-[9px] text-[var(--text-muted)]">{stateAbbrToName(s.abbr)}</div>
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono font-bold">
                      {s.composite.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--accent-green)]">
                      {s.acqScore.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--accent-orange)]">
                      {s.civicScore.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: getQuadrantColor(s.quadrant) + "22",
                          color: getQuadrantColor(s.quadrant),
                        }}
                      >
                        {s.quadrant.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono">
                      {formatNumber(s.data.collegeEnrollment as number)}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono">
                      {formatPct(s.data.midtermTurnout2022 as number)}
                    </td>
                    <td className="px-2 py-1.5">
                      {s.anomalies.length > 0 && (
                        <span className="text-[9px] font-mono text-[var(--accent-red)]">
                          ⚠ {s.anomalies.length}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">
                      {s.data.cookPVI as string}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {tab === "districts" && (
            <>
              <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">District</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Member</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Party</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">PVI</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Income</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Poverty</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Margin '24</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Coalition</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.map((d, i) => {
                  const code = `${d.state}-${String(d.district_number).padStart(2, "0")}`;
                  return (
                    <tr
                      key={i}
                      onClick={() => {
                        onStateSelect(d.state);
                        onDistrictSelect(code);
                      }}
                      className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-hover)] cursor-pointer"
                    >
                      <td className="px-2 py-1.5 text-xs font-mono font-bold">{code}</td>
                      <td className="px-2 py-1.5 text-xs font-mono truncate max-w-[150px]">{d.member}</td>
                      <td className="px-2 py-1.5">
                        <span
                          style={{ color: d.party === "R" ? "#ef4444" : "#3b82f6" }}
                          className="text-xs font-mono font-bold"
                        >
                          {d.party}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">{d.cook_pvi}</td>
                      <td className="px-2 py-1.5 text-xs font-mono">{d.median_income ? `$${formatNumber(d.median_income)}` : "—"}</td>
                      <td className="px-2 py-1.5 text-xs font-mono">{d.poverty_rate != null ? formatPct(d.poverty_rate) : "—"}</td>
                      <td className="px-2 py-1.5 text-xs font-mono">{d.winner_margin_pct_2024 != null ? formatPct(d.winner_margin_pct_2024) : "—"}</td>
                      <td className="px-2 py-1.5 text-xs font-mono">{d.coalition_threshold ? formatNumber(d.coalition_threshold) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          )}

          {tab === "campuses" && (
            <>
              <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Name</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">City</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">State</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Enrollment</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Type</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Districts</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Primary Dist</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampuses.slice(0, 200).map((c, i) => (
                  <tr
                    key={i}
                    onClick={() => onStateSelect(c.properties.state)}
                    className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    <td className="px-2 py-1.5 text-xs font-mono truncate max-w-[200px]">{c.properties.name}</td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">{c.properties.city}</td>
                    <td className="px-2 py-1.5 text-xs font-mono">{c.properties.state}</td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--accent-cyan)]">{formatNumber(c.properties.enrollment)}</td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">{c.properties.campus_type}</td>
                    <td className="px-2 py-1.5 text-xs font-mono">{c.properties.districts_reached}</td>
                    <td className="px-2 py-1.5 text-xs font-mono">{c.properties.primary_district}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}

          {tab === "candidates" && (
            <>
              <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
                <tr>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Name</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Party</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">State</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">District</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Office</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Status</th>
                  <th className="px-2 py-2 text-left text-[9px] font-mono uppercase text-[var(--text-muted)]">Raised</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.slice(0, 200).map((c, i) => (
                  <tr
                    key={i}
                    onClick={() => onStateSelect(c.state_code || "")}
                    className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-hover)] cursor-pointer"
                  >
                    <td className="px-2 py-1.5 text-xs font-mono truncate max-w-[180px]">{c.name}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className="text-xs font-mono font-bold"
                        style={{
                          color:
                            c.party_code === "REP" || c.party?.includes("Rep")
                              ? "#ef4444"
                              : c.party_code === "DEM" || c.party?.includes("Dem")
                              ? "#3b82f6"
                              : "#64748b",
                        }}
                      >
                        {c.party_code || c.party}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-xs font-mono">{c.state_code || c.state}</td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">{c.district}</td>
                    <td className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)]">{c.office}</td>
                    <td className="px-2 py-1.5 text-[9px] font-mono text-[var(--text-muted)]">{c.status}</td>
                    <td className="px-2 py-1.5 text-xs font-mono">
                      {c.total_receipts != null ? `$${formatNumber(c.total_receipts)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  );
}
