# 08 — CI/CD Pipelines

_Status: **Agreed v1.0** (2026-10-06)._

All pipelines are GitHub Actions workflows in [`.github/workflows`](../.github/workflows).
They share one reusable test workflow (`_tests.yml`), so every pipeline runs the tests in exactly the same way.

| # | Pipeline | File | Trigger | Runs | Blocks |
|---|----------|------|---------|------|--------|
| 1 | **PR / Fast checks** | `pr.yml` | Every push to a pull request | Type check, lint, format, unit/integration tests (+ coverage info), build | Merge |
| 2 | **PR / Acceptance** | `pr.yml` | After pipeline 1 is green | Feature files in Tier 1, axe, traceability + flaky report | Merge |
| 3 | **Deploy** | `deploy.yml` | Merge to `main` (or by hand) | All tests → build → GitHub Pages → `@smoke` scenarios against the **live URL** | — (red = live site broken) |
| 4 | **Nightly** | `nightly.yml` | Every night 02:17 UTC (or by hand) | Flaky hunt (Tier 1 × 10), Tier 2 browsers, `npm audit`, mutation testing (Stryker) | Never (reports only) |
| 5 | **Release** | `release.yml` | By hand, with a version number | Preflight (version, tag, impact analysis in `docs/releases/<version>.md`) → all tests → GitHub release with test report | Needs approval if the `release` environment has reviewers |
| 6 | **Manual test run** | `manual.yml` | By hand | Any suite, any branch, any browser, filter by tag/ID, repeat N times | Never |

## How to run tests by hand (pipeline 6)
GitHub → **Actions** → **Manual test run** → **Run workflow**:
- **Use workflow from:** the branch to test (e.g. a feature branch before it has a PR)
- **Which tests:** `fast`, `acceptance`, `mutation` or `all`
- **Only scenarios matching:** e.g. `@r0.1`, `@smoke`, `REC-001.2`, or empty for all
- **Which browsers:** `tier1`, one project, `tier2` or `all`
- **Repeat every test N times:** e.g. `20` to investigate a flaky test

Manual runs have their own name in the Actions list ("Manual: …"), so they never mix with the PR or main statistics.

## How to make a release (pipeline 5)
1. Copy `docs/releases/TEMPLATE.md` to `docs/releases/<version>.md`, fill it in, tick every impact-analysis item, merge it.
2. GitHub → **Actions** → **Release** → **Run workflow**, enter the version.
   Optional: `@r0.1` under "require complete" to fail if any 0.1 scenario is still pending.
3. The release appears under **Releases** with notes and the test report attached.

## Reports
Each run's **Summary** page shows the coverage table and the traceability report (scenario ID → result per browser,
with flaky tests listed first). Full Playwright HTML reports are attached as artifacts (14 days).

## One-time settings (repository owner)
| Setting | Where | Why |
|---------|-------|-----|
| Pages source = **GitHub Actions** | Settings → Pages | Lets `deploy.yml` publish the site |
| Branch protection on `main`: require PR + status checks `tests / Fast checks` and `tests / Acceptance (tier1)` | Settings → Branches | Nobody can merge red code (decided 2026-10-06) |
| Environment `release` with yourself as required reviewer (optional) | Settings → Environments | Approval step before a release is published |

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-10-06 | Six pipelines: fast PR, acceptance PR, deploy, nightly, release, manual. | Fast feedback first; slow measurements never block. |
| 2026-10-06 | Manual test run pipeline for any test selection on any branch. | Owner: local runs give false confidence; testing new tests should not require merging or pollute main's statistics. |
| 2026-10-06 | Nightly flaky hunt repeats Tier 1 ten times. | Find flaky tests actively, with data (P7). |
| 2026-10-06 | Post-deploy smoke test (`@smoke`) against the live URL. | A green build can still break on the real host (paths, HTTPS). |
| 2026-10-06 | Release pipeline built now and tested with 0.0.1. | Owner: see that everything works end to end early. |
