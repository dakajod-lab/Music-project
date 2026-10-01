@r0.1
Feature: Recording (REC)

  Rule: REC-001 Record audio
    As the Idea Catcher, I want to record with my microphone, so that I can capture an idea.

    Scenario: REC-001.1 Start recording
      Given microphone access is granted
      When the user starts recording
      Then audio is recorded
      And the elapsed time is shown
      And the time limit is shown

    Scenario: REC-001.2 Stop recording
      Given a recording is in progress
      When the user stops recording
      Then the recording stops

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
        | problem                     | reason                                |
        | microphone access is denied | access is needed, and how to allow it |
        | no microphone is available  | no microphone was found               |

  Rule: REC-002 Recording time limit
    As the Idea Catcher, I want recording to stop safely at the limit, so that the app never runs out of memory.

    Scenario: REC-002.1 Recording stops automatically at the limit
      Given a recording is in progress
      When the recording reaches 5 minutes
      Then the recording stops automatically
      And all 5 minutes are kept

  Rule: REC-003 Interrupted recording is kept
    As the Idea Catcher, I want audio recorded before an interruption to be kept, so that I never lose an idea.

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

  Rule: REC-004 New recording replaces the old one
    In 0.1 there is one track and no list of takes. Will be revisited for multitrack in 0.2.

    Scenario: REC-004.1 Replacement must be confirmed
      Given a recording exists
      When the user starts a new recording
      Then the user is asked to confirm the replacement

    Scenario: REC-004.2 Confirm the replacement
      Given the user is asked to confirm the replacement
      When the user confirms
      Then the new recording starts
      And the old recording is deleted

    Scenario: REC-004.3 Cancel the replacement
      Given the user is asked to confirm the replacement
      When the user cancels
      Then no recording starts
      And the old recording is unchanged
