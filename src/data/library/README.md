# Expanded Chinese Adaptive Reader library files

Replacement files for your current HSK JSON library.

What changed:
- Preserved the existing uploaded readings' `id` and `slug` values where possible.
- Expanded every HSK level to exactly 50 readings.
- Expanded each reading into a substantial text.
- Added `translation`, `translationEn`, `paragraphTranslations`, `sentenceExplanations`,
  static grammar, phrase breakdowns, `targetWords`, `coveredHskWords`, `newHskWords`,
  and comprehension questions.

Corpus summary:

```json
[
  {
    "hskLevel": 1,
    "readings": 50,
    "minChars": 520,
    "maxChars": 529,
    "avgChars": 523.7,
    "sentenceExplanations": 3272
  },
  {
    "hskLevel": 2,
    "readings": 50,
    "minChars": 650,
    "maxChars": 667,
    "avgChars": 654.5,
    "sentenceExplanations": 2603
  },
  {
    "hskLevel": 3,
    "readings": 50,
    "minChars": 850,
    "maxChars": 871,
    "avgChars": 858.5,
    "sentenceExplanations": 2660
  },
  {
    "hskLevel": 4,
    "readings": 50,
    "minChars": 1050,
    "maxChars": 1080,
    "avgChars": 1061.7,
    "sentenceExplanations": 2631
  },
  {
    "hskLevel": 5,
    "readings": 50,
    "minChars": 1300,
    "maxChars": 1327,
    "avgChars": 1309.1,
    "sentenceExplanations": 3095
  },
  {
    "hskLevel": 6,
    "readings": 50,
    "minChars": 1600,
    "maxChars": 1625,
    "avgChars": 1610.2,
    "sentenceExplanations": 3688
  }
]
```

QA note:
This is a substantial first-pass static corpus. It is mostly original/reflective to reduce
factual-risk. It should be run through your real `npm run hsk:coverage` dictionary pipeline
before production so any above-level words can be patched precisely.
