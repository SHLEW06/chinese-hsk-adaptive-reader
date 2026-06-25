import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getProvider, getProviderSecrets } from "./ai";
import { validateLevel, validateRuleBased } from "./ai/validate";

if (!getApps().length) initializeApp();
const db = getFirestore();

// Rate limit: max AI calls per user per sliding window.
// Auto-explain fires one call per sentence on article load, so a typical
// 20–60-sentence article needs headroom on the first read. Cache hits are
// free and do not count against this budget.
const RATE_LIMIT_MAX = 200;         // calls allowed
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour

async function checkRateLimit(uid: string): Promise<void> {
  const ref = db.collection("rateLimits").doc(uid);
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { calls: number[]; } | undefined;

    // Filter to only calls within the window
    const recentCalls = (data?.calls ?? []).filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW_MS,
    );

    if (recentCalls.length >= RATE_LIMIT_MAX) {
      throw new HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Max ${RATE_LIMIT_MAX} AI explanations per hour.`,
      );
    }

    tx.set(ref, { calls: [...recentCalls, now], updatedAt: FieldValue.serverTimestamp() });
  });
}

export const explainSentence = onCall(
  {
    secrets: getProviderSecrets(),
    region: "us-central1",
    // Cap concurrent instances to limit cost exposure from traffic spikes
    maxInstances: 10,
    // Enforce that the caller is authenticated
  },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError("unauthenticated", "Sign in to use AI explanations");
    }

    const { sentence, level: rawLevel = 3, ruleBased } = (req.data ?? {}) as {
      sentence?: string;
      level?: number;
      ruleBased?: unknown;
    };

    if (!sentence || typeof sentence !== "string") {
      throw new HttpsError("invalid-argument", "sentence is required");
    }

    if (sentence.length > 500) {
      throw new HttpsError("invalid-argument", "sentence too long");
    }

    const level = validateLevel(rawLevel);
    validateRuleBased(ruleBased);

    // Shared, non-user-scoped cache keyed by sentence + level
    const hash = createHash("sha256")
      .update(`${sentence}|${level}`)
      .digest("hex");
    const ref = db.collection("sentenceExplanations").doc(hash);
    const snap = await ref.get();
    if (snap.exists) return snap.data()!;

    // Check per-user rate limit BEFORE calling the AI (cache hits are free)
    await checkRateLimit(req.auth.uid);

    const sys = `You are a Mandarin tutor for a ~HSK ${level} learner.
You are given a sentence and a rule-based analysis. Return ONLY JSON of shape:
{"sentence":string,"translation":string,"phraseBreakdown":[{"phrase":string,"meaning":string}],
"grammarPoints":[{"pattern":string,"explanation":string,"example":string}],
"casualNotes":string[],"naturalMeaning":string}
Elaborate on the provided analysis; never contradict its grammar labels.`;

    const provider = getProvider();
    const text = await provider.chat(
      [
        { role: "system", content: sys },
        {
          role: "user",
          content: `Sentence: ${sentence}\nRule-based: ${JSON.stringify(ruleBased ?? {})}`,
        },
      ],
      { json: true, temperature: 0.2 },
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new HttpsError("internal", "bad model JSON");
    }

    const result = { ...parsed, sentence, isRough: false };
    await ref.set({ ...result, cachedAt: Date.now() });
    return result;
  },
);
