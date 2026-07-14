import type { CalibrationState } from "@/types/calibration";
import type { SrsState } from "@/types/hskStudy";
import { isLearned } from "@/lib/hsk-study/storage";
import type { SessionState } from "@/lib/hsk-study/scheduler";

/**
 * Deck/queue integration for calibration. Pure helpers — callers pass the
 * SRS map and calibration state in, so behavior is deterministic and
 * testable with fixed clocks.
 */

/** Baseline-known and not yet due for verification: hidden from new queue. */
export function isBaselineExcluded(
  state: CalibrationState,
  word: string,
  srs: SrsState | undefined,
  now: Date,
): boolean {
  if (srs) return false; // genuine history always wins
  const entry = state.baseline[word];
  if (!entry) return false;
  return new Date(entry.verifyAt).getTime() > now.getTime();
}

/** Baseline-known and due for a verification check-in. */
export function isVerificationDue(
  state: CalibrationState,
  word: string,
  srs: SrsState | undefined,
  now: Date,
): boolean {
  if (srs) return false;
  const entry = state.baseline[word];
  if (!entry) return false;
  return new Date(entry.verifyAt).getTime() <= now.getTime();
}

/** Missed or don't-know calibration result: should enter learning promptly. */
export function isPriorityNew(state: CalibrationState, word: string): boolean {
  const result = state.results[word];
  return !!result && result.outcome !== "known";
}

export interface CalibratedPool<T> {
  /** Filtered/reordered pool, safe to hand to the existing pickDeck. */
  pool: T[];
  /** Words in `pool` that are due verification check-ins (no SRS state). */
  verificationIds: Set<string>;
}

/**
 * Apply calibration to a study pool before deck selection:
 *  - words with genuine SRS state pass through untouched (due/learning
 *    behavior is unchanged);
 *  - baseline-known words not yet due for verification are removed from the
 *    new-card pool entirely;
 *  - the remaining new candidates are reordered: due verification check-ins
 *    first, then missed/unsure words, then untested words — each group keeps
 *    its original relative order, so the existing maxNew cap naturally
 *    admits check-ins and priority words before brand-new vocabulary.
 *
 * Each input word appears at most once in the output, so a word can never
 * enter a session through both the calibration and ordinary queues.
 */
export function applyCalibrationToPool<T>(
  pool: T[],
  getId: (item: T) => string,
  srsMap: Record<string, SrsState>,
  state: CalibrationState,
  now: Date = new Date(),
): CalibratedPool<T> {
  const withSrs: T[] = [];
  const verification: T[] = [];
  const priority: T[] = [];
  const plain: T[] = [];
  const verificationIds = new Set<string>();
  const seen = new Set<string>();

  for (const item of pool) {
    const id = getId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    const srs = srsMap[id];
    if (srs) {
      withSrs.push(item);
      continue;
    }
    if (isBaselineExcluded(state, id, srs, now)) continue;
    if (isVerificationDue(state, id, srs, now)) {
      verification.push(item);
      verificationIds.add(id);
      continue;
    }
    if (isPriorityNew(state, id)) {
      priority.push(item);
      continue;
    }
    plain.push(item);
  }

  return {
    pool: [...withSrs, ...verification, ...priority, ...plain],
    verificationIds,
  };
}

/**
 * Mark a verification card as passed within an in-progress study session:
 * it takes the genuine SRS state produced by gradeVerification and leaves
 * the session queue immediately (a passed check-in needs no session drilling).
 * Failed check-ins go through the ordinary applyGrade path instead.
 */
export function completeVerificationCard<T>(
  state: SessionState<T>,
  cardId: string,
  srs: SrsState,
): SessionState<T> {
  const cards = state.cards.map((c) => ({ ...c }));
  const card = cards.find((c) => c.id === cardId);
  if (!card) return state;
  card.srs = srs;
  card.sessionReps += 1;
  card.goodReps += 1;
  card.done = true;
  return { cards, tick: state.tick + 1 };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Metrics
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CalibrationMetrics {
  /** Words genuinely mastered through SRS reviews (weekly interval reached). */
  masteredThroughSrs: number;
  /** Baseline words estimated known from calibration, not yet verified. */
  estimatedKnown: number;
  /** SRS-tracked words still in the active learning/review rotation. */
  currentlyLearning: number;
  /** Baseline words whose verification check-in is due now. */
  verificationsDue: number;
}

/**
 * Separate, non-overlapping study metrics. Calibration-known words are never
 * counted as mastered: mastery only comes from genuine reviews.
 */
export function calibrationMetrics(
  srsMap: Record<string, SrsState>,
  state: CalibrationState,
  now: Date = new Date(),
): CalibrationMetrics {
  let mastered = 0;
  let learning = 0;
  for (const srs of Object.values(srsMap)) {
    if (isLearned(srs)) mastered += 1;
    else learning += 1;
  }
  let estimatedKnown = 0;
  let verificationsDue = 0;
  const nowMs = now.getTime();
  for (const [word, entry] of Object.entries(state.baseline)) {
    if (srsMap[word]) continue; // superseded by genuine history
    estimatedKnown += 1;
    if (new Date(entry.verifyAt).getTime() <= nowMs) verificationsDue += 1;
  }
  return {
    masteredThroughSrs: mastered,
    estimatedKnown,
    currentlyLearning: learning,
    verificationsDue,
  };
}
