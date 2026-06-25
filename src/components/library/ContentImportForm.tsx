"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { buildImportedContent } from "@/lib/content/importContent";
import { setActiveReading } from "@/lib/storage/localStore";
import { getStorageProvider } from "@/lib/storage/storageProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { CONTENT_CATEGORIES, type ContentCategory } from "@/types/content";

export function ContentImportForm({ onImported }: { onImported?: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ContentCategory | "">("");

  const save = async (openNow: boolean) => {
    if (!text.trim()) return;
    const item = buildImportedContent({
      title,
      text,
      category: category || undefined,
    });
    await getStorageProvider(user).saveImportedContent(item);
    setTitle("");
    setText("");
    setCategory("");
    await onImported?.();
    if (openNow) {
      setActiveReading(item);
      router.push("/reader");
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="mb-3 font-semibold text-ink">Import custom text</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="mb-2 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm outline-none focus:border-seal"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Paste Chinese text…"
        className="mb-2 w-full rounded-lg border border-line bg-surface2 px-3 py-2 font-cjk text-base outline-none focus:border-seal"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as ContentCategory | "")}
        className="mb-3 w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm outline-none focus:border-seal"
      >
        <option value="">Auto-detect category</option>
        {CONTENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button onClick={() => save(false)} variant="secondary">
          Save to library
        </Button>
        <Button onClick={() => save(true)}>Save &amp; read</Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Difficulty and keywords are estimated automatically and saved to your active storage.
      </p>
    </div>
  );
}
