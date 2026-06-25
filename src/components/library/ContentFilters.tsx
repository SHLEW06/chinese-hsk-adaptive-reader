"use client";

import { CONTENT_CATEGORIES, type ContentCategory } from "@/types/content";
import { hskColor } from "@/lib/dictionary/hsk";

export type CategoryFilter = ContentCategory | "All";
export type LevelFilter = number | "All";

interface Props {
  category: CategoryFilter;
  onCategoryChange: (v: CategoryFilter) => void;
  level: LevelFilter;
  onLevelChange: (v: LevelFilter) => void;
}

function Chip({
  active,
  onClick,
  children,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  swatch?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-all"
      style={
        active
          ? {
              background: "var(--seal)",
              color: "#fff",
              border: "1px solid var(--seal)",
            }
          : {
              background: "color-mix(in srgb, var(--surface) 70%, transparent)",
              color: "var(--muted)",
              border: "1px solid var(--line)",
            }
      }
    >
      {swatch && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: swatch }}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

export function ContentFilters({
  category,
  onCategoryChange,
  level,
  onLevelChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <div
          className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 85%, transparent)" }}
        >
          Level
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={level === "All"} onClick={() => onLevelChange("All")}>
            All levels
          </Chip>
          {[1, 2, 3, 4, 5, 6].map((lvl) => (
            <Chip
              key={lvl}
              active={level === lvl}
              onClick={() => onLevelChange(lvl)}
              swatch={hskColor(lvl)}
            >
              HSK {lvl}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div
          className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 85%, transparent)" }}
        >
          Category
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={category === "All"}
            onClick={() => onCategoryChange("All")}
          >
            All
          </Chip>
          {CONTENT_CATEGORIES.map((opt) => (
            <Chip
              key={opt}
              active={category === opt}
              onClick={() => onCategoryChange(opt)}
            >
              {opt}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
