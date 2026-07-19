import type {
  CalibrationQuestion,
  CalibrationSelfAssessment,
  CalibrationWordResult,
} from "@/types/calibration";

/**
 * Deterministic scoring of a single calibration answer.
 *
 * "Known" requires both a know/unsure self-assessment AND the correct
 * multiple-choice meaning — the self-assessment alone never marks a word
 * known. Malformed input (bad index, missing selection when one is required)
 * scores as "missed": the safe direction is into active learning, never into
 * the baseline.
 */
export function scoreAnswer(
  question: CalibrationQuestion,
  selfAssessment: CalibrationSelfAssessment,
  selectedOption: number | null,
  now: Date,
): CalibrationWordResult {
  const answeredAt = now.toISOString();
  const base = { answeredAt, level: question.level } as const;

  if (selfAssessment === "dontKnow") {
    return { ...base, outcome: "dontKnow", confidence: "low" };
  }

  const valid =
    typeof selectedOption === "number" &&
    Number.isInteger(selectedOption) &&
    selectedOption >= 0 &&
    selectedOption < question.options.length;

  if (!valid || selectedOption !== question.answer) {
    return { ...base, outcome: "missed", confidence: "low" };
  }

  return {
    ...base,
    outcome: "known",
    confidence: selfAssessment === "know" ? "high" : "low",
  };
}
