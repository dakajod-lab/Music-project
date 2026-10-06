@r0.1 @nfr
Feature: Security (NFR-SEC)

  Rule: NFR-SEC-002 Served over HTTPS
    Browsers only allow microphone access in a secure context.

    @smoke
    Scenario: NFR-SEC-002.1 The app runs in a secure context
      Given the app is open
      Then the app runs in a secure context
