"use client";

import { useMemo } from "react";
import { splitParagraphs } from "@/lib/segmentation/sentenceSplit";
import { segment } from "@/lib/segmentation/segment";
import { useDictionary } from "@/components/dictionary/DictionaryProvider";
import {
  readingFontClass,
  useReadingTheme,
} from "@/components/app-shell/ReadingThemeProvider";
import { SentenceBlock } from "./SentenceBlock";
import type { WordEntry } from "@/types/dictionary";

interface Props {
  text: string;
  contentId?: string;
  onWord: (text: string, entry: WordEntry | null, sentence: string) => void;
  onExplain: (sentence: string) => void;
}

export function SegmentedText({ text, contentId, onWord, onExplain }: Props) {
  const { ready } = useDictionary();
  const { textSize, fontStyle, pinyinOn } = useReadingTheme();

  // Re-segment when text changes OR when the full dictionary finishes loading
  const paragraphs = useMemo(() => {
    let sentenceIndex = 0;
    return splitParagraphs(text).map((sentences) =>
      sentences.map((sentence) => ({
        raw: sentence,
        tokens: segment(sentence),
        sentenceIndex: sentenceIndex++,
      })),
    );
  }, [contentId, text, ready]);

  const cjkFont = fontStyle === "serif" ? "font-cjk-serif" : "font-cjk";
  const sizeClass = readingFontClass(textSize);
  // Pinyin annotations sit above the baseline and need extra vertical room;
  // keep the bump on the paragraph so every sentence shares the same rhythm.
  const pinyinLeading = pinyinOn ? "leading-[2.8]" : "";

  return (
    <div className="reading-column space-y-6">
      {paragraphs.map((para, pi) => (
        <p
          key={pi}
          className={`${cjkFont} ${sizeClass} ${pinyinLeading}`}
          style={{ color: "var(--ink)" }}
        >
          {para.map(({ raw: sentence, tokens, sentenceIndex }, si) => (
            <SentenceBlock
              key={si}
              sentence={sentence}
              tokens={tokens}
              sentenceIndex={sentenceIndex}
              onWord={onWord}
              onOpenPanel={onExplain}
            />
          ))}
        </p>
      ))}
    </div>
  );
}
