@r0.1 @nfr
Feature: Security and privacy (NFR-SEC)

  Rule: NFR-SEC-001 Audio never leaves the device
    Recordings stay on the user's device in v1 (no backend, ADR-002).

    Scenario: NFR-SEC-001.1 No audio is sent over the network while recording
      Given the app is open
      When the user records and stops a recording
      Then no network request sends data from the device

  Rule: NFR-SEC-002 Served over HTTPS
    Browsers only allow microphone access in a secure context.

    @smoke
    Scenario: NFR-SEC-002.1 The app runs in a secure context
      Given the app is open
      Then the app runs in a secure context

  Rule: NFR-SEC-003 No tracking or analytics

    Scenario: NFR-SEC-003.1 The app only talks to its own site
      Given the app is open
      When the user records and stops a recording
      Then every network request goes to the app's own site
