# Library content guide

The library is a static, hand-authored graded-reading database. **No AI call is
made at runtime for library passages.** Every translation, breakdown, and
question is stored in the JSON files so the reader works offline and never
spends model budget.

## File layout

```
src/data/library/
  hsk1.json   ← arrays of LibraryItem, one file per HSK level
  hsk2.json
  hsk3.json
  hsk4.json
  hsk5.json
  hsk6.json
  index.ts    ← merges them
```

The schema is defined in `src/types/library.ts` (`LibraryItem`).

After editing any of the JSON files, run:

```bash
npm run hsk:coverage
```

That script:
1. Validates each item (required fields, unique id/slug, paragraph-translation
   alignment, news-explainer fact-check notes).
2. Writes `src/data/hskCoverageReport.json` — used by the Reading Path UI.
3. Prints a per-level coverage table.

The script exits non-zero on any validation failure, which blocks build.

## Required fields

| Field | Notes |
|---|---|
| `id` | Stable kebab-case identifier, e.g. `"h2-bus-to-work"`. Must be unique across the whole library. |
| `slug` | URL-safe handle. Must also be unique. |
| `titleZh` | Chinese title. |
| `titleEn` | English title (short). |
| `hskLevel` | Integer 1–6. (7–9 reserved in the type; not exposed in the UI today.) |
| `category` | One of the `ContentCategory` values in `src/types/content.ts`. |
| `sourceType` | `"original"` / `"news_explainer"` / `"adapted_public_domain"` / `"cultural_explainer"`. |
| `difficulty` | `"easy"` / `"standard"` / `"challenge"` — relative to the HSK level, not absolute. |
| `summaryEn` | One-sentence English summary used on the card. |
| `textZh` | The Chinese passage. Paragraphs separated by `\n\n`. |
| `translationEn` | Full English translation of the whole passage. |

## Optional but strongly recommended

- `paragraphTranslations: [{ zh, en }]` — paragraph-aligned bilingual pairs.
  When present, the explain panel shows the paragraph English instead of a
  word-by-word rule-based gloss. **The concatenation of all `zh` values must
  equal `textZh`** (whitespace-insensitive) or validation fails.
- `comprehensionQuestions: [{ questionZh, questionEn, answerEn }]` — 2–4 per
  passage is plenty.
- `targetWords` — the 5–15 words the passage is meant to surface. Coverage
  reporting uses these as the "this passage taught X" claim on the card.
- `grammarFocus` — one or two grammar patterns the passage exercises.
- `tags` — free-form filters.

## HSK coverage strategy

- Author primarily with words from the passage's HSK level **and below**.
- HSK 1 and 2 should be strict — keep above-level words to a handful (proper
  nouns excepted).
- HSK 3 can include a few above-level proper nouns or culturally specific
  terms (e.g. 京剧).
- HSK 4–6 may include specialized terminology, but should still feel graded —
  prefer clarity over cleverness.
- `aboveLevelWords` is filled in by the coverage script; you don't have to
  hand-author it.

The coverage script reports two numbers per level:

- **Exclusive coverage** — what fraction of words newly introduced at that
  HSK level have appeared at least once. This is the right number to push
  toward 100% before moving on.
- **Cumulative coverage** — words from HSK 1 through this level. Lower-level
  words almost always end up covered, so this number trails exclusive.

A useful workflow: run the script, take the printed "missing words" list,
write a passage that uses 10–20 of them naturally, repeat.

## Translation requirements

- Translations are **static and committed**. No runtime AI.
- `translationEn` should be a polished, idiomatic English version — not a
  literal gloss.
- `paragraphTranslations[i].en` should mirror that polish at paragraph
  granularity. If a Chinese paragraph is one sentence, the corresponding
  English may also be one sentence and the per-sentence "Translation" line
  in the reader will use it automatically.
- Every `sentenceExplanations[].phrases[]` entry must provide a tone-marked
  `pinyin` value as well as its English `en` gloss. The reader displays both
  directly beneath the Chinese phrase.
- For longer paragraphs, the per-sentence panel falls back to showing the
  full paragraph English — that's by design.

## Factual / news-style content rules

- Do not copy from copyrighted news. Write **original** explainers based on
  widely verifiable public facts.
- For any passage with `sourceType: "news_explainer"`:
  - `factCheckNotes` is **required** — short English notes describing what
    facts should be true and any dates the passage references.
  - Prefer evergreen facts. If a number could go stale (population, ranking),
    name the year inside the passage.
  - `sources` is optional but encouraged — labels only, URLs when legal.
- For `sourceType: "adapted_public_domain"`: adapt classic fables / Tang
  poems / historical anecdotes for graded language. The adaptation must be
  original wording, not a copy of a contemporary translation.
- For `sourceType: "cultural_explainer"`: original prose about a cultural
  topic (food, festival, dialect). No copyrighted source needed.

## Quality bar

Aim for **graded-reader quality**:

- Natural, useful sentences over flowery or textbook-stilted ones.
- HSK 1 may repeat words for reinforcement — that's fine.
- HSK 2–3 should tell a tiny story or describe a real situation.
- HSK 4–6 should sound like something a learner would actually want to read.

A common pitfall is shoving every target word into one sentence. Spread them
out and let context do the work.

## Adding a new passage — checklist

1. Pick the HSK level. Open `src/data/library/hsk{N}.json`.
2. Append a new object with all required fields. Use the `LibraryItem` type
   in `src/types/library.ts` as the reference.
3. Run `npm run hsk:coverage` — fix any validation errors it reports.
4. Run `npm run build` to ensure types and routes still resolve.
5. Open `/library` to verify the card renders, and `/library/{slug}` to
   verify the reader + translation toggles work.
