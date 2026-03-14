import type { StateData, ScoredState, ScoringConfig, Anomaly, Campus } from "@/types";

const DIMENSION_KEYS = {
  senatorResponsiveness: { label: "Senator Responsiveness", field: "senatorResponsivenessScore" },
  civicEngagement: { label: "Civic Engagement", field: "civicEngagementScore" },
  senatorInfluence: { label: "Senator Influence", field: "senatorInfluenceScore" },
  taxDensity: { label: "Tax Density", field: "taxDensityScore" },
  eitcOpportunity: { label: "EITC Opportunity", field: "eitcOpportunityScore" },
  urbanConcentration: { label: "Urban Concentration", field: "urbanConcentrationScore" },
  youngProfessional: { label: "Young Professionals", field: "youngProfessionalScore" },
  competitiveDistrictDensity: { label: "Competitive Districts", field: "competitiveDistrictDensityScore" },
  ccEnrollment: { label: "CC Enrollment", field: "ccEnrollmentScore" },
};

export const DEFAULT_CONFIG: ScoringConfig = {
  alpha: 0.5,
  acquisitionWeights: {
    senatorResponsiveness: 5,
    civicEngagement: 10,
    senatorInfluence: 3,
    taxDensity: 8,
    eitcOpportunity: 7,
    urbanConcentration: 15,
    youngProfessional: 25,
    competitiveDistrictDensity: 2,
    ccEnrollment: 25,
  },
  civicWeights: {
    senatorResponsiveness: 30,
    civicEngagement: 25,
    senatorInfluence: 18,
    taxDensity: 4,
    eitcOpportunity: 5,
    urbanConcentration: 2,
    youngProfessional: 1,
    competitiveDistrictDensity: 12,
    ccEnrollment: 3,
  },
};

export const PRESETS: Record<string, ScoringConfig> = {
  balanced: DEFAULT_CONFIG,
  studentReach: {
    alpha: 0.8,
    acquisitionWeights: { ...DEFAULT_CONFIG.acquisitionWeights, ccEnrollment: 35, urbanConcentration: 20, youngProfessional: 20 },
    civicWeights: DEFAULT_CONFIG.civicWeights,
  },
  politicalImpact: {
    alpha: 0.2,
    acquisitionWeights: DEFAULT_CONFIG.acquisitionWeights,
    civicWeights: { ...DEFAULT_CONFIG.civicWeights, senatorResponsiveness: 35, civicEngagement: 30, competitiveDistrictDensity: 15 },
  },
};

function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((s, v) => s + Math.max(0, v), 0);
  if (total === 0) return weights;
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(weights)) {
    result[k] = Math.max(0, v) / total;
  }
  return result;
}

function computeZScores(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  if (std === 0) return values.map(() => 0);
  return values.map((v) => (v - mean) / std);
}

function detectAnomalies(
  abbr: string,
  data: StateData,
  allStates: Record<string, StateData>
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const fieldsToCheck = [
    { field: "midtermTurnout2022", label: "Midterm Turnout" },
    { field: "eitcUnclaimedRate", label: "EITC Unclaimed Rate" },
    { field: "urbanPopPct", label: "Urban Population %" },
    { field: "youngProfessionalPop", label: "Young Professionals" },
    { field: "collegeEnrollment", label: "CC Enrollment" },
    { field: "totalFedTaxPaidB", label: "Fed Tax Paid" },
    { field: "senatorResponsivenessScore", label: "Senator Responsiveness" },
    { field: "civicEngagementScore", label: "Civic Engagement" },
    { field: "competitiveDistrictDensityScore", label: "Competitive Districts" },
  ];

  const stateKeys = Object.keys(allStates);
  for (const { field, label } of fieldsToCheck) {
    const values = stateKeys.map((k) => Number(allStates[k][field]) || 0);
    const zScores = computeZScores(values);
    const idx = stateKeys.indexOf(abbr);
    if (idx === -1) continue;
    const z = zScores[idx];
    if (Math.abs(z) >= 2) {
      anomalies.push({
        field,
        label,
        value: values[idx],
        zScore: z,
        direction: z > 0 ? "high" : "low",
        severity: Math.abs(z) >= 3 ? "extreme" : "notable",
      });
    }
  }
  return anomalies;
}

export function scoreStates(
  statesData: Record<string, StateData>,
  campuses: Campus[],
  config: ScoringConfig
): ScoredState[] {
  const normAcq = normalizeWeights(config.acquisitionWeights);
  const normCivic = normalizeWeights(config.civicWeights);

  // Aggregate campus data by state
  const campusByState: Record<string, { enrollment: number; count: number }> = {};
  for (const c of campuses) {
    const st = c.properties.state;
    if (!campusByState[st]) campusByState[st] = { enrollment: 0, count: 0 };
    campusByState[st].enrollment += c.properties.enrollment || 0;
    campusByState[st].count += 1;
  }

  const entries = Object.entries(statesData);
  const scored: ScoredState[] = entries.map(([abbr, data]) => {
    const dimensionScores: Record<string, number> = {};
    let acqScore = 0;
    let civicScore = 0;

    for (const [key, dim] of Object.entries(DIMENSION_KEYS)) {
      const val = Number(data[dim.field]) || 0;
      dimensionScores[key] = val;
      acqScore += (normAcq[key] || 0) * val;
      civicScore += (normCivic[key] || 0) * val;
    }

    const composite = config.alpha * acqScore + (1 - config.alpha) * civicScore;
    const anomalies = detectAnomalies(abbr, data, statesData);

    return {
      abbr,
      data,
      acqScore,
      civicScore,
      composite,
      rank: 0,
      quadrant: "deprioritize" as const,
      tier: 3 as const,
      anomalies,
      dimensionScores,
    };
  });

  // Rank by composite
  scored.sort((a, b) => b.composite - a.composite);
  scored.forEach((s, i) => (s.rank = i + 1));

  // Compute medians at 60th percentile
  const acqValues = scored.map((s) => s.acqScore).sort((a, b) => a - b);
  const civicValues = scored.map((s) => s.civicScore).sort((a, b) => a - b);
  const p60Idx = Math.floor(acqValues.length * 0.6);
  const acqMedian = acqValues[p60Idx] || 50;
  const civicMedian = civicValues[p60Idx] || 50;

  // Assign quadrants and tiers
  for (const s of scored) {
    const highAcq = s.acqScore >= acqMedian;
    const highCivic = s.civicScore >= civicMedian;
    if (highAcq && highCivic) s.quadrant = "launch";
    else if (highAcq && !highCivic) s.quadrant = "revenue";
    else if (!highAcq && highCivic) s.quadrant = "civic";
    else s.quadrant = "deprioritize";

    if (s.rank <= 12) s.tier = 1;
    else if (s.rank <= 30) s.tier = 2;
    else s.tier = 3;
  }

  return scored;
}

export function getQuadrantColor(q: string): string {
  switch (q) {
    case "launch": return "#3b82f6";
    case "revenue": return "#10b981";
    case "civic": return "#f59e0b";
    case "deprioritize": return "#64748b";
    default: return "#64748b";
  }
}

export function getQuadrantLabel(q: string): string {
  switch (q) {
    case "launch": return "Launch Priority";
    case "revenue": return "Revenue Opportunity";
    case "civic": return "Civic Beachhead";
    case "deprioritize": return "Deprioritize";
    default: return q;
  }
}

export function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return "#10b981";
    case 2: return "#f59e0b";
    case 3: return "#64748b";
    default: return "#64748b";
  }
}

export { DIMENSION_KEYS };
