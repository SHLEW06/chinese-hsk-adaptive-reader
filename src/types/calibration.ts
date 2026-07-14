/**
 * Vocabulary-calibration domain types.
 *
 * Why calibration-derived knowledge is separate from genuine review mastery:
 * a single calibration answer is a one-shot recognition event, not evidence of
 * durable recall. Treating it as SRS mastery would fabricate review history
 * (reps, ease, intervals) the learner never earned, and would permanently hide
 * words that were guessed or half-known. Calibration therefore produces a
 * *baseline* — words excluded from the ordinary new-card queue with a delayed
 * verification date — and only genuine reviews (including the verification
 * check-in itself) create real SRS state. Genuine SRS state always takes
 * precedence over any calibration result.
 */

/** Levels that comprehensive calibration can cover. HSK 7–9 and the common
 * (non-HSK) band are intentionally out of scope: their word lists are large
 * enough to threaten persistence limits and are not frequency-banded the same
 * way. */
export type CalibrationLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** The learner's self-assessment before seeing any answer options. */
export type CalibrationSelfAssessment = "know" | "unsure" | "dontKnow";

/**
 * Final per-word calibration outcome.
 *  - "known":    claimed know/unsure AND picked the correct meaning.
 *  - "missed":   claimed know/unsure but picked a wrong meaning.
 *  - "dontKnow": self-reported not knowing (no meaning question shown).
 */
export type CalibrationOutcome = "known" | "missed" | "dontKnow";

export type CalibrationConfidence = "high" | "low";

export interface CalibrationWordResult {
  outcome: CalibrationOutcome;
  /** Only meaningful for "known": high = self-assessed "know", low = "unsure". */
  confidence: CalibrationConfidence;
  /** ISO datetime the answer was committed. */
  answeredAt: string;
  /** HSK level the word was tested under. */
  level: CalibrationLevel;
}

/**
 * Baseline entry for a calibration-known word: excluded from the ordinary
 * new-card queue until `verifyAt`, when it returns as a verification check-in.
 */
export interface CalibrationKnownEntry {
  /** ISO datetime when the word becomes due for genuine retrieval verification. */
  verifyAt: string;
  confidence: CalibrationConfidence;
  source: "comprehensive" | "quickSetup";
  level: CalibrationLevel;
}

export type CalibrationStatus = "notStarted" | "inProgress" | "completed";

export type CalibrationMethod =
  | "comprehensive"
  | "quickSetup"
  | "startFromScratch";

/**
 * Word-ID plan for a comprehensive calibration, snapshotted when the exam
 * starts so blocks stay stable across sessions even if dictionary data is
 * rebuilt. IDs are simplified forms — the same stable key the SRS map uses.
 */
export interface CalibrationPlan {
  levels: CalibrationLevel[];
  /** Frequency-ordered word IDs per level, fixed at start. */
  wordsByLevel: Partial<Record<CalibrationLevel, string[]>>;
  blockSize: number;
}

export interface CalibrationState {
  schemaVersion: 1;
  status: CalibrationStatus;
  method?: CalibrationMethod;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
  /** Seed for deterministic question/distractor generation. */
  seed?: number;
  plan?: CalibrationPlan;
  /** Per-word results keyed by simplified form. */
  results: Record<string, CalibrationWordResult>;
  /**
   * The applied baseline: calibration-known words currently excluded from the
   * ordinary new queue. Populated only when the learner confirms application.
   * Words leave this map permanently once verified (pass or fail) or manually
   * returned to study.
   */
  baseline: Record<string, CalibrationKnownEntry>;
  /** ISO datetime the current baseline was applied, if any. */
  baselineAppliedAt?: string;
  /** For quick setup: the level the learner selected as their starting point. */
  quickSetupLevel?: CalibrationLevel;
  /** Count of calibration-known words that later passed verification. */
  verifiedCount?: number;
  /** Count of calibration-known words that later failed verification. */
  failedVerificationCount?: number;
}

/**
 * Study status of a single word once SRS state and calibration are combined.
 * Precedence (highest first): genuine SRS state, missed/unsure calibration
 * result, calibration-known baseline, untested.
 */
export type WordStudyStatus =
  | "masteredThroughSrs"
  | "review"
  | "learning"
  | "calibratedKnown"
  | "untested";

/** One deterministic multiple-choice calibration question. */
export interface CalibrationQuestion {
  /** Simplified form shown as the prompt. Nothing else is revealed. */
  word: string;
  level: CalibrationLevel;
  /** English meaning options (one per candidate word). */
  options: string[];
  /** Index into `options` of the correct meaning. */
  answer: number;
}
