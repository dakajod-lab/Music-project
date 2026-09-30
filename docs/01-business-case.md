# 01 — Business Case & Vision

_Status: Draft v2 — agreed direction, details open (see Open questions)._

## Problem statement
Musical ideas (melodies, riffs, rhythms) come at random moments. Capturing them quickly
on a phone is easy with a voice memo, but getting them into a usable shape for further
work in a DAW (Ableton) is clumsy: the files end up scattered, have no tempo information,
and there is no simple way to layer a second idea on top before sitting down at the computer.

## Vision
> Capture a musical idea on your phone in seconds, build on it in the browser on your
> computer with multiple tracks and a metronome, and export clean, aligned tracks straight into Ableton.

## Product concept: two modes, one app
| Mode | Primary device | Purpose |
|------|----------------|---------|
| **Capture** | Phone | Record on the fly with minimal steps. Simple music creation is also possible: build a drum or piano pattern and record over it. |
| **Studio** | Computer (web app) | Deeper construction: multiple tracks, metronome, built-in instruments, pattern library, export. |

Both modes are part of the same web application (responsive), not two separate apps.
Both modes are available on both devices; the device only determines which mode is emphasised.

## Target users
- **Primary (v1):** The product owner. A musician who uses Ableton and wants a fast idea-capture → DAW workflow.
- **Secondary (later):** Anyone who wants a simple, general-purpose multitrack recorder in the browser.

Design decisions favour the primary user. The app should not become complex for the secondary user.

## Goals / success criteria
### Product goals
- G1: From opening the app on a phone to recording should take very few steps (target to be quantified in NFRs).
- G2: An idea recorded on the phone can be opened in Studio mode on the computer.
- G3: A project with multiple tracks can be recorded against a metronome.
- G4: Tracks can be exported as separate audio files that line up correctly when imported into Ableton.
- G5: Simple music can be created in the app on both phone and computer with built-in instruments
  (drums, piano). No pre-made loops; the user builds their own.
- G6: Loops that the user creates can be saved to a personal library and reused in other projects.

### Learning / quality goals (equally important)
- Q1: Every requirement is traceable to at least one test (requirement ID → test).
- Q2: Quality is assessed with several signals, not only code coverage:
  requirement coverage, risk coverage, mutation score, defect log, and results of exploratory testing.
- Q3: Quality gates are enforced automatically in CI before deployment.
- Q4: The product owner takes part in every decision. Nothing is built without an agreed requirement.

## Non-goals (v1)
- Instant / real-time sync between devices (a later version may add it).
- Real-time collaboration between multiple users.
- A full DAW (effects chains, MIDI editing, mixing automation). Ableton does this.
- Native iOS/Android apps (the web app / PWA comes first).

## Glossary (working definitions — to be confirmed)
| Term | Meaning |
|------|---------|
| **Project** | One musical idea: a set of tracks sharing one tempo (BPM) and time signature. |
| **Track** | One layer of a project: either recorded audio or a loop played by a built-in instrument. |
| **Instrument** | A built-in sound source: **drums** or **piano** (v1). |
| **Loop** | A short musical pattern the user creates with an instrument. Can be saved to the library and reused. |
| **Library** | The user's personal collection of saved loops. |
| **Capture / Studio** | The two modes of the app (see Product concept). |

## Constraints
- Must work on phone and computer (modern mobile and desktop browsers).
- Learning project: prefer free tooling or free tiers.

## Key risks (initial — to become the basis of risk-based testing)
| ID | Risk | Why it matters | Early idea |
|----|------|----------------|------------|
| R1 | **Recording latency / track misalignment.** Overdubbed tracks drift or are offset compared with the metronome or earlier tracks. | Ruins multitrack and Ableton export (G3, G4). | Latency calibration; automated alignment tests with known signals. |
| R2 | **Browser noise suppression harms music.** Browser audio settings are tuned for speech and can make instruments sound worse. | "Filter bad sound" might do the opposite of what we want. | Make processing configurable; test with real instrument recordings. |
| R3 | **Mobile browser limits** (iOS Safari audio, backgrounding, storage limits). | Capture mode is the core of the phone use case. | Early device testing matrix; spike in phase 5. |
| R4 | **Data loss.** A recording is lost because of an interruption, a full disk, or a closed tab. | An idea that is lost cannot be recorded again. | Incremental saving; test interrupted recordings. |
| R5 | **Transfer between devices** by manual file transfer: an exported file might not import correctly on the other device (format, browser, OS differences). | G2 depends on it. | Round-trip tests: export on device A, import on device B, compare. |
| R6 | **Timing of loops and instruments.** Loops drift away from the metronome, or touch input on the phone lags so notes land late. | Makes the phone creation features unusable and breaks alignment in exports. | Automated timing tests on scheduled notes; measure touch-to-sound latency on real devices. |
| R7 | **Library data loss or corruption.** Saved loops disappear (browser storage cleared) or can no longer be loaded after an app update. | The user builds up the library over time, so losing it is costly. | Library backup/export; migration tests between app versions. |

## Open questions
1. **How is a loop created?** (a) programming notes on a grid (step sequencer / piano roll), (b) playing live on on-screen pads/keys while it records, or (c) both?
2. Is the loop library shared between phone and computer? (Without sync, this would also mean manual transfer.)
3. Export: WAV assumed. Which sample rate/bit depth? (Suggestion: 48 kHz / 24-bit, a common Ableton default.)
4. Noise filter toggle: default on or off? Per track or per project?
5. Is a default loop library needed? It is noted for a later version, not v1.

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-09-30 | Primary user is the product owner; general users are secondary. | Keeps scope focused; real feedback from a real user. |
| 2026-09-30 | No instant/live sync in v1. | Large complexity (auth, conflicts, offline). Planned for later. |
| 2026-09-30 | One responsive web app with Capture (phone) and Studio (computer) modes. | One codebase to test; works everywhere. |
| 2026-09-30 | Multitrack + metronome + built-in sounds are in the product vision. | Core to the Studio workflow. Whether each is in MVP is decided in phase 2. |
| 2026-09-30 | Export separate tracks for Ableton. | Main output of the workflow. |
| 2026-09-30 | Code coverage is one quality signal among several, not the goal. | Coverage shows code was executed, not that it was verified. |
| 2026-09-30 | Capture mode (phone) also includes simple music creation, not only recording. | Ideas are often rhythmic or harmonic, not only melodic. |
| 2026-09-30 | Built-in instruments for v1: drums and piano. No pre-made loops; the user creates their own. | Keeps sound content small and keeps the focus on the user's own ideas. |
| 2026-09-30 | User-created loops can be saved and reused (library). Default loops are deferred to a later version. | Reuse is valuable; default content is not needed to prove the workflow. |
| 2026-09-30 | Noise filtering is a toggle, not always on. | Browser noise suppression is tuned for speech and may harm instruments (R2). |
| 2026-09-30 | Device transfer in v1 = manual file transfer (Option A). Cloud inbox (Option B) is the first candidate after the MVP. | Simplest working path; B adds auth and API work later. |
| 2026-09-30 | BPM is not in the exported file name, but it is shown in the UI when saving/exporting. | File names stay clean; the user still sees the tempo to set it in Ableton. |
