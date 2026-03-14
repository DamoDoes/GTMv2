"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Popup, useMap, Marker } from "react-leaflet";
import type { ScoredState, Campus, DistrictMeta, FilterState, ProtestEvent } from "@/types";
import { getCompositeColor, formatNumber, stateAbbrToName } from "@/lib/utils";
import { getQuadrantColor } from "@/lib/scoring";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STATE_COORDS: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [64, -153], AZ: [34.3, -111.7], AR: [34.8, -92.2],
  CA: [37.2, -119.5], CO: [39, -105.5], CT: [41.6, -72.7], DE: [39, -75.5],
  FL: [28.6, -82.4], GA: [33, -83.5], HI: [20.5, -157], ID: [44.4, -114.6],
  IL: [40, -89.2], IN: [39.8, -86.3], IA: [42, -93.5], KS: [38.5, -98.3],
  KY: [37.8, -85.7], LA: [31, -92], ME: [45.4, -69], MD: [39.3, -76.6],
  MA: [42.2, -71.5], MI: [44.3, -85.4], MN: [46.3, -94.3], MS: [32.7, -89.7],
  MO: [38.4, -92.5], MT: [47, -109.6], NE: [41.5, -99.8], NV: [39.3, -116.6],
  NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.5, -106], NY: [42.9, -75.5],
  NC: [35.6, -79.4], ND: [47.5, -100.5], OH: [40.4, -82.7], OK: [35.6, -97.5],
  OR: [44, -120.5], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [33.9, -80.9],
  SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7],
  VT: [44, -72.7], VA: [37.5, -78.8], WA: [47.4, -120.5], WV: [38.6, -80.6],
  WI: [44.6, -89.7], WY: [43, -107.5], DC: [38.9, -77],
};

interface Props {
  scored: ScoredState[];
  campuses: Campus[];
  districts: DistrictMeta[];
  filters: FilterState;
  onStateSelect: (abbr: string | null) => void;
  onDistrictSelect: (code: string | null) => void;
  metricOverlay: string;
  protests: ProtestEvent[];
  trendsByDistrict: Record<string, unknown>;
}

function FlyToState({ abbr }: { abbr: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!abbr) {
      map.flyTo([39.8, -98.5], 4, { duration: 0.5 });
      return;
    }
    const c = STATE_COORDS[abbr];
    if (c) map.flyTo(c, 6, { duration: 0.5 });
  }, [abbr, map]);
  return null;
}

// Heatmap layer using canvas overlay
function HeatmapLayer({ campuses, show }: { campuses: Campus[]; show: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!show || !campuses.length) return;

    const canvas = L.DomUtil.create("canvas", "heatmap-canvas");
    const overlay = L.DomUtil.create("div", "");

    const updateHeatmap = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const c of campuses) {
        const [lng, lat] = c.geometry.coordinates;
        const point = map.latLngToContainerPoint([lat, lng]);
        const enrollment = c.properties.enrollment || 0;
        const radius = Math.max(15, Math.min(80, Math.sqrt(enrollment / 50)));

        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, radius
        );
        gradient.addColorStop(0, "rgba(6, 182, 212, 0.4)");
        gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.15)");
        gradient.addColorStop(1, "rgba(6, 182, 212, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
      }
    };

    const pane = map.getPane("overlayPane");
    if (pane) {
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "300";
      pane.appendChild(canvas);
    }

    updateHeatmap();
    map.on("moveend zoomend", updateHeatmap);

    return () => {
      map.off("moveend zoomend", updateHeatmap);
      canvas.remove();
    };
  }, [show, campuses, map]);

  return null;
}

