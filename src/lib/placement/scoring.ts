import {
  vocabQuestions,
  grammarQuestions,
  readingSections,
  DONT_KNOW,
} from "@/data/placementQuestions";
import type { PlacementAnswers } from "@/types/placement";
import type { LearnerProfile } from "@/types/learner";

/**
 * Turn raw placement answers into a LearnerProfile.
 *
 * Three answer states per question, not two:
 *   - correct      → strong "knows" signal
 *   - wrong guess  → weak "doesn't know" signal (may also be a slip)
 *   - DONT_KNOW    → high-confidence "doesn't know" signal
 *
 * Per HSK band we compute three rates and require all of them to hold before
 * declaring a band "mastered":
 *   - knownRate     = correct / total            (≥ 0.65)
 *   - attemptAcc    = correct / (correct+wrong)  (≥ 0.70)  — filters lucky guesses
 *   - dontKnowRate  = dontKnow / total           (≤ 0.25)  — they actually know it
 *
 * Vocabulary level = highest band that is mastered AND every band below it is
 * mastered (no skipping). Target band climbs one further if the next band is
 * at least "familiar" (knownRate ≥ 0.4 with low don't-know).
 */
export const scorePlacement = (answers: PlacementAnswers): LearnerProfile => {
  const MASTER_KNOWN = 0.65;
  const MASTER_ATTEMPT_ACC = 0.7;
  const MASTER_DONTKNOW_CAP = 0.25;
  const FAMILIAR_KNOWN = 0.4;
  const FAMILIAR_DONTKNOW_CAP = 0.5;

  type BandStats = {
    correct: number;
    wrong: number;
    dontKnow: number;
    total: number;
  };

  const tally = <Q extends { hsk?: number; answer: number }>(
    items: Q[],
    picks: (number | null)[],
    defaultHsk: number,
  ): Record<number, BandStats> => {
    const out: Record<number, BandStats> = {};
    items.forEach((q, i) => {
      const lvl = q.hsk ?? defaultHsk;
      const b = (out[lvl] ||= { correct: 0, wrong: 0, dontKnow: 0, total: 0 });
      b.total += 1;
      const pick = picks[i];
      if (pick === null || pick === undefined) {
        // Unanswered — treat the same as DONT_KNOW so abandoning the test
        // can't accidentally inflate the learner's level.
        b.dontKnow += 1;
      } else if (pick === DONT_KNOW) {
        b.dontKnow += 1;
      } else if (pick === q.answer) {
        b.correct += 1;
      } else {
        b.wrong += 1;
      }
    });
    return out;
  };

  const ratesOf = (b: BandStats | undefined) => {
    if (!b || b.total === 0) return null;
    const attempted = b.correct + b.wrong;
    return {
      knownRate: b.correct / b.total,
      attemptAcc: attempted > 0 ? b.correct / attempted : 0,
      dontKnowRate: b.dontKnow / b.total,
      attempted,
    };
  };

  const isMastered = (b: BandStats | undefined): boolean => {
    const r = ratesOf(b);
    if (!r) return false;
    if (r.attempted === 0) return false;
    return (
      r.knownRate >= MASTER_KNOWN &&
      r.attemptAcc >= MASTER_ATTEMPT_ACC &&
      r.dontKnowRate <= MASTER_DONTKNOW_CAP
    );
  };

  const isFamiliar = (b: BandStats | undefined): boolean => {
    const r = ratesOf(b);
    if (!r) return false;
    return r.knownRate >= FAMILIAR_KNOWN && r.dontKnowRate <= FAMILIAR_DONTKNOW_CAP;
  };

  // ── Vocabulary ──────────────────────────────────────────────────────────
  const vocabByLevel = tally(vocabQuestions, answers.vocab, 1);

  let vocabularyLevel = 1;
  for (const lvl of [1, 2, 3, 4, 5, 6]) {
    if (isMastered(vocabByLevel[lvl])) vocabularyLevel = lvl;
    else break;
  }

  // ── Grammar ────────────────────────────────────────────────────────────
  // Same band-by-band shape as vocab, but grammar items only span HSK 2–6.
  // The reported grammarLevel is a decimal: ceiling band + partial credit for
  // the highest non-mastered band the learner is still familiar with.
  const grammarByLevel = tally(grammarQuestions, answers.grammar, 3);

  let grammarCeiling = 1;
  for (const lvl of [2, 3, 4, 5, 6]) {
    if (isMastered(grammarByLevel[lvl])) grammarCeiling = lvl;
    else break;
  }
  let grammarLevel = grammarCeiling;
  const nextGrammarBand = grammarCeiling + 1;
  if (nextGrammarBand <= 6) {
    const r = ratesOf(grammarByLevel[nextGrammarBand]);
    if (r && r.knownRate >= FAMILIAR_KNOWN) {
      grammarLevel = grammarCeiling + Math.min(0.9, r.knownRate);
    }
  }
  grammarLevel = Number(grammarLevel.toFixed(1));

  // ── Reading ────────────────────────────────────────────────────────────
  let readingLevel = Math.max(1, vocabularyLevel - 1);
  let cursor = 0;
  for (const section of readingSections) {
    const totalQ = section.questions.length;
    let correct = 0;
    let dontKnow = 0;
    for (let i = 0; i < totalQ; i++) {
      const pick = answers.reading[cursor + i];
      if (pick === null || pick === undefined || pick === DONT_KNOW) dontKnow += 1;
      else if (pick === section.questions[i].answer) correct += 1;
    }
    cursor += totalQ;
    const target = section.targetHsk ?? 3;
    const cleanPass = correct === totalQ;
    const nearPass = correct >= totalQ - 1 && dontKnow <= 1;
    if (cleanPass) readingLevel = Math.max(readingLevel, target);
    else if (nearPass) readingLevel = Math.max(readingLevel, Math.max(1, target - 1));
  }

  // ── Weak grammar points ────────────────────────────────────────────────
  // Prefer surfacing items the learner explicitly said they don't know — those
  // are the cleanest learning targets — then fall back to wrong guesses.
  const dontKnowGrammar = grammarQuestions
    .map((q, i) => ({ q, pick: answers.grammar[i] }))
    .filter((x) => x.pick === DONT_KNOW || x.pick === null || x.pick === undefined)
    .map((x) => x.q.tag);
  const wrongGrammar = grammarQuestions
    .map((q, i) => ({ q, pick: answers.grammar[i] }))
    .filter(
      (x) =>
        x.pick !== DONT_KNOW &&
        x.pick !== null &&
        x.pick !== undefined &&
        x.pick !== x.q.answer,
    )
    .map((x) => x.q.tag);
  const weakGrammarPoints = [...new Set([...dontKnowGrammar, ...wrongGrammar])].slice(0, 5);

  // ── Per-band accuracy for the result chart ────────────────────────────
  const accuracyByLevel = [1, 2, 3, 4, 5, 6].map((lvl) => {
    const b = vocabByLevel[lvl];
    const pct = b ? Math.round((b.correct / b.total) * 100) : 0;
    return { level: lvl, pct };
  });

  // ── Target band ────────────────────────────────────────────────────────
  // Climb one band above mastered if it's at least familiar; climb two if
  // mastered band is solid (≥ 90% known) AND next band is genuinely familiar.
  let targetLevel = Math.min(6, vocabularyLevel + 1);
  const curRates = ratesOf(vocabByLevel[vocabularyLevel]);
  const nextBand = vocabularyLevel + 1;
  const overNextBand = vocabularyLevel + 2;
  if (
    curRates &&
    curRates.knownRate >= 0.9 &&
    nextBand <= 6 &&
    isFamiliar(vocabByLevel[nextBand]) &&
    overNextBand <= 6 &&
    isFamiliar(vocabByLevel[overNextBand])
  ) {
    targetLevel = Math.min(6, overNextBand);
  } else if (nextBand > 6) {
    targetLevel = 6;
  } else if (!isFamiliar(vocabByLevel[nextBand])) {
    targetLevel = vocabularyLevel;
  }

  return {
    vocabularyLevel,
    grammarLevel,
    readingLevel,
    confidence: {
      listening: answers.self[0] ?? 3,
      speaking: answers.self[1] ?? 3,
      reading: answers.self[2] ?? 3,
      writing: answers.self[3] ?? 3,
    },
    weakGrammarPoints,
    targetLevel,
    accuracyByLevel,
    updatedAt: new Date().toISOString(),
  };
};
