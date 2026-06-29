/** Shared color tokens for Recharts (must be concrete hex, not CSS vars). */
export const CHART = {
  pass: "#2dd4a7",
  flagged: "#f59e0b",
  blocked: "#f0526a",
  primary: "#10b981",
  accent: "#2dd4a7",
  grid: "#1d3149",
  axis: "#5d6f8a",
  surface: "#0f1c2e",
  border: "#1d3149",
};

/** A categorical palette for model / topic bars (emerald-led, like the mockup). */
export const PALETTE = [
  "#2dd4a7",
  "#10b981",
  "#34d399",
  "#22d3ee",
  "#5eead4",
  "#6ee7b7",
];

export const tooltipStyle = {
  background: CHART.surface,
  border: `1px solid ${CHART.border}`,
  borderRadius: 8,
  fontSize: 12,
  color: "#e8edf5",
};
