/**
 * HSK 1–6 mock exam types. Each level has a balanced multi-section exam
 * that estimates whether you'd pass that band on the official test.
 */

export type MockExamSection =
  | "vocabulary"
  | "grammar"
  | "reading"
  | "cloze";

export interface MockExamQuestion {
  prompt: string;          // can include Chinese; rendered as cjk-serif
  passage?: string;        // optional context for reading/cloze questions
  options: string[];
  answer: number;          // index into options
  explanation?: string;    // shown after submission
  hint?: string;
}

export interface MockExamPart {
  section: MockExamSection;
  title: string;
  description: string;
  questions: MockExamQuestion[];
}

export interface MockExam {
  level: number;           // 1-6
  durationMinutes: number; // suggested attempt time
  passingPct: number;      // % to "pass" this level
  intro: string;           // a one-paragraph framing
  parts: MockExamPart[];
}

export interface MockExamResult {
  level: number;
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  byPart: Array<{
    section: MockExamSection;
    title: string;
    correct: number;
    total: number;
    pct: number;
  }>;
  finishedAt: string;
}
