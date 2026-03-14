"use client";
import dynamic from "next/dynamic";
import type { ScoredState, Campus, DistrictMeta, FilterState } from "@/types";

const MapInner = dynamic(() => import("./MapInner"), { ssr: false });

interface Props {
  scored: ScoredState[];
  campuses: Campus[];
  districts: DistrictMeta[];
  filters: FilterState;
  onStateSelect: (abbr: string | null) => void;
  onDistrictSelect: (code: string | null) => void;
  metricOverlay: string;
}

export default function MapPanel(props: Props) {
  return (
    <div className="w-full h-full">
      <MapInner {...props} />
    </div>
  );
}
