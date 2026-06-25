"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ReadingTheme = "paper" | "night";
export type TextSize = "sm" | "md" | "lg" | "xl";
export type FontStyle = "sans" | "serif";

interface State {
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
  toggleTheme: () => void;

  textSize: TextSize;
  setTextSize: (s: TextSize) => void;

  pinyinOn: boolean;
  setPinyinOn: (v: boolean) => void;
  togglePinyin: () => void;

  fontStyle: FontStyle;
  setFontStyle: (s: FontStyle) => void;
}

const Ctx = createContext<State | null>(null);

const LS_KEY = "car.reading.prefs.v1";

interface Prefs {
  theme: ReadingTheme;
  textSize: TextSize;
  pinyinOn: boolean;
  fontStyle: FontStyle;
}

const DEFAULTS: Prefs = { theme: "paper", textSize: "md", pinyinOn: false, fontStyle: "sans" };

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

function writePrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* quota or serialization issues are non-fatal */
  }
}

export function ReadingThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  // Hydrate from localStorage on mount, then sync html[data-theme].
  useEffect(() => {
    const next = readPrefs();
    setPrefs(next);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = prefs.theme;
    writePrefs(prefs);
  }, [prefs]);

  const value = useMemo<State>(() => ({
    theme: prefs.theme,
    setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
    toggleTheme: () => setPrefs((p) => ({ ...p, theme: p.theme === "paper" ? "night" : "paper" })),

    textSize: prefs.textSize,
    setTextSize: (textSize) => setPrefs((p) => ({ ...p, textSize })),

    pinyinOn: prefs.pinyinOn,
    setPinyinOn: (pinyinOn) => setPrefs((p) => ({ ...p, pinyinOn })),
    togglePinyin: () => setPrefs((p) => ({ ...p, pinyinOn: !p.pinyinOn })),

    fontStyle: prefs.fontStyle,
    setFontStyle: (fontStyle) => setPrefs((p) => ({ ...p, fontStyle })),
  }), [prefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReadingTheme(): State {
  const v = useContext(Ctx);
  if (!v) {
    // Fallback so non-Reader pages can still call this safely.
    return {
      theme: "paper", setTheme: () => {}, toggleTheme: () => {},
      textSize: "md", setTextSize: () => {},
      pinyinOn: false, setPinyinOn: () => {}, togglePinyin: () => {},
      fontStyle: "sans", setFontStyle: () => {},
    };
  }
  return v;
}

/** Resolve the current reading text-size to the matching Tailwind font-size class. */
export function readingFontClass(size: TextSize): string {
  switch (size) {
    case "sm": return "text-reading-sm";
    case "md": return "text-reading";
    case "lg": return "text-reading-lg";
    case "xl": return "text-reading-xl";
  }
}
