# Project Roadmap — Music Recording App

A learning project: take a simple cross-device (phone + desktop) music recording app
from idea to production, with a QA / technical-testing focus at every stage.

We work through each phase together. A phase is only "Done" when its document is agreed.

| # | Phase | Document | Status |
|---|-------|----------|--------|
| 1 | Business case & vision | [01-business-case.md](01-business-case.md) | ✅ Agreed v1.0 |
| 2 | Users, personas & scope (MVP vs later) | [02-scope.md](02-scope.md) | ✅ Agreed v1.0 |
| 3 | Functional requirements (Given/When/Then), per release | [03-requirements.md](03-requirements.md) | ✅ 0.1 agreed |
| 4 | Non-functional requirements (performance, devices, a11y, privacy) | 04-nfr.md | Not started |
| 4b | Risk workshop (in-depth review of R1–R7, likelihood × impact) | 04b-risk-register.md | Not started |
| 5 | Architecture & tech stack decisions (ADRs) | 05-architecture.md | Not started |
| 6 | Test strategy (levels, tools, risk-based priorities) | 06-test-strategy.md | Not started |
| 7 | Code skeleton + first tests | `/src`, `/tests` | Not started |
| 8 | CI/CD pipeline & quality gates | 08-ci-cd.md | Not started |
| 9 | Deployment & release | 09-deployment.md | Not started |
| — | Look & feel / UX (gradual, per release, after test structure exists) | ux/ | Later |
| 10 | Retrospective & lessons learned | 10-retro.md | Not started |

## Conventions

- **Requirements** are written as user stories + acceptance criteria in Given / When / Then.
- Acceptance criteria describe **behaviour, not design** — no button colours, layouts,
  or pixel positions. ("When the user starts a recording", not "When the user taps the red button".)
- Every requirement gets an ID (e.g. `REC-001`) so tests can trace back to it.
- Open questions are tracked in each document under **Open questions** until resolved.
- Decisions are recorded with date and reasoning, so we can revisit them later.
