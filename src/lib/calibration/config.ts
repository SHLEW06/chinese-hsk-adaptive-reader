/**
 * Centralized calibration policy. These are pragmatic implementation defaults,
 * not formal learning-science guarantees — tune them here, not at call sites.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const CALIBRATION_CONFIG = {
  /** Words per calibration block. Chosen so a block is one comfortable
   * sitting (~5 minutes) while keeping per-level block counts manageable
   * (HSK levels run ~500–1,150 words). */
  blockSize: 50,

  /** Options per multiple-choice meaning question. */
  optionCount: 4,

  /** Days until verification for a correct, high-confidence ("know") answer. */
  verifyDaysHighConfidence: 21,

  /** Days until verification for a correct but low-confidence ("unsure"...
   * still counts as known only when the meaning was picked correctly). */
  verifyDaysLowConfidence: 7,

  /** Quick setup staggers verification across these offsets (days) so
   * assumed-known words trickle back for check-ins instead of flooding one
   * day. Deterministic by word index. */
  quickSetupVerifyDays: [7, 14, 21, 28, 35],

  /** Interval (days) seeded when a verification check-in is passed with
   * "good". A real retrieval success just happened, so the next genuine
   * review lands where a maturing card would. */
  verifiedPassIntervalDays: 21,

  /** Interval (days) when a check-in is passed with "easy". */
  verifiedEasyIntervalDays: 35,
} as const;

export function verifyDateFor(
  confidence: "high" | "low",
  now: Date,
): string {
  const days =
    confidence === "high"
      ? CALIBRATION_CONFIG.verifyDaysHighConfidence
      : CALIBRATION_CONFIG.verifyDaysLowConfidence;
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

/** Staggered quick-setup verification date for the i-th excluded word. */
export function quickSetupVerifyDate(index: number, now: Date): string {
  const offsets = CALIBRATION_CONFIG.quickSetupVerifyDays;
  const days = offsets[index % offsets.length];
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}
