import { HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { createGroqProvider } from "./providers/groq";

/* ──────────────────────────────────────────────────────────────────────────
 * Shared AI types
 * ────────────────────────────────────────────────────────────────────────── */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  /** Override the default model for this single call. */
  model?: string;
  /** Sampling temperature. Defaults are provider-specific. */
  temperature?: number;
  /** Hard cap on output tokens. */
  maxTokens?: number;
  /** If true, request structured JSON (provider must support it). */
  json?: boolean;
}

export interface AIProvider {
  /** Stable provider id (e.g. "groq"). */
  readonly name: string;
  /**
   * Send a chat-completion request and return the assistant's raw text.
   * Throws `HttpsError("resource-exhausted")` on rate limits and
   * `HttpsError("internal")` on other provider failures.
   */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  /**
   * Convenience wrapper: pastes Chinese text in, gets a structured
   * markdown study explanation out. See CHINESE_TUTOR_PROMPT below.
   */
  explainChineseText(text: string): Promise<string>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Provider selection
 *
 * Only Groq is implemented today. Add new entries to PROVIDERS as DeepSeek,
 * OpenRouter, SiliconFlow, etc. land. The runtime provider is picked by
 * AI_PROVIDER (defaults to "groq").
 *
 * Each provider also declares the secret(s) it needs; callers should attach
 * `getProviderSecrets()` to their `onCall` config so Firebase mounts them.
 * ────────────────────────────────────────────────────────────────────────── */

export const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
// TODO: when adding DeepSeek/OpenRouter, defineSecret for each here.

type ProviderId = "groq";

type ProviderFactory = () => AIProvider;

const PROVIDERS: Record<ProviderId, ProviderFactory> = {
  groq: () =>
    createGroqProvider({
      apiKey: GROQ_API_KEY.value(),
      // Primary cheap+fast model. Override per-call via opts.model
      // (e.g. pass "llama-3.3-70b-versatile" for tougher prompts).
      defaultModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    }),
};

function pickProviderId(): ProviderId {
  const raw = (process.env.AI_PROVIDER || "groq").toLowerCase();
  if (raw in PROVIDERS) return raw as ProviderId;
  throw new HttpsError("internal", `Unknown AI_PROVIDER: ${raw}`);
}

/** Construct the active provider. Call once per request — secrets are lazy. */
export function getProvider(): AIProvider {
  return PROVIDERS[pickProviderId()]();
}

/** Secrets the active provider depends on. Attach to `onCall({ secrets })`. */
export function getProviderSecrets(): ReturnType<typeof defineSecret>[] {
  const id = pickProviderId();
  if (id === "groq") return [GROQ_API_KEY];
  return [];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Shared prompts + helpers
 * ────────────────────────────────────────────────────────────────────────── */

/** The paste-Chinese-text → markdown explanation prompt from the spec. */
export const CHINESE_TUTOR_PROMPT = `You are a Chinese tutor for English-speaking learners. Given Chinese text, return a clear, concise study explanation. Include:
1. Natural English translation
2. Pinyin
3. Key vocabulary with meanings
4. Grammar notes
5. Literal meaning if different from the natural translation

Do not over-explain simple sentences. Keep the answer useful for language learning.

Format the response as markdown with these section headings:
## Translation
## Pinyin
## Vocabulary
## Grammar Notes
## Literal Meaning`;

/** Max chars accepted by the paste-text helper. Rejects oversize input early. */
export const MAX_EXPLAIN_INPUT_CHARS = 4000;

/**
 * Validate + dispatch the paste-text helper. Throws HttpsError on bad input.
 *
 * NOTE: this path is not currently wired to a UI. The existing reader flow
 * uses chat() directly with its own JSON-shaped prompt. If/when a paste-text
 * UI is added, route it here and add a Firestore cache layer (the existing
 * `sentenceExplanations` collection is JSON-shaped and not reusable as-is).
 * TODO(cache): add a markdown cache collection keyed by sha256(text|provider|model).
 */
export async function explainChineseText(text: string): Promise<string> {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new HttpsError("invalid-argument", "text is required");
  }
  if (text.length > MAX_EXPLAIN_INPUT_CHARS) {
    throw new HttpsError(
      "invalid-argument",
      `text too long (max ${MAX_EXPLAIN_INPUT_CHARS} chars)`,
    );
  }
  const provider = getProvider();
  return provider.explainChineseText(text);
}
