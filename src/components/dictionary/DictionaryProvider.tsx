"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { loadDictionary } from "@/lib/dictionary/loadDictionary";
import {
  isFullDictionaryLoaded,
  subscribeDictionaryReady,
  dictionarySize,
} from "@/lib/dictionary/dictionary";

interface DictionaryCtx {
  ready: boolean;
  size: number;
}

const Ctx = createContext<DictionaryCtx>({ ready: false, size: 0 });

export function DictionaryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(isFullDictionaryLoaded);
  const [size, setSize] = useState(dictionarySize);

  useEffect(() => {
    if (isFullDictionaryLoaded()) {
      setReady(true);
      setSize(dictionarySize());
      return;
    }

    const unsub = subscribeDictionaryReady(() => {
      setReady(true);
      setSize(dictionarySize());
    });

    // Kick off the load
    loadDictionary();

    return unsub;
  }, []);

  return <Ctx.Provider value={{ ready, size }}>{children}</Ctx.Provider>;
}

/** Returns { ready, size } — ready flips to true when full dict is loaded. */
export function useDictionary(): DictionaryCtx {
  return useContext(Ctx);
}
