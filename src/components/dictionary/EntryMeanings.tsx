import {
  alternateReadings,
  primaryGloss,
  secondaryDefinitions,
} from "@/lib/dictionary/entryGloss";
import type { WordEntry } from "@/types/dictionary";

export function EntryMeanings({ entry }: { entry: WordEntry }) {
  const primary = primaryGloss(entry);
  const secondary = secondaryDefinitions(entry);
  const alternates = alternateReadings(entry);

  return (
    <div className="mt-3 text-sm text-ink">
      <div className="font-medium leading-relaxed">{primary || "Meaning unavailable"}</div>

      {secondary.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 text-[10.5px] font-semibold uppercase text-seal/75">
            Secondary meanings
          </div>
          <ul className="space-y-1 text-muted">
            {secondary.map((definition) => (
              <li key={definition} className="flex gap-2 leading-relaxed">
                <span className="shrink-0 text-seal/45">•</span>
                <span>{definition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alternates.length > 0 && (
        <div className="mt-3 border-t border-line/70 pt-2.5">
          <div className="mb-1 text-[10.5px] font-semibold uppercase text-seal/75">
            Alternate pronunciations
          </div>
          <ul className="space-y-1.5 text-muted">
            {alternates.map((reading) => (
              <li key={reading.pinyin} className="leading-relaxed">
                <span className="font-medium text-ink">{reading.pinyin}</span>
                <span> · {reading.primaryGloss || reading.definitions[0] || "Meaning unavailable"}</span>
                {reading.definitions.length > 1 && (
                  <span> ({reading.definitions.slice(1).join("; ")})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
