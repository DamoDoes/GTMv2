"use client";
import { useMemo, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Popup, useMap } from "react-leaflet";
import type { ScoredState, Campus, DistrictMeta, FilterState } from "@/types";
import { getCompositeColor, formatNumber, stateAbbrToName } from "@/lib/utils";
import { getQuadrantColor } from "@/lib/scoring";
import "leaflet/dist/leaflet.css";

interface Props {
  scored: ScoredState[];
  campuses: Campus[];
  districts: DistrictMeta[];
  filters: FilterState;
  onStateSelect: (abbr: string | null) => void;
  onDistrictSelect: (code: string | null) => void;
  metricOverlay: string;
}

function FlyToState({ abbr }: { abbr: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!abbr) {
      map.flyTo([39.8, -98.5], 4, { duration: 0.5 });
      return;
    }
    const coords: Record<string, [number, number]> = {
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
    const c = coords[abbr];
    if (c) map.flyTo(c, 6, { duration: 0.5 });
  }, [abbr, map]);
  return null;
}

export default function MapInner({
  scored,
  campuses,
  filters,
  onStateSelect,
  metricOverlay,
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
    // Dimension scores
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
              layer.bindTooltip(
                `<div style="font-family:monospace;font-size:11px">
                  <strong>${abbr}</strong> — Rank #${s.rank}<br/>
                  Composite: ${s.composite.toFixed(1)}<br/>
                  Acq: ${s.acqScore.toFixed(1)} | Civic: ${s.civicScore.toFixed(1)}
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
            key={i}
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

      {/* Anomaly markers */}
      {filters.layers.anomalies &&
        scored
          .filter((s) => s.anomalies.some((a) => a.severity === "extreme"))
          .map((s) => {
            const coords: Record<string, [number, number]> = {
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
            const c = coords[s.abbr];
            if (!c) return null;
            return (
              <CircleMarker
                key={`anomaly-${s.abbr}`}
                center={c}
                radius={8}
                pathOptions={{
                  fillColor: "#ef4444",
                  fillOpacity: 0.3,
                  color: "#ef4444",
                  weight: 2,
                  dashArray: "4 4",
                }}
              />
            );
          })}
    </MapContainer>
  );
}
