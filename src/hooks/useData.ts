"use client";
import { useState, useEffect, useMemo } from "react";
import type {
  StateData,
  DistrictMeta,
  CampusGeoJSON,
  Campus,
  Candidate,
  PoliticianIssues,
  ProtestEvent,
} from "@/types";

interface DataStore {
  states: Record<string, StateData>;
  districts: DistrictMeta[];
  campuses: Campus[];
  candidates: Candidate[];
  primaries: Record<string, unknown>;
  politicianIssues: PoliticianIssues;
  protests: ProtestEvent[];
  fecContributions: Record<string, unknown>;
  raceIssues: Record<string, unknown>;
  eacAdmin: Record<string, unknown>;
  trendsByDistrict: Record<string, unknown>;
  officialsNews: Record<string, unknown>;
  loading: boolean;
  error: string | null;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export function useData(): DataStore {
  const [data, setData] = useState<Omit<DataStore, "loading" | "error">>({
    states: {},
    districts: [],
    campuses: [],
    candidates: [],
    primaries: {},
    politicianIssues: {},
    protests: [],
    fecContributions: {},
    raceIssues: {},
    eacAdmin: {},
    trendsByDistrict: {},
    officialsNews: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchJSON<Record<string, StateData>>("/data/states.json"),
      fetchJSON<DistrictMeta[]>("/data/districts-meta.json"),
      fetchJSON<CampusGeoJSON>("/data/campuses.geojson"),
      fetchJSON<Candidate[]>("/data/candidates.json"),
      fetchJSON<Record<string, unknown>>("/data/primaries.json"),
      fetchJSON<PoliticianIssues>("/data/politician-issues.json"),
      fetchJSON<ProtestEvent[]>("/data/protest-activity.json"),
      fetchJSON<Record<string, unknown>>("/data/fec-contributions.json"),
      fetchJSON<Record<string, unknown>>("/data/race-issues.json"),
      fetchJSON<Record<string, unknown>>("/data/eac-election-admin.json"),
      fetchJSON<Record<string, unknown>>("/data/trends-by-district.json"),
      fetchJSON<Record<string, unknown>>("/data/officials-news.json"),
    ])
      .then(
        ([
          states,
          districts,
          campusGeo,
          candidates,
          primaries,
          politicianIssues,
          protests,
          fecContributions,
          raceIssues,
          eacAdmin,
          trendsByDistrict,
          officialsNews,
        ]) => {
          // Normalize candidates — handle both formats
          const normalizedCandidates = candidates.map((c: Record<string, unknown>) => ({
            candidate_id: (c.candidate_id || c.fec_candidate_id || "") as string,
            name: (c.name || c.candidate_name_fec_filing_name || "") as string,
            office: (c.office || "") as string,
            state: (c.state || "") as string,
            state_code: (c.state_code || "") as string,
            district: (c.district || c.district_seat || "") as string,
            party: (c.party || c.party_code || "") as string,
            party_code: (c.party_code || "") as string,
            status: (c.status || c.incumbent_challenger_open_seat || "") as string,
            has_raised_funds: c.has_raised_funds as boolean | undefined,
            total_receipts: c.total_receipts as number | undefined,
            total_disbursements: c.total_disbursements as number | undefined,
            campaign_website: (c.campaign_website || "") as string,
            x_handle: (c.x_handle || "") as string,
            ...c,
          })) as Candidate[];

          setData({
            states,
            districts: Array.isArray(districts) ? districts : Object.values(districts),
            campuses: campusGeo.features,
            candidates: normalizedCandidates,
            primaries,
            politicianIssues,
            protests: Array.isArray(protests) ? protests : [],
            fecContributions,
            raceIssues,
            eacAdmin,
            trendsByDistrict,
            officialsNews,
          });
          setLoading(false);
        }
      )
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return useMemo(() => ({ ...data, loading, error }), [data, loading, error]);
}
