export interface VocabQuestion {
  hsk: number;          // 1-6
  prompt: string;       // Chinese word
  options: string[];    // English meanings
  answer: number;
}

export interface GrammarQuestion {
  tag: string;
  hsk?: number;         // 2-6, used by adaptive scoring
  prompt: string;
  options: string[];
  answer: number;
}

export interface ReadingQuestion {
  prompt: string;
  options: string[];
  answer: number;
}

export interface ReadingSection {
  targetHsk?: number;
  passage: string;
  questions: ReadingQuestion[];
}

export interface PlacementAnswers {
  vocab: (number | null)[];
  grammar: (number | null)[];
  reading: (number | null)[];
  self: number[]; // listening, speaking, reading, writing (1-5)
}
