import type {
  CalibrationKnownEntry,
  CalibrationLevel,
  CalibrationPlan,
  CalibrationState,
  CalibrationWordResult,
  WordStudyStatus,
} from "@/types/calibration";
import type { SrsGrade, SrsState } from "@/types/hskStudy";
import { gradeSrs } from "@/lib/hsk-study/scheduler";
import { isLearned } from "@/lib/hsk-study/storage";
import {
  CALIBRATION_CONFIG,
  quickSetupVerifyDate,
  verifyDateFor,
} from "./config";

/**
 * Pure calibration state machine. Every transition takes state in and returns
 * new state out — persistence lives elsewhere. Two invariants hold across all
 * transitions:
 *
 *  1. Nothing here ever reads or writes genuine SRS state; callers pass the
 *     SRS map in so calibration can *defer* to it, never modify it.
 *  2. A word with any existing SRS state is never added to the baseline —
 *     genuine review history always outranks calibration results.
 */

export function emptyCalibrationState(): CalibrationState {
  return {
    schemaVersion: 1,
    status: "notStarted",
    results: {},
    baseline: {},
  };
}

/**
 * Backward-compatible loader: older learner records have no calibration
 * fields at all, and partially-written or foreign data must never crash the
 * app. Anything unrecognizable degrades to the empty (not-started) state.
 */
