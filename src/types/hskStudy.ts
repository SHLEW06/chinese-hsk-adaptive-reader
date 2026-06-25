/**
 * Per-word spaced-repetition state for the HSK study mode.
 * Stored client-side keyed by the simplified form.
 */
export interface SrsState {
  /** Current interval in days. 0 means "not yet graduated from learning". */
  interval: number;
  /** SM-2-style ease factor. Starts at 2.5, floored at 1.3. */
  ease: number;
  /** Total successful reviews. */
  reps: number;
  /** Number of times the card lapsed (graded Again after graduating). */
  lapses: number;
  /** ISO datetime when this card is next due for review. */
  dueAt: string;
  /** ISO datetime of last review, if any. */
  lastReviewed?: string;
}

export type SrsGrade = "again" | "hard" | "good" | "easy";

export type DeckKey =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7-9"
  | "common"
  | "saved"
  | "mixed";
