// Raw Dark Luxury design tokens, for places that need real values rather than
// CSS classes (e.g. recharts `stroke`/`fill` props, inline canvas/SVG code).
// Keep these in sync with styles/globalCss.ts and the hand-rolled classes in
// App.tsx — this file doesn't replace them, it's for non-CSS consumers only.
export const COLORS = {
  bg: "#0F1115",
  bgAlt: "#12141B",
  card: "#22262F",
  gold: "#D4AF37",
  goldDark: "#C9962C",
  text: "#F6F4EC",
  muted: "#B7BAC3",
  teal: "#57D6D1",
  green: "#6FCF97",
  red: "#EB5757",
  border: "rgba(255,255,255,0.06)",
} as const;

export const CHART_PALETTE = [COLORS.gold, COLORS.teal, COLORS.green, COLORS.red, "#F2C94C"] as const;

export const FONTS = {
  heading: "'Cinzel', serif",
  emphasis: "'Cormorant Garamond', serif",
  body: "'Inter', sans-serif",
} as const;
