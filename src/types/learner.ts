export interface LearnerConfidence {
  listening: number;
  speaking: number;
  reading: number;
  writing: number;
}

export interface LevelAccuracy {
  level: number;
  pct: number;
}

export interface LearnerProfile {
  vocabularyLevel: number;
  grammarLevel: number;
  readingLevel: number;
  confidence: LearnerConfidence;
  weakGrammarPoints: string[];
  targetLevel: number;
  accuracyByLevel?: LevelAccuracy[];
  updatedAt: string;
}