export function normalizeCalibrationState(raw: unknown): CalibrationState {
  if (!raw || typeof raw !== "object") return emptyCalibrationState();
  const r = raw as Partial<CalibrationState>;
  if (r.schemaVersion !== 1) return emptyCalibrationState();
  const status =
    r.status === "inProgress" || r.status === "completed"
      ? r.status
      : "notStarted";
  return {
    ...emptyCalibrationState(),
    ...r,
    schemaVersion: 1,
    status,
    results: isRecord(r.results) ? (r.results as CalibrationState["results"]) : {},
    baseline: isRecord(r.baseline) ? (r.baseline as CalibrationState["baseline"]) : {},
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Comprehensive calibration
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Start (or restart) a comprehensive calibration. The word plan is
 * snapshotted now so blocks stay stable across pause/resume even if the
 * dictionary data changes underneath. An existing applied baseline stays
 * active until the new run is explicitly confirmed.
 */
export function startComprehensive(
  prev: CalibrationState,
  opts: {
    levels: CalibrationLevel[];
    wordsByLevel: Partial<Record<CalibrationLevel, string[]>>;
    seed: number;
    now: Date;
    blockSize?: number;
  },
): CalibrationState {
  const plan: CalibrationPlan = {
    levels: [...opts.levels].sort((a, b) => a - b),
    wordsByLevel: opts.wordsByLevel,
    blockSize: opts.blockSize ?? CALIBRATION_CONFIG.blockSize,
  };
  return {
    ...prev,
    status: "inProgress",
    method: "comprehensive",
    startedAt: opts.now.toISOString(),
    updatedAt: opts.now.toISOString(),
    completedAt: undefined,
    seed: opts.seed,
    plan,
    results: {},
    quickSetupLevel: undefined,
  };
}

/**
 * Record one answer. Duplicate answers for the same word overwrite the prior
 * result (last commit wins) so replaying a block can never double-count.
 */
export function recordAnswer(
  state: CalibrationState,
  word: string,
  result: CalibrationWordResult,
  now: Date,
): CalibrationState {
  if (state.status !== "inProgress") return state;
  return {
    ...state,
    results: { ...state.results, [word]: result },
    updatedAt: now.toISOString(),
  };
}

export interface CalibrationProgress {
  totalWords: number;
  answered: number;
  known: number;
  missed: number;
  dontKnow: number;
  perLevel: Array<{
    level: CalibrationLevel;
    total: number;
    answered: number;
    known: number;
  }>;
  /** The next unanswered word in plan order, or null when the plan is done. */
  next: { level: CalibrationLevel; word: string; indexInLevel: number } | null;
  blockSize: number;
  /** Progress within the block containing `next` (null when plan is done). */
  currentBlock: {
    level: CalibrationLevel;
    blockIndex: number;
    blocksInLevel: number;
    answeredInBlock: number;
    blockLength: number;
  } | null;
}

export function calibrationProgress(state: CalibrationState): CalibrationProgress {
  const plan = state.plan;
  const empty: CalibrationProgress = {
    totalWords: 0,
    answered: 0,
    known: 0,
    missed: 0,
    dontKnow: 0,
    perLevel: [],
    next: null,
    blockSize: plan?.blockSize ?? CALIBRATION_CONFIG.blockSize,
    currentBlock: null,
  };
  if (!plan) return empty;

  const out = { ...empty, perLevel: [] as CalibrationProgress["perLevel"] };
  for (const level of plan.levels) {
    const words = plan.wordsByLevel[level] ?? [];
    let answered = 0;
    let known = 0;
    for (const word of words) {
      const r = state.results[word];
      if (!r) continue;
      answered += 1;
      if (r.outcome === "known") known += 1;
      else if (r.outcome === "missed") out.missed += 1;
      else out.dontKnow += 1;
    }
    out.totalWords += words.length;
    out.answered += answered;
    out.known += known;
    out.perLevel.push({ level, total: words.length, answered, known });

    if (out.next === null) {
      const idx = words.findIndex((w) => !state.results[w]);
      if (idx >= 0) {
        out.next = { level, word: words[idx], indexInLevel: idx };
        const blockIndex = Math.floor(idx / plan.blockSize);
        const blockStart = blockIndex * plan.blockSize;
        const blockWords = words.slice(blockStart, blockStart + plan.blockSize);
        out.currentBlock = {
          level,
          blockIndex,
          blocksInLevel: Math.ceil(words.length / plan.blockSize),
          answeredInBlock: blockWords.filter((w) => !!state.results[w]).length,
          blockLength: blockWords.length,
        };
      }
    }
  }
  return out;
}

/**
 * Confirm and apply the calibration baseline. Called only after the learner
 * explicitly confirms (the UI must never call this automatically for an
 * incomplete run). Every "known" result becomes a baseline entry with a
 * delayed verification date — except words that already have genuine SRS
 * state, which are skipped entirely: reviews outrank calibration.
 *
 * Applying finalizes the run (status "completed") and *replaces* any prior
 * baseline, so a recalibration cleanly supersedes the old estimate.
 */
export function applyBaseline(
  state: CalibrationState,
  srsMap: Record<string, SrsState>,
  now: Date,
): CalibrationState {
  const baseline: Record<string, CalibrationKnownEntry> = {};
  const priorityResults: Record<string, CalibrationWordResult> = {};
  for (const [word, result] of Object.entries(state.results)) {
    if (result.outcome !== "known") {
      priorityResults[word] = result;
      continue;
    }
    if (srsMap[word]) continue;
    baseline[word] = {
      verifyAt: verifyDateFor(result.confidence, now),
      confidence: result.confidence,
      source: "comprehensive",
      level: result.level,
    };
  }
  return {
    ...state,
    status: "completed",
    completedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    // The completed baseline already carries every known-word field needed by
    // deck selection and verification. Keeping the same words in `results`
    // and retaining the finished plan can push a full HSK 1-6 document over
    // Firestore's 1 MiB limit, so keep only missed/don't-know priority results.
    plan: undefined,
    seed: undefined,
    results: priorityResults,
    baseline,
    baselineAppliedAt: now.toISOString(),
    verifiedCount: 0,
    failedVerificationCount: 0,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Quick setup & start from scratch
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Quick setup: the learner picks a starting level. Only levels strictly
 * below it are baseline-excluded — the boundary level itself stays in the
 * ordinary queue, because "I'm around HSK 4" says little about how much of
 * HSK 4 is actually known. Verification is staggered so assumed-known words
 * trickle back for check-ins. Words with genuine SRS state are skipped.
 */
export function applyQuickSetup(
  prev: CalibrationState,
  opts: {
    level: CalibrationLevel;
    wordsByLevel: Partial<Record<CalibrationLevel, string[]>>;
    srsMap: Record<string, SrsState>;
    now: Date;
  },
): CalibrationState {
  const baseline: Record<string, CalibrationKnownEntry> = {};
  let i = 0;
  for (const level of [1, 2, 3, 4, 5, 6] as CalibrationLevel[]) {
    if (level >= opts.level) break;
    for (const word of opts.wordsByLevel[level] ?? []) {
      if (opts.srsMap[word]) continue;
      baseline[word] = {
        verifyAt: quickSetupVerifyDate(i, opts.now),
        confidence: "low",
        source: "quickSetup",
        level,
      };
      i += 1;
    }
  }
  const nowIso = opts.now.toISOString();
  return {
    ...prev,
    status: "completed",
    method: "quickSetup",
    startedAt: nowIso,
    updatedAt: nowIso,
    completedAt: nowIso,
    plan: undefined,
    seed: undefined,
    results: {},
    baseline,
    baselineAppliedAt: nowIso,
    quickSetupLevel: opts.level,
    verifiedCount: 0,
    failedVerificationCount: 0,
  };
}

/**
 * The learner deliberately declined calibration. Existing behavior is
 * preserved (every word stays new/untested); we only record the choice so
 * the setup prompt stops appearing. Calibration remains available later.
 */
export function applyStartFromScratch(
  prev: CalibrationState,
  now: Date,
): CalibrationState {
  const nowIso = now.toISOString();
  return {
    ...prev,
    status: "completed",
    method: "startFromScratch",
    startedAt: nowIso,
    updatedAt: nowIso,
    completedAt: nowIso,
    plan: undefined,
    seed: undefined,
    results: {},
    baseline: {},
    baselineAppliedAt: undefined,
    quickSetupLevel: undefined,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reset, recalibration hygiene, manual overrides
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Reset only calibration-derived state. By construction this cannot touch
 * genuine SRS history, saved words, or reading data — none of it lives in
 * CalibrationState.
 */
export function resetCalibration(now: Date): CalibrationState {
  return { ...emptyCalibrationState(), updatedAt: now.toISOString() };
}

/** Manually return one assumed-known word to active study. */
export function returnWordToStudy(
  state: CalibrationState,
  word: string,
  now: Date,
): CalibrationState {
  if (!state.baseline[word]) return state;
  const baseline = { ...state.baseline };
  delete baseline[word];
  return { ...state, baseline, updatedAt: now.toISOString() };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Delayed verification
 * ──────────────────────────────────────────────────────────────────────────── */

export interface VerificationGradeResult {
  srs: SrsState;
  passed: boolean;
}

/**
 * Grade a verification check-in. The outcome creates genuine SRS state from
 * this moment forward:
 *  - Good/Easy: a real retrieval success — seed a maturing-card interval
 *    (centralized in config) with reps: 1. This is a recorded real review,
 *    not fabricated history.
 *  - Again/Hard: failed verification — the word takes the ordinary new-card
 *    grading path and enters active learning.
 */
export function gradeVerification(
  grade: SrsGrade,
  now: Date,
): VerificationGradeResult {
  if (grade === "good" || grade === "easy") {
    const interval =
      grade === "easy"
        ? CALIBRATION_CONFIG.verifiedEasyIntervalDays
        : CALIBRATION_CONFIG.verifiedPassIntervalDays;
    return {
      passed: true,
      srs: {
        interval,
        ease: 2.5,
        reps: 1,
        lapses: 0,
        dueAt: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString(),
        lastReviewed: now.toISOString(),
      },
    };
  }
  return { passed: false, srs: gradeSrs(undefined, grade, now) };
}

/**
 * Fold verification outcomes back into calibration state. Verified or failed
 * words leave the baseline permanently — from here on their genuine SRS state
 * (created by the verification itself) is authoritative, so a failed word can
 * never be hidden by the old calibration result again.
 */
export function applyVerificationOutcomes(
  state: CalibrationState,
  outcomes: Record<string, boolean>,
  now: Date,
): CalibrationState {
  const words = Object.keys(outcomes).filter((w) => !!state.baseline[w]);
  if (words.length === 0) return state;
  const baseline = { ...state.baseline };
  let verified = state.verifiedCount ?? 0;
  let failed = state.failedVerificationCount ?? 0;
  for (const word of words) {
    delete baseline[word];
    if (outcomes[word]) verified += 1;
    else failed += 1;
  }
  return {
    ...state,
    baseline,
    verifiedCount: verified,
    failedVerificationCount: failed,
    updatedAt: now.toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Word status resolution
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Combined study status for one word. Precedence, highest first:
 *  1. genuine SRS state (mastered / review / learning),
 *  2. explicit missed or don't-know calibration result (learning candidate),
 *  3. calibration-known baseline,
 *  4. untested.
 */
export function resolveWordStatus(
  srs: SrsState | undefined,
  calibration: CalibrationState,
  word: string,
): WordStudyStatus {
  if (srs) {
    if (isLearned(srs)) return "masteredThroughSrs";
    return srs.reps >= 1 && srs.interval >= 1 ? "review" : "learning";
  }
  const result = calibration.results[word];
  if (result && result.outcome !== "known") return "learning";
  if (calibration.baseline[word]) return "calibratedKnown";
  return "untested";
}
