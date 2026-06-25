"use client";

import { Languages, Type, Moon, Sun, Volume2 } from "lucide-react";
import {
  useReadingTheme,
  type TextSize,
} from "@/components/app-shell/ReadingThemeProvider";

const sizeOrder: TextSize[] = ["sm", "md", "lg", "xl"];

function nextSize(s: TextSize): TextSize {
  const i = sizeOrder.indexOf(s);
  return sizeOrder[(i + 1) % sizeOrder.length];
}

function sizeLabel(s: TextSize): string {
  return ({ sm: "A−", md: "A", lg: "A+", xl: "A++" } as const)[s];
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active ? "true" : "false"}
      className="group relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-all duration-200 ease-soft hover:-translate-y-px"
      style={{
        background: active
          ? "color-mix(in srgb, var(--seal) 12%, transparent)"
          : "transparent",
        color: active ? "var(--seal)" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

interface Props {
  speakable?: boolean;
  onSpeak?: () => void;
  className?: string;
}

export function ReaderToolbar({ speakable, onSpeak, className = "" }: Props) {
  const { theme, toggleTheme, textSize, setTextSize, pinyinOn, togglePinyin } =
    useReadingTheme();

  const isNight = theme === "night";

  return (
    <div
      className={`flex items-center gap-1 rounded-full px-1 py-1 backdrop-blur-md ${className}`}
      style={{
        background: "color-mix(in srgb, var(--surface) 75%, transparent)",
        border: "1px solid var(--line)",
      }}
      role="toolbar"
      aria-label="Reading controls"
    >
      <ToolbarButton
        active={pinyinOn}
        onClick={togglePinyin}
        title={pinyinOn ? "Hide pinyin" : "Show pinyin"}
      >
        <Languages size={14} />
        <span className="hidden sm:inline">pinyin</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => setTextSize(nextSize(textSize))}
        title={`Text size: ${sizeLabel(textSize)}`}
      >
        <Type size={14} />
        <span className="font-mono">{sizeLabel(textSize)}</span>
      </ToolbarButton>

      <ToolbarButton
        active={isNight}
        onClick={toggleTheme}
        title={isNight ? "Paper mode" : "Night reading"}
      >
        {isNight ? <Moon size={14} /> : <Sun size={14} />}
        <span className="hidden sm:inline">{isNight ? "night" : "paper"}</span>
      </ToolbarButton>

      {speakable && (
        <ToolbarButton onClick={onSpeak ?? (() => undefined)} title="Read aloud">
          <Volume2 size={14} />
        </ToolbarButton>
      )}
    </div>
  );
}
