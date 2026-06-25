"use client";

import { useEffect, useMemo, useState } from "react";
import { SegmentedText } from "./SegmentedText";
import { WordPopup } from "./WordPopup";
import { SentenceExplanationPanel } from "./SentenceExplanationPanel";
import {
  ExplanationsProvider,
  type StaticTranslations,
} from "./ExplanationsProvider";
import { ReaderToolbar } from "./ReaderToolbar";
import { splitParagraphs } from "@/lib/segmentation/sentenceSplit";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import { uid, todayISO } from "@/lib/utils/text";
import type { WordEntry } from "@/types/dictionary";
import type { SavedWord } from "@/types/savedWord";

interface PopupState {
  text: string;
  entry: WordEntry | null;
  sentence: string;
}

export function ContentReader({
  text,
  title,
  contentId,
  staticTranslations,
  showTitle = true,
}: {
  text: string;
  title?: string;
  contentId?: string;
  /** Curated translations and optional authored explanation details. */
  staticTranslations?: StaticTranslations;
  /** LibraryDetail already renders the reading heading and metadata. */
  showTitle?: boolean;
}) {
  const { user } = useAuth();
  const { ready: dictReady } = useDictionary();
  const [saved, setSaved] = useState<SavedWord[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [explainSentence, setExplainSentence] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getStorageProvider(user)
      .getSavedWords()
      .then((words) => {
        if (!cancelled) setSaved(words);
      })
      .catch((error) => {
        // A reading is static and should remain readable when optional
        // progress storage is offline or temporarily unavailable.
        console.warn("[reader] Could not load saved words:", error);
        if (!cancelled) setSaved([]);
      });
    if (title) {
      void getStorageProvider(user)
        .saveReadingEvent({ id: contentId ?? uid("read"), title, date: todayISO() })
        .catch((error) => console.warn("[reader] Could not save reading event:", error));
    }
    return () => {
      cancelled = true;
    };
  }, [title, contentId, user]);

  const savedSet = useMemo(() => new Set(saved.map((w) => w.simplified)), [saved]);
  const characterCount = useMemo(
    () => Array.from(text.replace(/\s/g, "")).length,
    [text],
  );

  // Flatten once so every sentence can resolve to its curated translation and
  // local grammar/dictionary breakdown.
  const allSentences = useMemo(
    () => splitParagraphs(text).flat(),
    [text],
  );

  const saveWord = (entry: WordEntry, sentence?: string) => {
    if (savedSet.has(entry.simplified)) return;
    const word: SavedWord = {
      id: uid("word"),
      simplified: entry.simplified,
      traditional: entry.traditional,
      pinyin: entry.pinyin,
      definitions: entry.definitions,
      hskLevel: entry.hskLevel,
      sourceSentence: sentence,
      status: "new",
      dateSaved: todayISO(),
      reviewCount: 0,
    };
    setSaved((items) => [word, ...items]);
    void getStorageProvider(user).saveSavedWord(word);
  };

  const markKnown = (entry: WordEntry) => {
    const existing = saved.find((w) => w.simplified === entry.simplified);
    if (existing) {
      setSaved((items) => items.map((w) => (w.id === existing.id ? { ...w, status: "known" } : w)));
      void getStorageProvider(user).updateSavedWord(existing.id, { status: "known" });
    } else {
      const word: SavedWord = {
          id: uid("word"),
          simplified: entry.simplified,
          traditional: entry.traditional,
          pinyin: entry.pinyin,
          definitions: entry.definitions,
          hskLevel: entry.hskLevel,
          status: "known",
          dateSaved: todayISO(),
          reviewCount: 0,
      };
      setSaved((items) => [word, ...items]);
      void getStorageProvider(user).saveSavedWord(word);
    }
  };

  return (
    <div className="animate-fade-in">
      {title && showTitle && (
        <div className="reading-column mb-2 text-center">
          <div
            className="text-[10.5px] uppercase tracking-[0.18em]"
            style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
          >
            一篇文章 · A reading
          </div>
          <h1
            className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: "var(--ink)" }}
          >
            {title}
          </h1>
        </div>
      )}

      <div
        className="reading-column mb-5 flex flex-wrap items-center justify-between gap-y-2 pb-2 text-[11px]"
        style={{
          borderBottom: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          color: "var(--muted)",
        }}
      >
        <span className="italic">
          Tap a word for its meaning · use ✨ for a sentence explanation
        </span>
        <span className="flex items-center gap-3">
          {!dictReady && (
            <span className="inline-flex items-center gap-1" style={{ color: "var(--seal)" }}>
              <span className="refine-dot" />
              loading dictionary…
            </span>
          )}
          {dictReady && (
            <span className="inline-flex items-center gap-1" style={{ color: "var(--celadon)" }}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--celadon)" }}
              />
              dictionary ready
            </span>
          )}
          <span>{characterCount.toLocaleString()} chars</span>
          <span>{saved.length} saved</span>
        </span>
      </div>

      <div className="reading-column mb-4 flex justify-center">
        <ReaderToolbar />
      </div>

      <ExplanationsProvider
        sentences={allSentences}
        staticTranslations={staticTranslations}
      >
        <div
          className="rounded-2xl px-5 py-7 shadow-paper sm:px-10 sm:py-10"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
          }}
        >
          <SegmentedText
            text={text}
            contentId={contentId}
            onWord={(t, entry, sentence) => setPopup({ text: t, entry, sentence })}
            onExplain={(sentence) => setExplainSentence(sentence)}
          />
        </div>

        {explainSentence && (
          <SentenceExplanationPanel
            sentence={explainSentence}
            onClose={() => setExplainSentence(null)}
          />
        )}
      </ExplanationsProvider>

      {popup && (
        <WordPopup
          text={popup.text}
          entry={popup.entry}
          sourceSentence={popup.sentence}
          alreadySaved={savedSet.has(popup.text)}
          onClose={() => setPopup(null)}
          onSave={(entry, src) => {
            saveWord(entry, src);
            setPopup(null);
          }}
          onMarkKnown={(entry) => {
            markKnown(entry);
            setPopup(null);
          }}
        />
      )}
    </div>
  );
}
