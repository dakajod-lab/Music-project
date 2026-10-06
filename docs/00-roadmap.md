# Project Roadmap — Music Recording App

A learning project: take a simple cross-device (phone + desktop) music recording app
from idea to production, with a QA / technical-testing focus at every stage.

We work through each phase together. A phase is only "Done" when its document is agreed.

| # | Phase | Document | Status |
|---|-------|----------|--------|
| 1 | Business case & vision | [01-business-case.md](01-business-case.md) | ✅ Agreed v1.0 |
| 2 | Users, personas & scope (MVP vs later) | [02-scope.md](02-scope.md) | ✅ Agreed v1.0 |
| 3 | Functional requirements (Given/When/Then), per release | [03-requirements.md](03-requirements.md) | ✅ 0.1 agreed (in `/features`) |
| 4 | Non-functional requirements (performance, devices, a11y, privacy) | [04-nfr.md](04-nfr.md) | ✅ Agreed v1.0 |
| 4b | Risk workshop (in-depth review of R1–R7, likelihood × impact) | [04b-risk-register.md](04b-risk-register.md) | ✅ Agreed v1.0 |
| 5 | Architecture & tech stack decisions (ADRs) | [05-architecture.md](05-architecture.md) | ✅ Agreed v1.0 |
| 6 | Test strategy (levels, tools, risk-based priorities) | [06-test-strategy.md](06-test-strategy.md) | ✅ Agreed v1.0 |
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

### Writing style for acceptance criteria
1. **One behaviour per scenario.** If the title needs "and", split it.
2. **Short steps.** One Given, one When, one Then; at most one or two `And`s.
3. **State the rule, not the test.** "Stops at 5 minutes", not "at 4:59 it continues, at 5:00 it stops".
   Boundary values and other test values are chosen during test design.
4. **Variants become a Scenario Outline.** When the same rule applies to several inputs,
   list them in an `Examples` table instead of in brackets or prose.
5. **Behaviour, not design.** No buttons, colours, layout or exact wording of messages.
6. **Measurable outcomes.** Prefer a number ("at most 2 s lost") over a vague word ("a few seconds").
7. **Manual tests are tagged** `@manual` with a note on when to run them.
