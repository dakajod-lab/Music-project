@r0.1 @nfr
Feature: Accessibility (NFR-A11Y)

  Rule: NFR-A11Y-001 WCAG 2.2 level AA
    Automated scan with axe. Manual keyboard and screen reader checks are part of the exploratory charters.

    Scenario: NFR-A11Y-001.1 Start page has no serious accessibility violations
      Given the app is open
      Then there are no serious or critical accessibility violations
