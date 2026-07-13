# Contributing to Chinese Adaptive Reader

## Local setup

Use Node 20 or later. Install dependencies and generate the ignored local
artifacts before running a production build or coverage validation:

```bash
npm ci
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
npm run typecheck
npm run test:run
npm run check:hsk-coverage
npm run build
# Runs the same local validation sequence after generated prerequisites exist.
npm run validate
```

`npm run hsk:coverage` deliberately rewrites
`src/data/hskCoverageReport.json`. Run it after changes to library content or
the HSK source data, inspect and commit the meaningful report diff, then run
`npm run check:hsk-coverage`. The check command never writes the report and
fails when the committed file is stale.

## Reporting and proposing work

Use the bug-report template for reproducible problems, including steps and
browser/device details. Use the feature-request template to state the learner
problem, a focused proposal, and alternatives considered. Do not include
secrets or private learner data in issues, pull requests, screenshots, or logs.
