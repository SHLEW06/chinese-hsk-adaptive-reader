/** HSK level colors + helpers used across the UI. */

export const HSK_COLORS: Record<string, string> = {
  "1": "#5E8B7E",
  "2": "#3E7CB1",
  "3": "#7A5BA6",
  "4": "#C98A1B",
  "5": "#B5562E",
  "6": "#9B3B5A",
  "7": "#7C3045",
  "8": "#5E2535",
  "9": "#44192A",
  "7-9": "#7C3045",
};

export const hskColor = (level?: number | "7-9"): string => {
  if (level === undefined) return "#9A9285";
  return HSK_COLORS[String(level)] ?? "#9A9285";
};

/** Label for HSK 3.0 levels. */
export const hskLabel = (level?: number | "7-9"): string =>
  level !== undefined ? `HSK ${level}` : "\u2014";
