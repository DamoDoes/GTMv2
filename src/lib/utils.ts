export function parsePVI(pvi: string): number {
  if (!pvi || pvi === "EVEN") return 0;
  const match = pvi.match(/([DR])\+(\d+)/);
  if (!match) return 0;
  const val = parseInt(match[2]);
  return match[1] === "D" ? -val : val;
}

export function formatNumber(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(n % 1 === 0 ? 0 : 1);
}

export function formatPct(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(1) + "%";
}

export function stateAbbrToName(abbr: string): string {
  const map: Record<string, string> = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
    KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
    MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
    MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
    NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
    OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
    VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    DC: "District of Columbia",
  };
  return map[abbr] || abbr;
}

export function getCompositeColor(score: number): string {
  // 0-100 scale: dark blue → cyan → green → yellow → red
  if (score < 20) return "#1e3a5f";
  if (score < 35) return "#1e6091";
  if (score < 50) return "#0891b2";
  if (score < 65) return "#10b981";
  if (score < 80) return "#f59e0b";
  return "#ef4444";
}

export function getMetricColor(value: number, min: number, max: number): string {
  const t = max === min ? 0.5 : (value - min) / (max - min);
  // Dark to bright gradient
  const r = Math.round(30 + t * 195);
  const g = Math.round(58 + (1 - Math.abs(t - 0.5) * 2) * 140);
  const b = Math.round(95 + (1 - t) * 160);
  return `rgb(${r}, ${g}, ${b})`;
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
