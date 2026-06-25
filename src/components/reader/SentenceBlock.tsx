"use client";

import { Sparkles } from "lucide-react";
import { isCJK } from "@/lib/utils/text";
import { getPinyinFallback } from "@/lib/dictionary/pinyinFallback";
import { useReadingTheme } from "@/components/app-shell/ReadingThemeProvider";
import type { Token } from "@/lib/segmentation/segment";
import type { WordEntry } from "@/types/dictionary";

interface Props {
  sentence: string;
  tokens: Token[];
  sentenceIndex: number;
  onWord: (text: string, entry: WordEntry | null, sentence: string) => void;
  onOpenPanel: (sentence: string) => void;
}

function RenderToken({
  tok,
  onWord,
  sentence,
  pinyinOn,
}: {
  tok: Token;
  onWord: (text: string, entry: WordEntry | null, sentence: string) => void;
  sentence: string;
  pinyinOn: boolean;
}) {
  if (tok.kind === "other") return <span>{tok.text}</span>;

  const clickable = tok.kind === "word" || isCJK(tok.text[0]);
  const pinyin =
    tok.entry?.pinyin ?? (isCJK(tok.text[0]) ? getPinyinFallback(tok.text) : "");

  const inner = (
    <ruby className="cjk-ruby">
      <span>{tok.text}</span>
      {pinyinOn && pinyin ? <rt>{pinyin}</rt> : <rt aria-hidden="true">&nbsp;</rt>}
    </ruby>
  );

  return (
    <span
      onClick={() => clickable && onWord(tok.text, tok.entry, sentence)}
      className="word-tap"
      data-flag={tok.kind === "word" ? "word" : "char"}
    >
      {inner}
    </span>
  );
}

/**
 * A single sentence in the reading. Renders as inline content so several
 * sentences flow together within the paragraph: each token is an inline span,
 * the trailing Explain button is an inline-flex element aligned to the
 * baseline, and a thin trailing space lets the next sentence sit beside it
 * rather than dropping to its own line.
 *
 * Typography (font family + size + line-height) is owned by the paragraph in
 * SegmentedText so every sentence on the same paragraph shares one rhythm.
 */
export function SentenceBlock({
  sentence,
  tokens,
  sentenceIndex,
  onWord,
  onOpenPanel,
}: Props) {
  const { pinyinOn } = useReadingTheme();

  return (
    <>
      {tokens.map((tok, ti) => (
        <RenderToken
          key={ti}
          tok={tok}
          onWord={onWord}
          sentence={sentence}
          pinyinOn={pinyinOn}
        />
      ))}
      <button
        type="button"
        onClick={() => onOpenPanel(sentence)}
        aria-label={`Explain sentence ${sentenceIndex + 1}`}
        title="Explain this sentence"
        className="explain-chip"
      >
        <Sparkles size={11} aria-hidden="true" />
      </button>
      {/* Trailing thin space so the next sentence flows on the same line. */}
      <span aria-hidden="true">{" "}</span>
    </>
  );
}
