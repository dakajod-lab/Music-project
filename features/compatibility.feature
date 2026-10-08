@r0.1 @nfr
Feature: Compatibility (NFR-CMP)

  Rule: NFR-CMP-002 Screen widths from 360 px to 2560 px

    Scenario Outline: NFR-CMP-002.1 The recorder fits a <width> px wide screen
      Given the screen is <width> px wide
      And the app is open
      Then the page does not scroll sideways
      And the recording controls are visible

      Examples:
        | width |
        | 360   |
        | 768   |
        | 1280  |
        | 2560  |
