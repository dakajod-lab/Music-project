# Feature files: the single source of truth for functional requirements

Requirements are written in Gherkin and live here, next to the code. The same files are
executed as acceptance tests with **playwright-bdd** (see ADR-001 in docs/05-architecture.md).

## Structure
| Gherkin keyword | Meaning in this project |
|-----------------|-------------------------|
| `Feature` | A feature area (REC, PLY, EXP, STO, ...) |
| `Rule` | One requirement / user story, e.g. `REC-001` |
| `Scenario` / `Scenario Outline` | One acceptance criterion, e.g. `REC-001.2` |

## Tags
| Tag | Meaning |
|-----|---------|
| `@r0.1`, `@r0.2`, ... | Release the scenario belongs to |
| `@manual` | Not automated (excluded from test runs). The comment above it says when to run it |
| `@nfr` | Scenario checks a non-functional requirement (see docs/04-nfr.md) |

Writing style: see [docs/00-roadmap.md](../docs/00-roadmap.md#writing-style-for-acceptance-criteria).

Step definitions live in [`tests/steps`](../tests/steps). Scenarios without step definitions are reported as skipped (pending).
