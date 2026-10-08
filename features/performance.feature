@r0.1 @nfr
Feature: Performance (NFR-PERF)
  CI runs on emulated devices, so these scenarios are an early warning.
  The targets themselves are checked on the reference phone (manual, first acceptance test of a release).

  Rule: NFR-PERF-001 Ready to record within 3 seconds

    Scenario: NFR-PERF-001.1 Recording can be started within 3 seconds of opening the app
      When the user opens the app
      Then recording can be started within 3 seconds

  Rule: NFR-PERF-002 Recording starts within 300 ms

    Scenario: NFR-PERF-002.1 Audio is captured within 300 ms of starting
      Given microphone access is granted
      When the user starts recording
      Then audio is captured within 300 ms
