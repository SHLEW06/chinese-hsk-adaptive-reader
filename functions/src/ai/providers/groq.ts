import { HttpsError } from "firebase-functions/v2/https";
import {
  CHINESE_TUTOR_PROMPT,
  type AIProvider,
  type ChatMessage,
  type ChatOptions,
} from "../index";

/**
 * Groq exposes an OpenAI-compatible chat-completions API. The only
 * Groq-specific bits are the base URL and the model ids.
 */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

interface GroqConfig {
  apiKey: string;
  defaultModel: string;
}

interface OpenAiChatChoice {
  message?: { content?: string };
}

interface OpenAiChatResponse {
  choices?: OpenAiChatChoice[];
}

export function createGroqProvider(cfg: GroqConfig): AIProvider {
  if (!cfg.apiKey) {
    // defineSecret returns "" when the secret isn't bound to the function.
    // Fail loudly here rather than at fetch time.
    throw new HttpsError(
      "failed-precondition",
      "GROQ_API_KEY is not set. Add it via `firebase functions:secrets:set GROQ_API_KEY` or in your local .env.",
    );
  }

  async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const model = opts.model ?? cfg.defaultModel;
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
    };
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;
    if (opts.json) body.response_format = { type: "json_object" };

    let res: Response;
    try {
      res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Network-level failure (DNS, TLS, timeout, etc.). Detail stays in logs.
      console.error("[ai/groq] network failure", err);
      throw new HttpsError("unavailable", "AI provider unreachable");
    }

    if (!res.ok) {
      const status = res.status;
      // Log the upstream message for ops, but don't ship it to clients —
      // Groq's bodies can echo config detail (e.g. "Invalid API key…").
      const detail = await safeReadError(res);
      console.error("[ai/groq] upstream error", { status, detail });
      if (status === 429) {
        throw new HttpsError("resource-exhausted", "AI provider rate limit");
      }
      // 401/403 means the server-side key is bad — that's a misconfiguration,
      // not a client permission problem, so report it as "internal".
      if (status === 401 || status === 403) {
        throw new HttpsError("internal", "AI provider misconfigured");
      }
      if (status >= 500) {
        throw new HttpsError("unavailable", "AI provider unavailable");
      }
      throw new HttpsError("internal", "AI provider error");
    }

    const data = (await res.json()) as OpenAiChatResponse;
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.length === 0) {
      throw new HttpsError("internal", "AI provider returned no content");
    }
    return text;
  }

  async function explainChineseText(text: string): Promise<string> {
    return chat(
      [
        { role: "system", content: CHINESE_TUTOR_PROMPT },
        { role: "user", content: text },
      ],
      { temperature: 0.2, maxTokens: 1024 },
    );
  }

  return {
    name: "groq",
    chat,
    explainChineseText,
  };
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    // Groq error bodies look like `{ "error": { "message": "..." } }`.
    try {
      const parsed = JSON.parse(txt) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch {
      /* not JSON */
    }
    return txt.slice(0, 200);
  } catch {
    return "";
  }
}