export default function MapInner({
  scored,
  campuses,
  districts,
  filters,
  onStateSelect,
  onDistrictSelect,
  metricOverlay,
  protests,
  trendsByDistrict,
}: Props) {
  const mapRef = useRef(null);
  const [stateGeoData, setStateGeoData] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/data/us-states.geojson")
      .then((r) => r.json())
      .then((data) => setStateGeoData(data))
      .catch(() => {});
  }, []);

  const scoreByState = useMemo(() => {
    const map: Record<string, ScoredState> = {};
    for (const s of scored) map[s.abbr] = s;
    return map;
  }, [scored]);

  const getStateColor = (abbr: string) => {
    const s = scoreByState[abbr];
    if (!s) return "#1a2235";
    if (metricOverlay === "composite") return getCompositeColor(s.composite);
    if (metricOverlay === "acqScore") return getCompositeColor(s.acqScore);
    if (metricOverlay === "civicScore") return getCompositeColor(s.civicScore);
    const val = Number(s.data[metricOverlay]) || 0;
    return getCompositeColor(val);
  };

  const filteredCampuses = useMemo(() => {
    if (!filters.layers.campuses) return [];
    let list = campuses;
    if (filters.selectedState) {
      list = list.filter((c) => c.properties.state === filters.selectedState);
    }
    return list;
  }, [campuses, filters.layers.campuses, filters.selectedState]);

  // Protest markers filtered by state
  const filteredProtests = useMemo(() => {
    if (!filters.layers.protests) return [];
    let list = protests;
    if (filters.selectedState) {
      list = list.filter((p) => p.state === filters.selectedState);
    }
    return list;
  }, [protests, filters.layers.protests, filters.selectedState]);

  // Compute protest locations - use state coords as fallback, offset by index
  const protestMarkers = useMemo(() => {
    return filteredProtests.map((p, i) => {
      const base = STATE_COORDS[p.state] || [39.8, -98.5];
      // Offset slightly so they don't stack
      const offset = [(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2];
      return {
        ...p,
        lat: base[0] + offset[0],
        lng: base[1] + offset[1],
      };
    });
  }, [filteredProtests]);

  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={4}
      className="w-full h-full"
      zoomControl={false}
      ref={mapRef}
      style={{ background: "#0a0e17" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />

      <FlyToState abbr={filters.selectedState} />

      {/* Heatmap overlay */}
      <HeatmapLayer campuses={campuses} show={filters.layers.heatmap} />

      {/* State choropleth */}
      {stateGeoData && (
        <GeoJSON
          key={metricOverlay + filters.selectedState}
          data={stateGeoData}
          style={(feature) => {
            const abbr = feature?.properties?.abbr || feature?.properties?.STUSPS;
            const isSelected = filters.selectedState === abbr;
            return {
              fillColor: getStateColor(abbr),
              fillOpacity: isSelected ? 0.8 : 0.55,
              color: isSelected ? "#06b6d4" : "#2a3a55",
              weight: isSelected ? 2 : 0.5,
            };
          }}
          onEachFeature={(feature, layer) => {
            const abbr = feature.properties?.abbr || feature.properties?.STUSPS;
            const s = scoreByState[abbr];
            layer.on("click", () => {
              onStateSelect(filters.selectedState === abbr ? null : abbr);
            });
            if (s) {
              const stateProtests = protests.filter((p) => p.state === abbr);
              layer.bindTooltip(
                `<div style="font-family:monospace;font-size:11px">
                  <strong>${abbr}</strong> — Rank #${s.rank}<br/>
                  Composite: ${s.composite.toFixed(1)}<br/>
                  Acq: ${s.acqScore.toFixed(1)} | Civic: ${s.civicScore.toFixed(1)}
                  ${stateProtests.length > 0 ? `<br/><span style="color:#8b5cf6">🪧 ${stateProtests.length} protest event${stateProtests.length === 1 ? "" : "s"}</span>` : ""}
                  ${s.anomalies.length > 0 ? `<br/><span style="color:#ef4444">⚠ ${s.anomalies.length} anomal${s.anomalies.length === 1 ? "y" : "ies"}</span>` : ""}
                </div>`,
                { sticky: true, className: "dark-tooltip" }
              );
            }
          }}
        />
      )}

      {/* Campus markers */}
      {filteredCampuses.map((c, i) => {
        const [lng, lat] = c.geometry.coordinates;
        const enrollment = c.properties.enrollment || 0;
        const radius = Math.max(3, Math.min(12, Math.sqrt(enrollment / 500)));
        return (
          <CircleMarker
            key={`campus-${i}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              fillColor: "#06b6d4",
              fillOpacity: 0.7,
              color: "#0891b2",
              weight: 1,
            }}
          >
            <Popup>
              <div className="font-mono text-xs">
                <div className="font-bold text-sm">{c.properties.name}</div>
                <div className="text-[var(--text-muted)]">
                  {c.properties.city}, {c.properties.state}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-4">
                  <span>Enrollment</span>
                  <span className="text-right">{formatNumber(enrollment)}</span>
                  <span>Type</span>
                  <span className="text-right">{c.properties.campus_type}</span>
                  <span>Districts</span>
                  <span className="text-right">{c.properties.districts_reached}</span>
                  <span>Primary Dist.</span>
                  <span className="text-right">{c.properties.primary_district}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Protest markers */}
      {protestMarkers.map((p, i) => (
        <CircleMarker
          key={`protest-${i}`}
          center={[p.lat, p.lng]}
          radius={p.size ? Math.max(4, Math.min(16, Math.sqrt(p.size / 10))) : 5}
          pathOptions={{
            fillColor: p.valence === "pro" ? "#8b5cf6" : p.valence === "anti" ? "#ef4444" : "#f59e0b",
            fillOpacity: 0.6,
            color: p.valence === "pro" ? "#7c3aed" : p.valence === "anti" ? "#dc2626" : "#d97706",
            weight: 1.5,
            dashArray: "3 3",
          }}
        >
          <Popup>
            <div className="font-mono text-xs max-w-[250px]">
              <div className="font-bold text-sm">{p.issue || "Protest"}</div>
              <div className="text-[var(--text-muted)]">
                {p.city || p.locality || p.state} · {p.date}
              </div>
              {p.actor && <div className="mt-1 text-[var(--accent-purple)]">Actor: {p.actor}</div>}
              <div className="mt-1 text-[var(--text-secondary)]">{p.description}</div>
              {p.size && <div className="mt-1">Est. size: {formatNumber(p.size)}</div>}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Anomaly markers */}
      {filters.layers.anomalies &&
        scored
          .filter((s) => s.anomalies.some((a) => a.severity === "extreme"))
          .map((s) => {
            const c = STATE_COORDS[s.abbr];
            if (!c) return null;
            const extremeCount = s.anomalies.filter((a) => a.severity === "extreme").length;
            return (
              <CircleMarker
                key={`anomaly-${s.abbr}`}
                center={c}
                radius={6 + extremeCount * 2}
                pathOptions={{
                  fillColor: "#ef4444",
                  fillOpacity: 0.15,
                  color: "#ef4444",
                  weight: 2,
                  dashArray: "4 4",
                }}
              >
                <Popup>
                  <div className="font-mono text-xs">
                    <div className="font-bold text-sm text-red-400">⚠ {s.abbr} Anomalies</div>
                    {s.anomalies
                      .filter((a) => a.severity === "extreme")
                      .map((a, i) => (
                        <div key={i} className="mt-1">
                          <span className={a.direction === "high" ? "text-red-400" : "text-blue-400"}>
                            {a.direction === "high" ? "▲" : "▼"}
                          </span>{" "}
                          {a.label}: z={a.zScore.toFixed(1)}
                        </div>
                      ))}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

      {/* Trend intensity overlay - show colored state markers for trend hotspots */}
      {filters.layers.trends && scored.map((s) => {
        const c = STATE_COORDS[s.abbr];
        if (!c) return null;
        // Show a subtle ring indicating data availability
        const stateDistricts = Object.keys(trendsByDistrict as Record<string, unknown>).filter(
          (k) => k.startsWith(s.abbr + "-") || k.startsWith(s.abbr)
        );
        if (stateDistricts.length === 0) return null;
        return (
          <CircleMarker
            key={`trend-${s.abbr}`}
            center={c}
            radius={4 + stateDistricts.length}
            pathOptions={{
              fillColor: "#8b5cf6",
              fillOpacity: 0.1,
              color: "#8b5cf6",
              weight: 1,
            }}
          />
        );
      })}
    </MapContainer>
  );
}
