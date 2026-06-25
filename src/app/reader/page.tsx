"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ReaderInput } from "@/components/reader/ReaderInput";
import { ContentReader } from "@/components/reader/ContentReader";
import { getActiveReading, clearActiveReading } from "@/lib/storage/localStore";
import type { ContentItem } from "@/types/content";

export default function ReaderPage() {
  const [text, setText] = useState<string | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [contentId, setContentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const active: ContentItem | null = getActiveReading();
    if (!active) return;
    setText(active.text);
    setTitle(active.title);
    setContentId(active.id);
    clearActiveReading();
  }, []);

  const reset = () => {
    setText(null);
    setTitle(undefined);
    setContentId(undefined);
  };

  return (
    <div>
      {text && (
        <div className="reading-column mb-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-[12px] italic transition-opacity hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            <ArrowLeft size={13} /> New text
          </button>
        </div>
      )}

      {text ? (
        <ContentReader text={text} title={title} contentId={contentId} />
      ) : (
        <ReaderInput onStart={(t) => setText(t)} />
      )}
    </div>
  );
}
