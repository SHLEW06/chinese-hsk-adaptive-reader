"use client";

import { Moon, Sun } from "lucide-react";
import { useReadingTheme } from "@/components/app-shell/ReadingThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useReadingTheme();
  const isNight = theme === "night";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isNight ? "Switch to paper mode" : "Switch to night reading mode"}
      title={isNight ? "Paper mode" : "Night reading mode"}
      className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${className}`}
      style={{
        background: "color-mix(in srgb, var(--paper-2) 70%, transparent)",
        border: "1px solid var(--line)",
        color: "var(--muted)",
      }}
    >
      <span className="relative block h-4 w-4">
        <Sun
          size={16}
          className={`absolute inset-0 transition-all duration-300 ease-soft ${
            isNight ? "scale-50 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"
          }`}
        />
        <Moon
          size={16}
          className={`absolute inset-0 transition-all duration-300 ease-soft ${
            isNight ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 -rotate-90"
          }`}
        />
      </span>
    </button>
  );
}
