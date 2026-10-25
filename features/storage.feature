@r0.1
Feature: Storage (STO)

  Rule: STO-001 Recording is kept on the device
    As the Idea Catcher, I want my recording to be there when I come back, so that closing the app never loses an idea.

    Scenario Outline: STO-001.1 Recording survives leaving the app
      Given a recording exists
      When the user <leaves> and opens the app again
      Then the same recording is available

      Examples:
        | leaves               |
        | reloads the page     |
        | closes the tab       |
        | restarts the browser |

    Scenario: STO-001.2 Storage is full
      Given the device storage is full
      When a recording is in progress
      Then the recording stops
      And the recorded audio is kept
      And the user is told that storage is full

    Scenario: STO-001.3 A recording interrupted by a crash is recovered
      Given a recording is in progress
      When the app closes unexpectedly and is opened again
      Then the recording up to the moment it closed is available
      And the user is told that the recording was recovered

    Scenario: STO-001.4 Warning before recording when storage is low
      Given the device has less free storage than a full-length recording needs
      When the user starts recording
      Then the user is warned that the recording may not fit
      And the recording starts
