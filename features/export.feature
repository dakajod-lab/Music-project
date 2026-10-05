@r0.1
Feature: Export (EXP)

  Rule: EXP-001 Export as WAV
    As the Idea Catcher, I want to export my recording as WAV, so that I can use it in Ableton.

    Scenario: EXP-001.1 Export
      Given a recording exists
      When the user exports it
      Then a 48 kHz / 24-bit mono WAV file is saved
      And it has the same length and audio as the recording

    Scenario: EXP-001.2 Nothing to export
      Given no recording exists
      Then export is not available

    # Run only when the impact analysis shows that export or audio encoding changed.
    @manual
    Scenario: EXP-001.3 File imports into Ableton
      Given a WAV file exported by the app
      When it is imported into Ableton Live
      Then it imports without errors or warnings
