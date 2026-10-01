@r0.1
Feature: Playback (PLY)

  Rule: PLY-001 Play back a recording
    As the Idea Catcher, I want to listen to my recording, so that I can judge the idea.

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

    Scenario: PLY-001.4 A stopped recording can be played
      Given the user has just stopped a recording
      When the user starts playback
      Then the new recording plays
