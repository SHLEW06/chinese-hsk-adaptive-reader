"use client";

import { Trash2 } from "lucide-react";
import { hskColor } from "@/lib/dictionary/hsk";
import type { SavedWord, SavedWordStatus } from "@/types/savedWord";

export function SavedWordCard({
  word,
  onStatus,
  onDelete,
}: {
  word: SavedWord;
  onStatus: (id: string, status: SavedWordStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
      <div className="min-w-[2.75rem] font-cjk text-2xl">{word.simplified}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">
          {word.pinyin}
          {word.hskLevel ? (
            <span style={{ color: hskColor(word.hskLevel) }}> · HSK {word.hskLevel}</span>
          ) : null}
        </div>
        <div className="truncate text-sm">{word.definitions[0]}</div>
        {word.sourceSentence && (
          <div className="mt-0.5 truncate font-cjk text-xs italic text-muted">
            “{word.sourceSentence}”
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <select
          value={word.status}
          onChange={(e) => onStatus(word.id, e.target.value as SavedWordStatus)}
          className={`rounded border border-line bg-transparent px-1 py-0.5 text-xs ${
            word.status === "known" ? "text-celadon" : "text-ink"
          }`}
        >
          <option value="new">new</option>
          <option value="learning">learning</option>
          <option value="known">known</option>
        </select>
        <button onClick={() => onDelete(word.id)} className="text-muted hover:text-seal">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
