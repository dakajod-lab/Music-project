# 05 — Architecture & Decisions

_Status: Collecting decisions. Full architecture is discussed in phase 5._

Decisions are recorded as short **ADRs** (Architecture Decision Records): context, decision, consequences.

## ADR-001: BDD runner = playwright-bdd (TypeScript)
- **Date:** 2026-10-01
- **Context:** Acceptance criteria live in `/features/*.feature` and must run as tests.
  Options were Reqnroll + Playwright for .NET (C#) or playwright-bdd (TypeScript).
- **Decision:** playwright-bdd. The app and all tests use TypeScript.
- **Consequences:**
  - One language and one toolchain (Node) for the app, unit tests and acceptance tests.
  - Step definitions are TypeScript functions instead of C# methods with attributes.
  - The product owner knows Reqnroll; the mapping below helps with the switch.

| Reqnroll (C#) | playwright-bdd (TS) |
|---------------|---------------------|
| `[Binding]` class with `[Given("...")]` methods | `Given('...', async ({ page }) => { ... })` |
| Cucumber expressions / regex in attributes | Cucumber expressions in strings |
| `ScenarioContext` / context injection | Playwright **fixtures** |
| `[BeforeScenario]` / `[AfterScenario]` hooks | `Before` / `After` hooks, or fixtures |
| `@tag` filtering in the test runner | `npx bddgen && npx playwright test --grep @r0.1` |
