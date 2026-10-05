# 06 — Test Strategy

_Status: Collecting principles. Full strategy is written in phase 6._

## Principles agreed so far
| # | Principle | Agreed |
|---|-----------|--------|
| P1 | Requirements are Gherkin feature files and run as tests (living documentation). | 2026-10-01 |
| P2 | Test effort follows the risk score (see [risk register](04b-risk-register.md)). | 2026-10-01 |
| P3 | No manual steps without a clear pass/fail ("verify it sounds OK" is not allowed). Subjective areas use exploratory charters with concrete observations. | 2026-10-05 |
| P4 | Automate the app's *reaction* to device events; check on the real device that the device *really sends* those events. | 2026-10-05 |
| P5 | **Big acceptance test first, then trust the automation.** See below. | 2026-10-05 |

## P5: Acceptance testing over the lifecycle of a feature
1. **First release of a big feature:** a large acceptance test. All automated tests **plus** a full manual / exploratory
   session on the reference devices (all relevant charters).
2. **Every bug found manually gets an automated regression test** before it is closed.
   This is how trust in the automation is earned.
3. **Later releases:** rely on the automated tests. Manual / exploratory testing is repeated only when the
   **impact analysis** shows the feature, its dependencies, or the platform (OS / Chrome major version) changed.
