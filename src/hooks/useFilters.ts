"use client";
import { useState, useCallback } from "react";
import type { FilterState } from "@/types";

const DEFAULT_FILTERS: FilterState = {
  selectedState: null,
  selectedDistrict: null,
  partyFilter: null,
  tierFilter: null,
  quadrantFilter: null,
  searchQuery: "",
  layers: {
    campuses: true,
    districts: false,
    anomalies: true,
    heatmap: false,
    protests: false,
    trends: false,
  },
  metricOverlay: "composite",
};

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleLayer = useCallback((layer: keyof FilterState["layers"]) => {
    setFilters((prev) => ({
      ...prev,
      layers: { ...prev.layers, [layer]: !prev.layers[layer] },
    }));
  }, []);

  const selectState = useCallback((abbr: string | null) => {
    setFilters((prev) => ({
      ...prev,
      selectedState: abbr,
      selectedDistrict: null,
    }));
  }, []);

  const selectDistrict = useCallback((code: string | null) => {
    setFilters((prev) => ({ ...prev, selectedDistrict: code }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    updateFilter,
    toggleLayer,
    selectState,
    selectDistrict,
    resetFilters,
  };
}
