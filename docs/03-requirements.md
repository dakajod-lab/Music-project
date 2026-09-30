# 03 — Functional Requirements

_Status: Release 0.1 **agreed v1.0** (2026-09-30)._

## How to read this document
- Each requirement is a **user story** with an ID (`AREA-NNN`) and **acceptance criteria** (AC)
  in Given / When / Then.
- AC IDs (`REC-001.1`) are what tests reference, so every test traces back to a requirement.
- AC describe **behaviour, not design**. They never mention buttons, colours or layout.
- ❓ marks an assumption that the product owner still needs to confirm.

---

## Release 0.1: Walking skeleton

### REC-001: Record audio from the microphone
**As** the Idea Catcher, **I want** to record audio with my device's microphone,
**so that** I can capture a musical idea.

```gherkin
Feature: Record audio

  Scenario: REC-001.1 First recording asks for microphone access
    Given the user has never granted microphone access to the app
    When the user starts a recording
    Then the device asks the user for microphone access
    And no recording starts until access is granted

  Scenario: REC-001.2 Recording starts when access is granted
    Given the user has granted microphone access
    When the user starts a recording
    Then the app records audio from the microphone
    And the user can see that a recording is in progress
    And the user can see the elapsed recording time

  Scenario: REC-001.3 Recording stops on request
    Given a recording is in progress
    When the user stops the recording
    Then the recording ends
    And the recording is available for playback

  Scenario: REC-001.4 Microphone access is denied
    Given the user has denied microphone access
    When the user starts a recording
    Then no recording starts
    And the user is told that microphone access is required
    And the user is told how to allow it

  Scenario: REC-001.5 No microphone available
    Given the device has no available microphone
    When the user starts a recording
    Then no recording starts
    And the user is told that no microphone was found
```

### REC-002: Maximum recording length
**As** the Idea Catcher, **I want** recordings to stop safely at the length limit,
**so that** the app never runs out of memory and loses my idea.

```gherkin
  Scenario Outline: REC-002.1 Recording length limit
    Given a recording is in progress
    When the recording reaches <elapsed>
    Then the recording is <state>

    Examples:
      | elapsed           | state                                      |
      | 4 minutes 59 sec  | still in progress                          |
      | 5 minutes         | stopped automatically and kept in full     |

  Scenario: REC-002.2 Recording time is always visible
    Given a recording is in progress
    Then the user can see the elapsed recording time at all times
    And the user can see the maximum recording length
```

### REC-003: Interrupted recording is not lost
**As** the Idea Catcher, **I want** audio recorded before an interruption to be kept,
**so that** a phone call or switching apps never destroys an idea.

```gherkin
  Scenario: REC-003.1 Recording is interrupted
    Given a recording is in progress
    When the recording is interrupted (incoming call, app sent to background, microphone disconnected)
    Then the recording stops
    And the audio recorded up to the interruption is kept and available for playback
    And the user is told that the recording was interrupted
```

### PLY-001: Play back a recording
**As** the Idea Catcher, **I want** to listen to what I recorded,
**so that** I can decide whether the idea is worth keeping.

```gherkin
Feature: Playback

  Scenario: PLY-001.1 Play a recording
    Given a finished recording exists
    When the user starts playback
    Then the recording plays from the beginning
    And the user can see the playback position

  Scenario: PLY-001.2 Stop playback
    Given a recording is playing
    When the user stops playback
    Then playback stops

  Scenario: PLY-001.3 Playback reaches the end
    Given a recording is playing
    When playback reaches the end of the recording
    Then playback stops by itself
```

### EXP-001: Export a recording as WAV
**As** the Idea Catcher, **I want** to export my recording as a WAV file,
**so that** I can import it into Ableton.

```gherkin
Feature: Export

  Scenario: EXP-001.1 Export a recording
    Given a finished recording exists
    When the user exports the recording
    Then a WAV file is saved to the device
    And the file is 48 kHz / 24-bit
    And the file has the same duration as the recording
    And the file contains the same audio that was heard during playback

  # Manual test. Run when the impact analysis for a release shows that export or audio encoding changed.
  Scenario: EXP-001.2 Exported file opens in Ableton
    Given a WAV file exported by the app
    When the file is imported into Ableton Live
    Then Ableton imports it without errors or conversion warnings

  Scenario: EXP-001.3 Nothing to export
    Given no finished recording exists
    Then export is not available
```

### REC-004: A new recording replaces the previous one
_In 0.1 there are no projects, only one track, and no list of takes. This may change after user testing._

```gherkin
  Scenario: REC-004.1 Replace after confirmation
    Given a finished recording exists
    When the user starts a new recording
    And the user confirms that the existing recording will be replaced
    Then the new recording starts
    And the previous recording is deleted once the new recording is stopped

  Scenario: REC-004.2 Keep the existing recording
    Given a finished recording exists
    When the user starts a new recording
    And the user cancels the replacement
    Then no recording starts
    And the existing recording is unchanged
```

### STO-001: Recording is kept on the device
**As** the Idea Catcher, **I want** my recording to still be there when I come back to the app,
**so that** an idea is never lost just because I closed the browser.

```gherkin
Feature: Local storage

  Scenario Outline: STO-001.1 Recording survives leaving the app
    Given a finished recording exists
    When the user <action>
    And the user opens the app again
    Then the same recording is available for playback and export

    Examples:
      | action                        |
      | reloads the page              |
      | closes the browser tab        |
      | restarts the browser          |

  Scenario: STO-001.2 Audio is saved while recording
    Given a recording is in progress
    When the app is closed unexpectedly (crash, tab closed, battery dies)
    And the user opens the app again
    Then the audio recorded up to a few seconds before the app closed is available

  Scenario: STO-001.3 Device storage is full
    Given the device does not have enough free storage
    When the user starts or continues a recording
    Then the user is told that storage is full
    And the audio recorded so far is kept
```

---

## Open questions (Release 0.1)
_None._

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-09-30 | No warning before the recording limit; elapsed time and limit are always visible instead. | Simple; the user can always see the time. |
| 2026-09-30 | A new recording replaces the old one after confirmation; no list of takes in 0.1. | Simple first version; may change after user testing. |
| 2026-09-30 | Recordings are stored on the device and survive reload/close (new story STO-001). | Losing an idea on close is unacceptable (R4). |
| 2026-09-30 | EXP-001.2 (Ableton import) is a manual test, run when the impact analysis requires it, not every release. | Needs a human with Ableton; only relevant when export changes. |
