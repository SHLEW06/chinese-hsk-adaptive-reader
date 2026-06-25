import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { HSK_UI_LEVELS } from "@/types/library";
import { libraryItems } from "@/data/library";
import { hskColor } from "@/lib/dictionary/hsk";
import reportData from "@/data/hskCoverageReport.json";
import type { HskCoverageReport } from "@/lib/library/coverage";

const report = reportData as unknown as HskCoverageReport | undefined;

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function CoverageBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div
        className="mb-1 flex items-baseline justify-between text-[11px]"
        style={{ color: "var(--muted)" }}
      >
        <span>{label}</span>
        <span className="font-medium" style={{ color: "var(--ink)" }}>
          {pct(v)}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full"
        style={{ background: "color-mix(in srgb, var(--line) 60%, transparent)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function ReadingPathPage() {
  const passagesByLevel: Record<number, number> = {};
  for (const it of libraryItems) {
    passagesByLevel[it.hskLevel] = (passagesByLevel[it.hskLevel] ?? 0) + 1;
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in px-4 py-6 pb-24 sm:py-8">
      <div className="mb-3">
        <Link
          href="/library"
          className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink"
        >
          <ArrowLeft size={13} /> Library
        </Link>
      </div>
      <header className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-muted">
          阅读之路 · Reading Path
        </div>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          HSK 1 → 6
        </h1>
        <p className="mt-1 font-serif text-sm italic text-muted">
          Walk through every level. Coverage tracks which HSK 3.0 words have
          appeared in the library so far.
        </p>
      </header>

      {!report && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-[13px]"
          style={{
            background: "color-mix(in srgb, #C98A1B 8%, transparent)",
            border: "1px solid color-mix(in srgb, #C98A1B 25%, transparent)",
            color: "var(--muted)",
          }}
        >
          Coverage report not generated yet. Run{" "}
          <code className="rounded bg-paper-2 px-1 py-0.5 text-[12px]">
            npm run hsk:coverage
          </code>
          .
        </div>
      )}

      <div className="space-y-4">
        {HSK_UI_LEVELS.map((lvl) => {
          const levelData = report?.levels.find((l) => l.level === lvl);
          const color = hskColor(lvl);
          const passageCount = passagesByLevel[lvl] ?? 0;
          return (
            <section
              key={lvl}
              className="rounded-2xl p-5 shadow-paper"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-3 py-1 text-sm font-semibold text-white"
                    style={{ background: color }}
                  >
                    HSK {lvl}
                  </span>
                  <span
                    className="text-[13px]"
                    style={{ color: "var(--ink)" }}
                  >
                    {passageCount} passage{passageCount === 1 ? "" : "s"}
                  </span>
                </div>
                <Link
                  href={`/library?level=${lvl}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium"
                  style={{ color: "var(--seal)" }}
                >
                  <BookOpen size={13} /> Browse
                </Link>
              </div>

              {levelData ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <CoverageBar
                    value={levelData.exclusiveCoveragePct}
                    color={color}
                    label={`Level-exclusive (${levelData.exclusiveCovered}/${levelData.exclusiveTotal})`}
                  />
                  <CoverageBar
                    value={levelData.cumulativeCoveragePct}
                    color="color-mix(in srgb, var(--seal) 80%, var(--celadon))"
                    label={`Cumulative HSK 1–${lvl} (${levelData.cumulativeCovered}/${levelData.cumulativeTotal})`}
                  />
                  <div className="sm:col-span-2 text-[11.5px] text-muted">
                    {levelData.exclusiveMissing.length} new-at-this-level words
                    still missing
                    {levelData.singleExposureWords.length > 0 && (
                      <>
                        {" "}· {levelData.singleExposureWords.length} appear only
                        once
                      </>
                    )}
                    {levelData.overusedWords.length > 0 && (
                      <>
                        {" "}· {levelData.overusedWords.length} appear 12+ times
                      </>
                    )}
                  </div>
                  {levelData.exclusiveMissing.length > 0 && (
                    <details className="sm:col-span-2 mt-2">
                      <summary
                        className="cursor-pointer text-[11.5px] italic"
                        style={{ color: "var(--muted)" }}
                      >
                        Show missing words
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1.5 font-cjk text-[13px] text-ink">
                        {levelData.exclusiveMissing.slice(0, 200).map((w) => (
                          <span
                            key={w}
                            className="rounded px-1.5 py-0.5"
                            style={{
                              background:
                                "color-mix(in srgb, var(--paper-2) 75%, transparent)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            {w}
                          </span>
                        ))}
                        {levelData.exclusiveMissing.length > 200 && (
                          <span className="text-[11.5px] italic text-muted">
                            … and {levelData.exclusiveMissing.length - 200} more
                          </span>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <p
                  className="text-[12px] italic"
                  style={{ color: "var(--muted)" }}
                >
                  Coverage not computed yet.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {report && (
        <p className="mt-6 text-[11px] italic text-muted">
          Coverage data generated {new Date(report.generatedAt).toLocaleString()}.
          HSK system: {report.hskSystem}.
        </p>
      )}
    </div>
  );
}
