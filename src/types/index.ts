export interface StateData {
  abbr: string;
  name?: string;
  cookPVI: string;
  midtermTurnout2022: number;
  senator1: string;
  senator1Party: string;
  senator1NextElection: number;
  senator1LastMargin: number;
  senator1TaxCommittees: number;
  senator2: string;
  senator2Party: string;
  senator2NextElection: number;
  senator2LastMargin: number;
  senator2TaxCommittees: number;
  totalFilers: number;
  totalFedTaxPaidB: number;
  adultPop18: number;
  eitcClaimsThousands: number;
  eitcParticipationRate: number;
  eitcUnclaimedRate: number;
  urbanPopPct: number;
  youngProfessionalPop: number;
  collegeEnrollment: number;
  taxDensityScore: number;
  eitcOpportunityScore: number;
  civicEngagementScore: number;
  senatorResponsivenessScore: number;
  senatorInfluenceScore: number;
  urbanConcentrationScore: number;
  youngProfessionalScore: number;
  competitiveDistrictDensityScore: number;
  ccEnrollmentScore: number;
  [key: string]: unknown;
}

export interface DistrictMeta {
  state: string;
  district_number: number;
  name: string;
  code?: string;
  cook_pvi: string;
  member: string;
  party: string;
  bbox?: number[];
  median_income?: number;
  poverty_rate?: number;
  pct_associates_plus?: number;
  committees?: string;
  turnout_rate_2022?: number;
  turnout_rate_2024?: number;
  winner_margin_pct_2024?: number;
  coalition_threshold?: number;
  race_results_2024?: {
    candidates: Array<{ name: string; party: string; votes: number; pct: number }>;
    total_votes: number;
    year: number;
  };
  margin_trend?: Array<{ year: number; margin_pct: number; winner_party: string }>;
  [key: string]: unknown;
}

export interface Campus {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    name: string;
    city: string;
    state: string;
    enrollment: number;
    campus_type: string;
    control_type: string;
    radius_miles: number;
    districts_reached: number;
    primary_district: string;
    all_districts: string;
    admission_rate_pct?: number;
    tuition_in_state?: number;
    graduation_rate_4yr_pct?: number;
    [key: string]: unknown;
  };
}

export interface CampusGeoJSON {
  type: "FeatureCollection";
  features: Campus[];
}

export interface Candidate {
  candidate_id: string;
  name: string;
  office: string;
  state: string;
  state_code?: string;
  district: string;
  party: string;
  party_code?: string;
  status: string;
  has_raised_funds?: boolean;
  total_receipts?: number;
  total_disbursements?: number;
  last_report_date?: string;
  campaign_website?: string;
  x_handle?: string;
  fec_candidate_id?: string;
  candidate_name_fec_filing_name?: string;
  incumbent_challenger_open_seat?: string;
  [key: string]: unknown;
}

export interface PrimaryResult {
  state: string;
  state_code?: string;
  district: string;
  office: string;
  party: string;
  date?: string;
  candidates?: Array<{
    name: string;
    votes: number;
    pct: number;
  }>;
  total_votes?: number;
  winner?: string;
  margin_pct?: number;
  num_candidates?: number;
  [key: string]: unknown;
}

export interface ScoringConfig {
  alpha: number; // 0 = all civic, 1 = all acquisition
  acquisitionWeights: Record<string, number>;
  civicWeights: Record<string, number>;
}

export interface ScoredState {
  abbr: string;
  data: StateData;
  acqScore: number;
  civicScore: number;
  composite: number;
  rank: number;
  quadrant: "launch" | "revenue" | "civic" | "deprioritize";
  tier: 1 | 2 | 3;
  anomalies: Anomaly[];
  dimensionScores: Record<string, number>;
}

export interface Anomaly {
  field: string;
  label: string;
  value: number;
  zScore: number;
  direction: "high" | "low";
  severity: "extreme" | "notable";
}

export interface FilterState {
  selectedState: string | null;
  selectedDistrict: string | null;
  partyFilter: string | null;
  tierFilter: number | null;
  quadrantFilter: string | null;
  searchQuery: string;
  layers: {
    campuses: boolean;
    districts: boolean;
    anomalies: boolean;
    heatmap: boolean;
  };
  metricOverlay: string;
}

export interface ProtestEvent {
  state: string;
  city?: string;
  date: string;
  description: string;
  size?: number;
  issue?: string;
  [key: string]: unknown;
}

export interface PoliticianIssues {
  [state: string]: {
    politicians: Array<{
      name: string;
      role: string;
      handle?: string;
      issues: Array<{ topic: string; summary: string }>;
    }>;
    statewide_themes?: string[];
  };
}
