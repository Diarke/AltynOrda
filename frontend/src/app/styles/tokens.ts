// Golden Horde Parchment design tokens, for places that need real values rather
// than CSS classes (e.g. recharts `stroke`/`fill` props, inline canvas/SVG code).
// Keep these in sync with styles/globalCss.ts and the hand-rolled classes in
// App.tsx — this file doesn't replace them, it's for non-CSS consumers only.
export const COLORS = {
  bg: "#EDE1C4",
  bgAlt: "#E6D8B8",
  card: "#F3E9D2",
  gold: "#B8892B",
  goldDark: "#8C6239",
  ink: "#2E2013",
  text: "#2E2013",
  muted: "#5C4E38",
  blue: "#6B8CA3",
  teal: "#6B8CA3",
  green: "#7C8B5A",
  red: "#A23E2E",
  bronze: "#8C6239",
  silver: "#9AA0A6",
  border: "rgba(59,42,19,0.18)",
} as const;

export const CHART_PALETTE = [COLORS.gold, COLORS.blue, COLORS.green, COLORS.red, "#C9A227"] as const;

export const RARITY_COLORS = {
  common: COLORS.bronze,
  rare: COLORS.silver,
  legendary: COLORS.gold,
} as const;

export const FONTS = {
  heading: "'Cinzel', serif",
  emphasis: "'Cormorant Garamond', serif",
  body: "'Inter', sans-serif",
} as const;
