# Chinese Adaptive Reader

A calm, paper-themed Mandarin reading app for HSK 1–6 learners. Read curated
passages with hand-authored translations, tap any word for an instant
dictionary popup, save vocabulary as you read, and graduate words to "learned"
through spaced repetition.

- **Static export** for Firebase Hosting (no Node server required at runtime).
- **Frontend** is fully separated from the **backend**: AI features live in
  Firebase Cloud Functions behind authenticated callable endpoints; no API key
  is ever shipped to the browser.
- **Progress** persists to localStorage when signed-out, and to per-user
  Firestore documents after Google sign-in. The user picks when to sync.

## What it does

### Reader & Library
- A growing catalog of original passages across HSK 1–6, with categories like
  Daily Life, Food, Pop Culture, News & Society, Stories & Fables, History &
  Culture, Travel, and more.
- Each library passage ships with a hand-authored **English translation**,
  paragraph-level translations, sentence-level grammar/phrase notes, and
  comprehension questions — all rendered as flowing paragraphs (not line-by-line)
  with a small inline "Explain" chip after each sentence.
- Tap any word to see simplified/traditional, pinyin, definitions, HSK level,
  and Save / Mark known actions.
- Pinyin annotations toggle on/off, paper/night theme, four text sizes, and a
  serif/sans CJK font switch.
- Readings auto-mark as **completed** when the learner scrolls past the end,
  and completed items show a "✓ Read" pill on the library cards. The dashboard
  also filters them out of future recommendations so the rail keeps moving.

### Vocabulary & Spaced Repetition
- **Study session** with SM-2-flavored SRS: Again / Hard / Good / Easy, with
  daily-then-weekly intervals so words you know surface less often.
- **Per-session sidebar** showing every card in the deck and its progress dots
  toward graduating out of the round; finished cards show ✓ or a "Learned"
  badge when they've passed the weekly threshold.
- **Mixed deck** pulls all due reviews across HSK bands + saved words and
  interleaves new HSK words at the learner's current level.
- **Saved-words deck** lets you cram the words you've flagged from your
  readings.
- **Learned Words page** lists every word past the weekly review interval,
  searchable, with the "first met in …" source sentence surfaced when the
  word was saved from a reading. Forget words individually or via bulk
  multi-select to push them back into rotation.
- **Settings**: cap max new and max reviews per session.

