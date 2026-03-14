"use client";
import dynamic from "next/dynamic";
import type { ScoredState, Campus, DistrictMeta, FilterState, ProtestEvent } from "@/types";

const MapInner = dynamic(() => import("./MapInner"), { ssr: false });

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

export default function MapPanel(props: Props) {
  return <MapInner {...props} />;
}
