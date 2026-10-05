# 05 — Architecture & Decisions

_Status: **Proposal**. ADR-001 is agreed; ADR-002 to ADR-008 are proposals for discussion._

## Overview

```mermaid
flowchart TB
    subgraph Browser["Browser (phone or computer)"]
        UI["UI layer<br/>(screens, components)"]
        subgraph Core["Core (pure TypeScript, no browser APIs)"]
            SM["Recorder state machine"]
            WAV["WAV encoder"]
            LVL["Level & clipping detection"]
            LIM["Time limit / rules"]
        end
        subgraph Adapters["Adapters (wrap browser APIs)"]
            MIC["Microphone<br/>(Web Audio + AudioWorklet)"]
            STO["Storage<br/>(IndexedDB)"]
            WL["Screen wake lock"]
            FILE["File export<br/>(download / share)"]
        end
    end
    HOST["Static hosting over HTTPS<br/>(no backend in v1)"]

    UI --> SM
    SM --> WAV & LVL & LIM
    SM --> MIC & STO & WL & FILE
    HOST -. serves app files .-> Browser
```

**Idea in one sentence:** all logic that can be tested without a browser lives in **Core**; everything that talks
to the browser or device is a thin **Adapter** with an interface that tests can replace with a fake.

## How the architecture maps to test levels

| Layer | What is tested | Tool | Speed | Share of tests |
|-------|----------------|------|-------|----------------|
| Core | Rules, state transitions, WAV bytes, clipping detection | Vitest (unit) | ms | Most |
| Core + fake adapters | Whole flows (record → interrupt → recover) without a browser | Vitest (integration) | ms | Many |
| Adapters | Real browser APIs behave as we assume | Vitest browser mode / Playwright | s | Few |
| Whole app | Feature files (`/features`) in a real browser with fake microphone | playwright-bdd (acceptance) | s | Every scenario |
| Real devices | Assumptions about the phone, sound quality | Exploratory charters | min | Per P5 |

Extra quality signals: **mutation testing** (Stryker) on Core, **accessibility scan** (axe) in acceptance tests,
TypeScript strict mode + ESLint as static checks.

---

## ADR-001: BDD runner = playwright-bdd (TypeScript) — ✅ agreed
- **Date:** 2026-10-01
- **Context:** Acceptance criteria live in `/features/*.feature` and must run as tests.
  Options were Reqnroll + Playwright for .NET (C#) or playwright-bdd (TypeScript).
- **Decision:** playwright-bdd. The app and all tests use TypeScript.
- **Consequences:** One language and one toolchain (Node). Step definitions are TypeScript functions.

| Reqnroll (C#) | playwright-bdd (TS) |
|---------------|---------------------|
| `[Binding]` class with `[Given("...")]` methods | `Given('...', async ({ page }) => { ... })` |
| Cucumber expressions / regex in attributes | Cucumber expressions in strings |
| `ScenarioContext` / context injection | Playwright **fixtures** |
| `[BeforeScenario]` / `[AfterScenario]` hooks | `Before` / `After` hooks, or fixtures |
| `@tag` filtering in the test runner | `npx bddgen && npx playwright test --grep @r0.1` |

## ADR-002: Client-only web app (PWA), no backend in v1 — proposal
- **Context:** No sync in v1 (manual file transfer), audio must stay on the device (NFR-SEC-001), no analytics.
- **Decision:** The app runs completely in the browser and is served as static files over HTTPS.
- **Consequences:** No server, database or login to build, host or test. A backend can be added later (cloud inbox, Option B).
  Installable as a PWA (home-screen icon on the phone) to support fast start (NFR-PERF-001).

## ADR-003: TypeScript + Vite + UI framework — proposal, ❓ framework to choose
- **Context:** One language for app and tests (ADR-001). Fast start on the phone (≤ 3 s, stretch 1.5 s).
- **Decision:** TypeScript (strict) and Vite as build tool. UI framework: see options.

| Option | For | Against |
|--------|-----|---------|
| **React** | Most used; most test tooling and job-market relevance (React Testing Library) | Larger bundle |
| **Svelte** | Small and fast; simple code | Smaller ecosystem |
| **Preact** | React API with a tiny bundle | Some React libraries need adapting |

- **Recommendation:** React. The UI is small, so bundle size is not a real problem, and the testing skills transfer to most jobs.

## ADR-004: Capture raw audio with Web Audio API + AudioWorklet (not MediaRecorder) — proposal
- **Context:** Browsers offer two ways to record:
  - `MediaRecorder` is simple, but gives **compressed** audio (Opus/WebM) and imprecise timing.
  - **Web Audio API with an AudioWorklet** gives the **raw samples** as they arrive.
- **Decision:** AudioWorklet, raw samples.
- **Consequences:**
  - Lossless audio, so a true 24-bit WAV is possible (EXP-001, R5).
  - Level meter and clipping detection work on the same samples (REC-005, R11).
  - Audio can be saved in small chunks while recording (REC-003, ≤ 2 s loss).
  - Exact sample positions, needed for track alignment in 0.2 (R1).
  - More code than MediaRecorder; the WAV encoder must be written and tested (Core, unit tests).

## ADR-005: Storage = IndexedDB, saved in chunks of ~1 s — proposal
- **Context:** Recordings must survive reload/close/crash (STO-001, REC-003) with ≤ 2 s loss.
- **Decision:** Store audio in IndexedDB in chunks of about 1 second while recording. Ask the browser for persistent
  storage (`navigator.storage.persist()`, R12).
- **Consequences:** Worst case after a crash is about 1 s lost, within the 2 s limit. Recovery on start-up must
  rebuild a recording from its chunks (tested with crash simulation, R3/R4).

## ADR-006: Ports & adapters for testability — proposal
- **Context:** Many risks (R3, R4, R9, R11, R12) depend on browser/device events that tests must be able to trigger.
- **Decision:** Core logic never calls browser APIs directly. It talks to interfaces ("ports"):
  `AudioInput`, `RecordingStore`, `WakeLock`, `FileExporter`, `Clock`. Real implementations ("adapters") wrap the browser;
  tests use fakes.
- **Consequences:** Most behaviour can be tested in milliseconds without a browser. A fake `Clock` makes the
  5-minute limit testable without waiting 5 minutes.

## ADR-007: Recorder as an explicit state machine — proposal
- **Context:** Recording has many states and events (idle, asking permission, recording, interrupted, full storage, ...).
  Bugs hide in unexpected transitions.
- **Decision:** Model the recorder as an explicit state machine with a table of allowed transitions.
- **Consequences:** Enables **state transition testing**: every state × event combination can be tested, including
  invalid ones (e.g. "stop" while idle). The state diagram doubles as documentation.

## ADR-008: Hosting = Cloudflare Pages (or Netlify), deployed from GitHub Actions — proposal, ❓
- **Context:** The repository is **private**. GitHub Pages requires a paid plan for private repositories.
  Microphone access requires HTTPS (NFR-SEC-002).
- **Decision:** Cloudflare Pages (free, HTTPS, works with private repos). Netlify is an equivalent alternative.
- **Consequences:** Every pull request gets its own **preview URL**, so a change can be tested on the real phone
  before it is merged. CI runs all tests before deploying (quality gate).
