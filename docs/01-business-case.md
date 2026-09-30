# 01 — Business Case & Vision

_Status: Draft v1 — agreed direction, details open (see Open questions)._

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
| **Capture** | Phone | Record on the fly. Minimal steps from opening the app to recording. |
| **Studio** | Computer (web app) | Deeper construction: multiple tracks, metronome, built-in sounds, export. |

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
| R5 | **Transfer between devices** without live sync still needs *some* way to move ideas. | G2 depends on it. | See Open question 1. |

## Open questions
1. **How does an idea get from phone to computer in v1** (without instant sync)? See the options in the discussion.
2. Built-in sounds: which kind? (drum loops, one-shot samples, a simple synth, a drone/tuning note?)
3. Export format for Ableton: WAV assumed. Which sample rate/bit depth? Should the tempo (BPM) be in the file name?
4. Noise filtering: always on, off by default, or a per-track toggle?

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-09-30 | Primary user is the product owner; general users are secondary. | Keeps scope focused; real feedback from a real user. |
| 2026-09-30 | No instant/live sync in v1. | Large complexity (auth, conflicts, offline). Planned for later. |
| 2026-09-30 | One responsive web app with Capture (phone) and Studio (computer) modes. | One codebase to test; works everywhere. |
| 2026-09-30 | Multitrack + metronome + built-in sounds are in the product vision. | Core to the Studio workflow. Whether each is in MVP is decided in phase 2. |
| 2026-09-30 | Export separate tracks for Ableton. | Main output of the workflow. |
| 2026-09-30 | Code coverage is one quality signal among several, not the goal. | Coverage shows code was executed, not that it was verified. |
