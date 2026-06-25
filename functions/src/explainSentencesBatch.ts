import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getProvider, getProviderSecrets } from "./ai";
import { validateLevel, validateRuleBased } from "./ai/validate";

if (!getApps().length) initializeApp();
const db = getFirestore();

// One AI call covers up to MAX_BATCH sentences. The client splits larger
// articles into successive batches. Keeping this modest avoids token blowups
// and keeps a single failure from poisoning a whole long article.
const MAX_BATCH = 25;
const MAX_SENTENCE_LEN = 500;

// One rate-limit tick per AI call. Cache hits are free.
const RATE_LIMIT_MAX = 200;
const RATE_LIMIT_WINDOW_MS = 3600000;

async function checkRateLimit(uid: string): Promise<void> {
  const ref = db.collection("rateLimits").doc(uid);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { calls: number[] } | undefined;
    const recent = (data?.calls ?? []).filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT_MAX) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Max ${RATE_LIMIT_MAX} AI explanations per hour.`,
      );
    }
    tx.set(ref, {
      calls: [...recent, now],
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

function cacheHash(sentence: string, level: number): string {
  return createHash("sha256").update(`${sentence}|${level}`).digest("hex");
}

export const explainSentencesBatch = onCall(
  {
    secrets: getProviderSecrets(),
    region: "us-central1",
    maxInstances: 10,
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Sign in to use AI explanations");
    }

    const {
      sentences,
      level: rawLevel = 3,
      ruleBased = [],
    } = (req.data ?? {}) as {
      sentences?: unknown;
      level?: number;
      ruleBased?: unknown;
    };

    if (!Array.isArray(sentences) || sentences.length === 0) {
      throw new HttpsError("invalid-argument", "sentences[] is required");
    }
    if (sentences.length > MAX_BATCH) {
      throw new HttpsError(
        "invalid-argument",
        `at most ${MAX_BATCH} sentences per call`,
      );
    }
    for (const s of sentences) {
      if (typeof s !== "string" || s.length === 0 || s.length > MAX_SENTENCE_LEN) {
        throw new HttpsError("invalid-argument", "bad sentence in batch");
      }
    }
    const level = validateLevel(rawLevel);
    const rbArr: unknown[] = Array.isArray(ruleBased) ? ruleBased : [];
    // Each rule-based entry is interpolated into the prompt; cap per entry so
    // the total prompt stays bounded by MAX_BATCH * MAX_RULEBASED_JSON_BYTES.
    for (const rb of rbArr) validateRuleBased(rb);

    // 1. Cache lookup for every sentence
    const refs = sentences.map((s) =>
      db.collection("sentenceExplanations").doc(cacheHash(s as string, level)),
    );
    const snaps = await db.getAll(...refs);
    const results: Array<Record<string, unknown> | null> = snaps.map((snap) =>
      snap.exists ? (snap.data() as Record<string, unknown>) : null,
    );

    const missIdx: number[] = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i] === null) missIdx.push(i);
    }

    // All hits — return without touching the AI provider or the rate limiter
    if (missIdx.length === 0) return { results };

    // 2. Rate limit BEFORE the AI call (one tick per batch)
    await checkRateLimit(req.auth.uid);

    // 3. Build batched prompt
    const items = missIdx.map((i, k) => ({
      idx: k + 1,
      sentence: sentences[i] as string,
      ruleBased: rbArr[i] ?? {},
    }));

    const sys = `You are a Mandarin tutor for a ~HSK ${level} learner.
You are given a list of sentences with rule-based analyses. Return ONLY JSON:
{"explanations":[{"sentence":string,"translation":string,"phraseBreakdown":[{"phrase":string,"meaning":string}],"grammarPoints":[{"pattern":string,"explanation":string,"example":string}],"casualNotes":string[],"naturalMeaning":string}]}
"explanations" MUST have one entry per input item, in the same order. Each "sentence" field MUST equal the input sentence verbatim. Elaborate on each rule-based analysis; never contradict its grammar labels.`;

    const userText = items
      .map(
        (it) =>
          `# Item ${it.idx}\nSentence: ${it.sentence}\nRule-based: ${JSON.stringify(it.ruleBased)}`,
      )
      .join("\n\n");

    const provider = getProvider();
    const text = await provider.chat(
      [
        { role: "system", content: sys },
        { role: "user", content: userText },
      ],
      { json: true, temperature: 0.2 },
    );

    let parsed: { explanations?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new HttpsError("internal", "bad model JSON");
    }

    const explanations = parsed.explanations;
    if (!Array.isArray(explanations) || explanations.length !== items.length) {
      throw new HttpsError("internal", "model returned wrong shape");
    }

    // Match by sentence text so a reordered response still lands correctly.
    // Falls back to positional matching if exact match fails.
    const bySentence = new Map<string, Record<string, unknown>>();
    for (const e of explanations) {
      if (e && typeof e.sentence === "string") bySentence.set(e.sentence, e);
    }

    const writer = db.batch();
    for (let k = 0; k < missIdx.length; k++) {
      const i = missIdx[k];
      const inputSentence = sentences[i] as string;
      const matched = bySentence.get(inputSentence) ?? explanations[k];
      const exp = { ...matched, sentence: inputSentence, isRough: false };
      writer.set(refs[i], { ...exp, cachedAt: Date.now() });
      results[i] = exp;
    }
    await writer.commit();

    return { results };
  },
);
