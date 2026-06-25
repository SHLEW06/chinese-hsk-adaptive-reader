"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

const examplePassages = [
  {
    title: "我的一天",
    text: "我每天早上六点起床。先喝一杯水，然后吃早饭。我一边吃饭一边看中文书。",
  },
  {
    title: "周末计划",
    text: "这个周末我打算和朋友一起去公园。如果天气好，我们就去；如果下雨，就在家看电影。",
  },
];

export function ReaderInput({ onStart }: { onStart: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="reading-column animate-fade-in">
      <div className="mb-6 text-center">
        <div
          className="mb-2 text-[10.5px] uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
        >
          The reading room
        </div>
        <h1
          className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--ink)" }}
        >
          What would you like to read?
        </h1>
        <p className="mt-2 font-serif text-sm italic" style={{ color: "var(--muted)" }}>
          Paste any Chinese — a news headline, a song lyric, a paragraph from a novel.
          We&apos;ll segment it, gloss it, and let you tap any word.
        </p>
      </div>

      <div
        className="rounded-2xl p-3 shadow-paper"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="把中文粘贴到这里…"
          className="w-full resize-none rounded-xl bg-transparent p-3 font-cjk-serif text-lg leading-relaxed outline-none"
          style={{ color: "var(--ink)" }}
        />
        <div
          className="flex items-center justify-between gap-2 border-t pt-2.5"
          style={{ borderColor: "color-mix(in srgb, var(--line) 70%, transparent)" }}
        >
          <span className="text-[11px] italic" style={{ color: "var(--muted)" }}>
            {text.trim().length === 0
              ? "Or pick something from the Library →"
              : `${text.trim().length} characters`}
          </span>
          <button
            onClick={() => text.trim() && onStart(text.trim())}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium shadow-seal transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            style={{
              background: "linear-gradient(180deg, var(--seal), var(--seal-deep))",
              color: "#fff",
            }}
          >
            <Sparkles size={14} />
            Start reading
          </button>
        </div>
      </div>

      <div className="mt-7">
        <div
          className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "color-mix(in srgb, var(--muted) 75%, transparent)" }}
        >
          Try a sample
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {examplePassages.map((p) => (
            <button
              key={p.title}
              onClick={() => setText(p.text)}
              className="group rounded-xl px-3.5 py-3 text-left transition-all hover:-translate-y-px hover:shadow-paper"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <div className="font-cjk-serif text-base" style={{ color: "var(--ink)" }}>
                {p.title}
              </div>
              <div
                className="mt-0.5 line-clamp-1 font-cjk text-xs"
                style={{ color: "var(--muted)" }}
              >
                {p.text}
              </div>
            </button>
          ))}
        </div>
        <Link
          href="/library"
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
          style={{ color: "var(--seal)" }}
        >
          <BookOpen size={14} />
          Browse the full library
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
