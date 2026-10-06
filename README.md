# Music-project

A simple music recording app for phone and desktop, built end-to-end as a QA /
technical-testing learning project — from business case to deployment.

Start at [docs/00-roadmap.md](docs/00-roadmap.md).

## Development

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npx playwright install chromium   # once, for acceptance tests
npm run dev                       # app at http://localhost:5173
```

| Command | What it does |
|---------|--------------|
| `npm run check` | Fast checks: type check, lint, formatting, unit tests |
| `npm test` | Unit, component and integration tests (Vitest) |
| `npm run test:coverage` | Same, with a coverage report in `coverage/` (information only, see P8) |
| `npm run test:acceptance` | Generates test audio, then runs all feature files in Chromium (desktop + Android emulation) |
| `npm run gen:audio` | Generates the deterministic test audio in `tests/fixtures/audio/` |

Acceptance test options:
- Only one release: `npx playwright test --grep @r0.1`
- Tier 2 browsers too: `PW_TIER2=1 npm run test:acceptance` (needs `npx playwright install firefox webkit`)
- Use a pre-installed Chromium: `PW_CHROMIUM_PATH=/path/to/chrome npm run test:acceptance`
- HTML report: `npx playwright show-report`

Scenarios whose steps are not implemented yet are reported as **skipped** (pending).
