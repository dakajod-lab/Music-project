# 03 — Functional Requirements

_Status: Release 0.1 **v1.1 in review** (rewritten for brevity, 2026-10-01)._

## How to read this document
- Each requirement is a short **user story** with an ID (`AREA-NNN`) and acceptance criteria (AC).
- AC IDs (`REC-001.2`) are what tests reference, so every test traces back to a requirement.
- See **Writing style** in the [roadmap](00-roadmap.md#conventions) for the rules these follow.

---

## Release 0.1: Walking skeleton

### REC-001: Record audio
_As the Idea Catcher, I want to record with my microphone, so that I can capture an idea._

```gherkin
Scenario: REC-001.1 Start recording
  Given microphone access is granted
  When the user starts recording
  Then audio is recorded
  And the elapsed time and the time limit are shown

Scenario: REC-001.2 Stop recording
  Given a recording is in progress
  When the user stops recording
  Then the recording is ready for playback

Scenario: REC-001.3 First use asks for microphone access
  Given microphone access has never been requested
  When the user starts recording
  Then the user is asked for microphone access

Scenario Outline: REC-001.4 Microphone cannot be used
  Given <problem>
  When the user starts recording
  Then no recording starts
  And the user is told <reason>

  Examples:
    | problem                    | reason                                     |
    | microphone access is denied | access is needed, and how to allow it     |
    | no microphone is available  | no microphone was found                   |
```

### REC-002: Recording time limit
_As the Idea Catcher, I want recording to stop safely at the limit, so that the app never runs out of memory._

```gherkin
Scenario: REC-002.1 Recording stops at the limit
  Given a recording is in progress
  When the recording reaches 5 minutes
  Then the recording stops
  And all 5 minutes are kept
```

### REC-003: Interrupted recording is kept
_As the Idea Catcher, I want audio recorded before an interruption to be kept, so that I never lose an idea._

```gherkin
Scenario Outline: REC-003.1 Recording is interrupted
  Given a recording is in progress
  When <interruption>
  Then the recording stops
  And at most <max loss> of audio before the interruption is lost

  Examples:
    | interruption                   | max loss |
    | a phone call comes in          | 0 s      |
    | the app goes to the background | 0 s      |
    | the microphone is disconnected | 0 s      |
    | the tab is closed              | 2 s      |
    | the browser crashes            | 2 s      |
```

### REC-004: New recording replaces the old one
_In 0.1 there is one track and no list of takes. May change after user testing._

```gherkin
Scenario: REC-004.1 Replace after confirming
  Given a recording exists
  When the user starts a new recording and confirms the replacement
  Then the new recording replaces the old one

Scenario: REC-004.2 Cancel the replacement
  Given a recording exists
  When the user starts a new recording and cancels
  Then the existing recording is unchanged
```

### STO-001: Recording is kept on the device
_As the Idea Catcher, I want my recording to be there when I come back, so that closing the app never loses an idea._

```gherkin
Scenario Outline: STO-001.1 Recording survives leaving the app
  Given a recording exists
  When the user <leaves> and opens the app again
  Then the same recording is available

  Examples:
    | leaves                  |
    | reloads the page        |
    | closes the tab          |
    | restarts the browser    |

Scenario: STO-001.2 Storage is full
  Given the device storage is full
  When a recording is in progress
  Then the recording stops
  And the audio recorded so far is kept
  And the user is told that storage is full
```

### PLY-001: Play back a recording
_As the Idea Catcher, I want to listen to my recording, so that I can judge the idea._

```gherkin
Scenario: PLY-001.1 Play
  Given a recording exists
  When the user starts playback
  Then the recording plays from the start
  And the playback position is shown

Scenario: PLY-001.2 Stop
  Given a recording is playing
  When the user stops playback
  Then playback stops

Scenario: PLY-001.3 End of recording
  Given a recording is playing
  When playback reaches the end
  Then playback stops
```

### EXP-001: Export as WAV
_As the Idea Catcher, I want to export my recording as WAV, so that I can use it in Ableton._

```gherkin
Scenario: EXP-001.1 Export
  Given a recording exists
  When the user exports it
  Then a 48 kHz / 24-bit WAV file is saved
  And it has the same length and audio as the recording

Scenario: EXP-001.2 Nothing to export
  Given no recording exists
  Then export is not available

# Manual. Run only when the impact analysis shows export or audio encoding changed.
@manual
Scenario: EXP-001.3 File imports into Ableton
  Given a WAV file exported by the app
  When it is imported into Ableton Live
  Then it imports without errors or warnings
```

---

## Open questions (Release 0.1)
1. REC-003.1: is a maximum loss of **2 seconds** acceptable when the tab is closed or the browser crashes?

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
