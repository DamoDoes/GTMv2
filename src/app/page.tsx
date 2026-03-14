"use client";
import { useState, useMemo } from "react";
import { useData } from "@/hooks/useData";
import { useFilters } from "@/hooks/useFilters";
import { scoreStates, DEFAULT_CONFIG, PRESETS } from "@/lib/scoring";
import type { ScoringConfig } from "@/types";
import Shell from "@/components/layout/Shell";
import MapPanel from "@/components/map/MapPanel";
import RankingPanel from "@/components/panels/RankingPanel";
import DetailPanel from "@/components/panels/DetailPanel";
import DataExplorer from "@/components/data/DataExplorer";
import TargetView from "@/components/target/TargetView";
import AnomalyTicker from "@/components/panels/AnomalyTicker";

type View = "command" | "explore" | "target";

export default function Home() {
  const data = useData();
  const { filters, updateFilter, toggleLayer, selectState, selectDistrict, resetFilters } =
    useFilters();
  const [view, setView] = useState<View>("command");
  const [config, setConfig] = useState<ScoringConfig>(DEFAULT_CONFIG);

  const scored = useMemo(() => {
    if (!data.states || !data.campuses.length) return [];
    return scoreStates(data.states, data.campuses, config);
  }, [data.states, data.campuses, config]);

  const allAnomalies = useMemo(
    () => scored.flatMap((s) => s.anomalies.map((a) => ({ ...a, state: s.abbr }))),
    [scored]
  );

  if (data.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="text-2xl font-mono text-[var(--accent-cyan)] mb-2">GTM COMMAND</div>
          <div className="text-sm text-[var(--text-muted)]">Loading intelligence layers...</div>
          <div className="mt-4 w-48 h-1 bg-[var(--bg-panel)] rounded overflow-hidden">
            <div className="h-full bg-[var(--accent-cyan)] animate-pulse rounded" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--accent-red)]">Error: {data.error}</div>
      </div>
    );
  }

  return (
    <Shell
      view={view}
      onViewChange={setView}
      filters={filters}
      toggleLayer={toggleLayer}
      metricOverlay={filters.metricOverlay}
      onMetricChange={(m) => updateFilter("metricOverlay", m)}
      onReset={resetFilters}
    >
      {view === "command" && (
        <div className="flex h-full">
          {/* Left: Ranked list */}
          <div className="w-72 flex-shrink-0 border-r border-[var(--border)] overflow-hidden flex flex-col">
            <RankingPanel
              scored={scored}
              selectedState={filters.selectedState}
              onSelect={selectState}
              config={config}
            />
          </div>

          {/* Center: Map */}
          <div className="flex-1 relative flex flex-col">
            <AnomalyTicker anomalies={allAnomalies} onStateClick={selectState} />
            <div className="flex-1">
              <MapPanel
                scored={scored}
                campuses={data.campuses}
                districts={data.districts}
                filters={filters}
                onStateSelect={selectState}
                onDistrictSelect={selectDistrict}
                metricOverlay={filters.metricOverlay}
              />
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="w-96 flex-shrink-0 border-l border-[var(--border)] overflow-hidden">
            <DetailPanel
              scored={scored}
              data={data}
              filters={filters}
              onDistrictSelect={selectDistrict}
              onStateSelect={selectState}
            />
          </div>
        </div>
      )}

      {view === "explore" && (
        <DataExplorer
          data={data}
          scored={scored}
          filters={filters}
          onStateSelect={selectState}
          onDistrictSelect={selectDistrict}
        />
      )}

      {view === "target" && (
        <TargetView
          scored={scored}
          data={data}
          config={config}
          onConfigChange={setConfig}
          presets={PRESETS}
          onStateSelect={selectState}
        />
      )}
    </Shell>
  );
}
