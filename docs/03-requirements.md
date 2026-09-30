# 03 — Functional Requirements

_Status: Release 0.1 in draft._

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

  Scenario: REC-002.2 User is warned before the limit
    Given a recording is in progress
    When 30 seconds of recording time remain ❓
    Then the user is told that the recording will stop soon
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

  Scenario: EXP-001.2 Exported file opens in Ableton
    Given a WAV file exported by the app
    When the file is imported into Ableton Live
    Then Ableton imports it without errors or conversion warnings

  Scenario: EXP-001.3 Nothing to export
    Given no finished recording exists
    Then export is not available
```

### REC-004: A new recording replaces the previous one ❓
_In 0.1 there are no projects and only one track._

```gherkin
  Scenario: REC-004.1 Record over an existing recording
    Given a finished recording exists
    When the user starts a new recording
    Then the user is asked to confirm that the existing recording will be replaced
```

---

## Open questions (Release 0.1)
1. **REC-002.2:** Should there be a warning before the 5-minute limit, and if so, how long before (30 s)?
2. **REC-004:** In 0.1, should a new recording replace the old one (after confirmation), or should we keep a
   simple list of takes?
3. **Persistence:** Should the recording still be there after the page is reloaded or the browser is closed?
   (If not, it is gone unless exported. Simpler, but it conflicts with R4 data loss.)
4. **EXP-001.2** needs a human with Ableton, so it is a **manual** test. Is that OK as a release checklist item?
