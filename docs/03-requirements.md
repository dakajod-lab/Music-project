# 03 — Functional Requirements

_Status: Release 0.1 **agreed v1.2** (2026-10-01)._

The acceptance criteria now live **in the code** as Gherkin feature files in [`/features`](../features).
They are the single source of truth and run as acceptance tests. This page is only an index.

## Requirement index

| ID | Requirement | Release | File |
|----|-------------|---------|------|
| REC-001 | Record audio | 0.1 | [recording.feature](../features/recording.feature) |
| REC-002 | Recording time limit | 0.1 | [recording.feature](../features/recording.feature) |
| REC-003 | Interrupted recording is kept | 0.1 | [recording.feature](../features/recording.feature) |
| REC-004 | New recording replaces the old one | 0.1 | [recording.feature](../features/recording.feature) |
| REC-005 | Input level is visible (R11) | 0.1 | [recording.feature](../features/recording.feature) |
| REC-006 | Screen stays on while recording (R3) | 0.1 | [recording.feature](../features/recording.feature) |
| STO-001 | Recording is kept on the device | 0.1 | [storage.feature](../features/storage.feature) |
| NFR-A11Y-001 | WCAG 2.2 AA (automated scan) | 0.1 | [accessibility.feature](../features/accessibility.feature) |
| PLY-001 | Play back a recording | 0.1 | [playback.feature](../features/playback.feature) |
| EXP-001 | Export as WAV | 0.1 | [export.feature](../features/export.feature) |

Non-functional requirements (usability, performance, devices, ...) are in [04-nfr.md](04-nfr.md).

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-09-30 | No warning before the recording limit; elapsed time and limit are always visible instead. | Simple; the user can always see the time. |
| 2026-09-30 | A new recording replaces the old one after confirmation; no list of takes in 0.1. | Simple first version; may change after user testing. |
| 2026-09-30 | Recordings are stored on the device and survive reload/close (new story STO-001). | Losing an idea on close is unacceptable (R4). |
| 2026-09-30 | EXP-001.3 (Ableton import, was .2) is a manual test, run when the impact analysis requires it, not every release. | Needs a human with Ableton; only relevant when export changes. |
| 2026-10-01 | Rewrote 0.1 AC to be shorter; added writing style rules. | Owner feedback: AC were too wordy. |
| 2026-10-01 | Lists of variants become Scenario Outlines (REC-001.4, REC-003.1); crash case from STO-001.2 merged into REC-003.1. | One rule, many examples; removes duplication. |
| 2026-10-01 | Boundary values (e.g. 4:59 vs 5:00) moved out of AC into test design. | AC state the rule; choosing test values is a testing technique (phase 6). |
| 2026-10-01 | Max loss of 2 s on tab close / crash accepted. | Balance between safety and battery/performance. |
| 2026-10-01 | Review fixes: REC-001.1 split Ands; REC-001.2 only stops (playback after stop is PLY-001.4); REC-002.1 "automatically"; REC-004 split into ask / confirm / cancel; STO-001.2 "so far" removed. | Owner review. |
| 2026-10-01 | Confirm and cancel must be clearly distinguishable → recorded as usability NFR (NFR-USA-001), not as functional AC. | It is about how the UI looks, which AC deliberately leave out. |
| 2026-10-01 | Gherkin moved into `/features/*.feature`; these files are the single source of truth and will run as tests. | Owner wants requirements and tests in one place (living documentation). |
| 2026-10-05 | Added REC-005 (input level and clipping indicator) to 0.1. | Risk R11: distorted recordings make the app useless. |
| 2026-10-05 | Added REC-005.3 (input level before recording) and REC-006 (screen stays on while recording). | Check the setup without a test take; prevent the most common interruption (R3). |
| 2026-10-06 | NFRs that can be automated are also written as scenarios in `/features`, tagged `@nfr`. | One place for everything that runs as a test; NFR definitions stay in 04-nfr.md. |