### Vocabulary calibration
- **Comprehensive calibration** (`/vocabulary/calibration`) works through the
  HSK 1–6 vocabulary of the levels you pick in resumable ~50-word blocks:
  you see the Chinese term first, self-assess (Know / Not sure / Don't know),
  then confirm by picking the meaning from deterministic multiple-choice
  options. Progress is checkpointed on the device after every answer, so
  interrupted runs (refresh, navigation, browser closure) resume at the exact
  next word; nothing applies until you confirm.
- **Quick starting level** assumes only the levels *below* your chosen level
  as known (the boundary level still gets studied), for learners who already
  know roughly where they stand. **Start from scratch** skips calibration and
  keeps today's behavior.
- **Calibration-known ≠ SRS-mastered.** Words you get right are excluded
  from the ordinary new-card queue but are never marked as mastered — a
  single answer isn't durable recall, so no review history is fabricated.
  They return later as **check-in cards** (about 1–5 weeks out, depending on
  confidence): pass and the word gains genuine review state; fail and it
  drops straight into active learning. A check-in's outcome is persisted the
  moment it is first graded — abandoning the rest of the study session does
  not lose it — and genuine review history always takes precedence over
  calibration results.
- **Recalibrate or reset anytime** from the calibration page; resets only
  remove calibration-derived state and never touch review history or saved
  words. Individual assumed-known words can be sent back to active study.
- Calibration state persists to localStorage when signed out. Signed in, every
  answer is still checkpointed locally first, and the state is synchronized to
  Firestore through ordered (serialized per-user) writes every few answers and
  on pause or leaving the page; on load, the newer of the cloud copy and the
  local checkpoint wins. Switching devices immediately after answering can
  still trail the cloud by a few answers until the next sync.
- Calibration data saved by a **newer app version** (a future schema) is
  preserved untouched: older clients show it as read-only, refuse calibration
  writes until updated, and keep reading and ordinary vocabulary study
  working. Estimates are informal study aids, not official HSK certification.

### Dashboard
- Placement-driven HSK level, saved/known/review counts, known-word progress
  bar.
- **Due today** widget — one-tap into the mixed study session when there's
  anything queued.
- **Right now** rail with three hand-picked library passages at or just
  above your level, routed straight to `/library/[slug]` so you get the
  curated translation rather than a runtime guess.
- Daily / weekly plan with weak-grammar nudges from your placement result.

### Placement
- Adaptive estimate (vocabulary, grammar, three reading passages, self-rating)
  with early-stop streaks so you don't grind through the whole thing.
- HSK 1–6 **mock exams** — balanced subsets of vocabulary, grammar, and
  reading, so you can see whether you'd pass a band today.

### Dictionary
- ~121k pronunciation-aware entries from CC-CEDICT and the pinned HSK source.
  Each entry carries a learner primary gloss, accepted glosses, provenance,
  confidence, audit flags, and separately modeled alternate readings. Searchable
  by Chinese (prefix), tone-insensitive pinyin, or English substring.
- Lazy-loaded from `public/dict/dictionary.min.json` and persisted via
  IndexedDB so subsequent loads are instant.

## Tech stack

- **Next.js 14 (App Router)** with `output: "export"` — every page is
  pre-rendered to static HTML.
- **React 18** + **TypeScript** (strict mode).
- **TailwindCSS** with a warm paper / seal-red palette and a separate night
  mode driven by `data-theme="night"`.
- **Firebase** Hosting, Auth (Google), and Cloud Firestore behind a single
  typed `StorageProvider` so the rest of the app never touches Firestore
  directly.
- **Firebase Functions v2** for the optional AI sentence-explanation pipeline
  (server-side only).
- **pinyin-pro** for fallback pinyin on words not in the dictionary.

## Project layout

```
chinese-adaptive-reader/
├─ src/
│  ├─ app/              # Routes: dashboard, library, library/[id], reader,
│  │                    #         vocabulary, vocabulary/study, vocabulary/learned,
│  │                    #         saved-words, dictionary, placement
│  ├─ components/       # app-shell, dashboard, library, reader, vocabulary,
│  │                    # saved-words, placement, dictionary, auth, ui
│  ├─ lib/
│  │  ├─ dictionary/    # Lazy-loaded CC-CEDICT index + HSK tagging + search
│  │  ├─ segmentation/  # Greedy maximum-matching tokenizer
│  │  ├─ grammar/       # Rule-based sentence explanation (client-side)
│  │  ├─ content/       # Difficulty estimator, classifier, import pipeline
│  │  ├─ hsk-study/     # SRS scheduler, in-session deck, mixed-deck builder
│  │  ├─ library/       # Static-translation builder, completion tracking
│  │  ├─ placement/     # Adaptive placement scoring
│  │  └─ storage/       # StorageProvider abstraction (Firestore + local)
│  ├─ data/             # Library JSONs, HSK glossaries, placement questions
│  └─ types/            # Typed domain models
├─ functions/           # Firebase Cloud Functions (server-side AI provider)
│  └─ src/ai/           # Provider interface, Groq adapter, secret management
├─ public/
│  └─ dict/             # Generated dictionary.min.json (run scripts to build)
├─ scripts/             # CC-CEDICT fetch, dictionary build, HSK coverage
├─ firestore.rules      # Per-user document isolation rules
└─ firebase.json
```

## Frontend / backend separation

- The browser bundle contains **only** the Firebase Web SDK config
  (`NEXT_PUBLIC_FIREBASE_*`) — those values are public-by-design; access is
  gated by Firestore Rules and Auth.
- Any AI-powered explanation runs server-side via Firebase Functions, which
  load the provider key (`GROQ_API_KEY`) from Firebase Secret Manager via
  `defineSecret`. The key is never imported into client code.
- Cloud Functions enforce three layers of safety: (a) caller must be
  authenticated, (b) per-user sliding-window rate limit, (c) shared
  Firestore cache keyed by SHA-256 of the input so duplicate calls are
  served free.
- Firestore Rules restrict every document under `users/{uid}/...` to the
  signed-in user that owns it.

## Local setup

```bash
git clone https://github.com/<you>/chinese-hsk-adaptive-reader.git
cd chinese-adaptive-reader
npm install

# Materialize hash-pinned sources and build the audited dictionary artifact
npm run fetch:dict-sources
npm run build:dict
npm run audit:dict

# Copy the env template and fill in your Firebase Web SDK config
cp .env.example .env.local
# edit .env.local

npm run dev
# open http://localhost:3000
```

The dictionary artifact lives at `public/dict/dictionary.min.json`. It's not
committed; a `prebuild` guard fails the build with a clear message if you
haven't generated it. Once built it is about 21 MB before transport compression
and is fetched lazily on first read.

The build uses the committed CC-CEDICT snapshot released at
`2026-07-13T07:02:08Z` and `complete-hsk-vocabulary` commit
`7ac65bf1a6387d35f1ade478906172a19311c7f9`. Both source files are SHA-256
verified. `scripts/dictionary-overrides.json` contains reviewed, source-exact
selections for ambiguous common entries; uncertain entries remain in the
dictionary with `review` confidence and a pending manual-review status.
`npm run audit:dict` writes a compact tracked report plus a full compressed
local report under `artifacts/`.

## Validation and contributing

The web application and Firebase Functions have separate dependency and
TypeScript scopes. Install both lockfiles, then validate each scope directly or
run the complete suite after the generated artifacts above exist:

```bash
npm ci
npm ci --prefix functions
npm run typecheck             # Next.js application
npm run typecheck:functions   # Firebase Functions
npm run validate              # Both scopes plus all repository checks
```

Pull requests targeting `main` run linting, both TypeScript checks,
deterministic unit tests, HSK coverage validation, and a production build in
GitHub Actions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch conventions, generated
HSK coverage policy, and issue reporting guidance.

### Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com/).
2. Register a Web app and copy the config — these are the values that go in
   `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
3. Enable **Google sign-in** under Authentication → Sign-in method.
4. Create a Cloud Firestore database.
5. Deploy `firestore.rules` (or paste them into the console).
6. Add your production domain under **Authentication → Settings →
   Authorized domains**.

### (Optional) Cloud Functions for AI explanations

The current reader uses local rule-based explanations only — no API key is
needed for normal use. If you want to wire the AI fallback:

```bash
cd functions
npm install
firebase functions:secrets:set GROQ_API_KEY   # follow the prompt
firebase deploy --only functions
```

The functions are written against an OpenAI-compatible chat API. The
included provider points at Groq, but the adapter under
`functions/src/ai/providers/` is a single small file you can swap.

## Production build & deploy

```bash
npm run build                # static export -> ./out
npm run deploy               # firebase hosting + firestore rules
# or:
npm run deploy:hosting
npm run deploy:firestore
```

## Data persistence

| Surface              | Where it's stored                          |
| -------------------- | ------------------------------------------ |
| Reading prefs (theme, pinyin, font) | localStorage                |
| Saved words          | localStorage → Firestore on sign-in        |
| SRS state (per word) | localStorage                               |
| Study settings (caps)| localStorage                               |
| Completed readings   | localStorage                               |
| Learner profile      | localStorage → Firestore on sign-in        |
| Imported content     | localStorage → Firestore on sign-in        |
| Placement results    | localStorage → Firestore on sign-in        |
| AI cache (if used)   | Firestore (shared, hashed by input)        |

Signed-out users can use everything — the "Sync to cloud" button on the
dashboard uploads existing browser progress only when the user opts in.

## Acknowledgments & licensing

- **[CC-CEDICT](https://cc-cedict.org/wiki/)** (CC BY-SA 4.0) — the
  community-maintained Chinese-English dictionary that powers word lookups;
  this repository redistributes the pinned 2026-07-13 snapshot in compressed
  form under the same license.
- **[complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary)** —
  aggregated HSK 2.0 / 3.0 word lists, pinned to commit `7ac65bf1a638` and used
  under its MIT license.
- **[pinyin-pro](https://github.com/zh-lx/pinyin-pro)** — fallback pinyin
  annotation.
- All library passages are original, written for learning purposes.

The generated dictionary artifact (`public/dict/dictionary.min.json`) is a
derivative work and is governed by CC-BY-SA 4.0. The app's own source code
is separate from the dictionary data — release under whichever license fits
your fork. See [Third-party notices](THIRD_PARTY_NOTICES.md) for the complete
source pins, attribution, license text, and dictionary modification notice.

## Disclaimer

This is a personal learning project, not a tutoring service. The library
content and translations are written for instructional use and may contain
errors — corrections welcome via pull request.
