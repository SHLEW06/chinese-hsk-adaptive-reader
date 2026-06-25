export interface GrammarPoint {
  pattern: string;
  explanation: string;
  example?: string;
}

export interface PhraseBreakdownItem {
  phrase: string;
  meaning: string;
  pinyin?: string;
  note?: string;
}

export interface SentenceExplanation {
  sentence: string;
  translation: string;
  phraseBreakdown: PhraseBreakdownItem[];
  grammarPoints: GrammarPoint[];
  casualNotes?: string[];
  naturalMeaning: string;
  isRough?: boolean; // true when produced by the offline rule-based engine
}
