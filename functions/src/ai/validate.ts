import { HttpsError } from "firebase-functions/v2/https";

/** Allowed HSK level range used in prompts and cache keys. */
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 7;

/**
 * Rule-based analyses come from the client and get JSON-stringified into the
 * AI prompt. Cap the serialized size so a malicious client can't inflate
 * every AI call into a multi-megabyte prompt.
 */
export const MAX_RULEBASED_JSON_BYTES = 8 * 1024;

export function validateLevel(level: unknown): number {
  if (typeof level !== "number" || !Number.isFinite(level)) {
    throw new HttpsError("invalid-argument", "level must be a number");
  }
  const rounded = Math.round(level);
  if (rounded < MIN_LEVEL || rounded > MAX_LEVEL) {
    throw new HttpsError(
      "invalid-argument",
      `level must be between ${MIN_LEVEL} and ${MAX_LEVEL}`,
    );
  }
  return rounded;
}

/** Throws if `ruleBased` would serialize to more than MAX_RULEBASED_JSON_BYTES. */
export function validateRuleBased(ruleBased: unknown): void {
  let json: string;
  try {
    json = JSON.stringify(ruleBased ?? {});
  } catch {
    throw new HttpsError("invalid-argument", "ruleBased is not serializable");
  }
  if (json.length > MAX_RULEBASED_JSON_BYTES) {
    throw new HttpsError(
      "invalid-argument",
      `ruleBased too large (max ${MAX_RULEBASED_JSON_BYTES} bytes serialized)`,
    );
  }
}
