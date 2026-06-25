"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, GraduationCap } from "lucide-react";
import { SavedWordCard } from "@/components/saved-words/SavedWordCard";
import { Button } from "@/components/ui/Button";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { SavedWord, SavedWordStatus } from "@/types/savedWord";

type StatusFilter = SavedWordStatus | "all";

export default function SavedWordsPage() {
  const { user } = useAuth();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    let cancelled = false;
    getStorageProvider(user).getSavedWords().then((next) => {
      if (!cancelled) setWords(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const changeStatus = async (id: string, s: SavedWordStatus) => {
    setWords((current) => current.map((w) => w.id === id ? { ...w, status: s } : w));
    await getStorageProvider(user).updateSavedWord(id, { status: s });
  };
  const remove = async (id: string) => {
    setWords((current) => current.filter((w) => w.id !== id));
    await getStorageProvider(user).deleteSavedWord(id);
  };

  const filtered = useMemo(
    () =>
      words.filter((w) => {
        const matchStatus = status === "all" || w.status === status;
        const q = query.trim().toLowerCase();
        const matchQuery =
          !q ||
          w.simplified.includes(q) ||
          w.pinyin.toLowerCase().includes(q) ||
          w.definitions.some((d) => d.toLowerCase().includes(q));
        return matchStatus && matchQuery;
      }),
    [words, status, query],
  );

  const exportCsv = () => {
    const header = ["simplified", "traditional", "pinyin", "definition", "hsk", "status", "sourceSentence"];
    const rows = words.map((w) =>
      [
        w.simplified,
        w.traditional ?? "",
        w.pinyin,
        w.definitions.join(" / "),
        w.hskLevel ?? "",
        w.status,
        (w.sourceSentence ?? "").replace(/\n/g, " "),
      ]
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saved-words.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Saved Words</h1>
          <p className="text-sm text-muted">
            {words.length} words saved. Review them with spaced repetition — they
            graduate to <Link href="/vocabulary/learned" className="text-seal hover:underline">Learned</Link>{" "}
            once they reach a weekly interval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/vocabulary/study?deck=saved"
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium shadow-paper transition-all ${
              words.length === 0
                ? "pointer-events-none border border-line bg-surface text-muted opacity-60"
                : "border border-seal/40 bg-seal text-white hover:-translate-y-px"
            }`}
            aria-disabled={words.length === 0}
          >
            <GraduationCap size={15} /> Study (SRS)
          </Link>
          <Button onClick={exportCsv} variant="secondary" disabled={words.length === 0}>
            <Download size={15} /> CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words, pinyin, meaning…"
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-seal"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-seal"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="known">Known</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
          {words.length === 0
            ? "No saved words yet. Open the Reader and tap words to save them."
            : "No words match your filter."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((w) => (
            <SavedWordCard key={w.id} word={w} onStatus={changeStatus} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
