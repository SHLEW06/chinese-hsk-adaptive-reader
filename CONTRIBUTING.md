# Contributing to Chinese Adaptive Reader

## Local setup

Use Node 20 or later. Install dependencies and generate the ignored local
artifacts before running a production build or coverage validation:

```bash
npm ci
npm ci --prefix functions
npm run fetch:dict-sources
npm run build:dict
```

Copy `.env.example` to `.env.local` only when you need Firebase-backed local
features. Never commit `.env*`, credentials, service accounts, or API keys.

## Branches and pull requests

Create a focused branch such as `feat/reader-notes`, `fix/study-session`, or
`chore/coverage-check`. Keep each pull request limited to one reviewable
change, explain the problem and validation performed, and use the pull request
template. Automated checks run on pull requests targeting `main`.

## Validation

```bash
npm run lint
# Checks the Next.js application with the root TypeScript configuration.
npm run typecheck
# Checks Firebase Functions with functions/tsconfig.json and its dependencies.
npm run typecheck:functions
npm run test:run
npm run check:hsk-coverage
npm run build
# Runs both TypeScript scopes and the complete validation sequence.
npm run validate
```

The web application and Firebase Functions are separate TypeScript packages.
Install both lockfiles before validation; the root package does not own
`firebase-admin` or `firebase-functions`.
CI uses non-secret placeholder Firebase Web SDK configuration for the static
production build; repository validation does not require Firebase credentials.

`npm run hsk:coverage` deliberately rewrites
`src/data/hskCoverageReport.json`. Run it after changes to library content or
the pinned HSK source revision in `scripts/fetch-dict-sources.mjs`, inspect and
commit the meaningful report diff, then run `npm run check:hsk-coverage`. The
check command never writes the report and fails when the committed file is
stale. Pull-request validation uses that immutable HSK revision so unrelated
upstream changes cannot invalidate the committed report.

## Reporting and proposing work

Use the bug-report template for reproducible problems, including steps and
browser/device details. Use the feature-request template to state the learner
problem, a focused proposal, and alternatives considered. Do not include
secrets or private learner data in issues, pull requests, screenshots, or logs.
