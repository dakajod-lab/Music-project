# 04b — Risk Register (Risk Workshop)

_Status: **Agreed v1.0** (2026-10-05). Living document: risks for later releases (⏳) are reviewed when those releases are planned._

## Scoring
- **Likelihood (L):** 1 = unlikely · 2 = possible · 3 = likely
- **Impact (I):** 1 = annoying · 2 = a feature is unusable · 3 = an idea is lost or the core workflow breaks
- **Risk score = L × I** (1–9). Score drives test effort:

| Score | Priority | Test approach |
|-------|----------|---------------|
| 6–9 | **High** | Automated tests at several levels + exploratory testing + manual check on reference devices every release |
| 3–4 | **Medium** | Automated tests at the most suitable level + exploratory testing when the area changes |
| 1–2 | **Low** | Basic automated coverage; tested when touched |

## Register
| ID | Risk | L | I | Score | Release | Requirements affected | Mitigation & test ideas |
|----|------|---|---|-------|---------|----------------------|-------------------------|
| R1 ✅ | Overdubbed tracks are offset from the metronome / earlier tracks (latency) | 3 | 3 | **9** | 0.2 | NFR-TIM-001/002 | Latency calibration; automated test that records a known click through fake microphone input and measures the offset |
| R2 ✅ | Browser audio processing (noise suppression, echo cancellation, auto gain) harms instrument sound | 3 | 2 | **6** | 0.2 | (noise filter toggle) | All processing off by default; toggle enables noise suppression only. Automated check that settings are applied + exploratory charter [CH-001](charters/CH-001-audio-processing.md) |
| R3 ✅ | Mobile browser limits (audio stops in background, storage limits, OEM battery savers on OxygenOS) | 2 | 3 | **6** | 0.1 | REC-003, STO-001 | Manual tests on the reference phone; exploratory charter "phone interruptions" |
| R4 ✅ | Recording lost (crash, tab closed, storage full) | 2 | 3 | **6** | 0.1 | REC-003, STO-001 | Incremental saving; automated kill-the-tab test; storage-full simulation |
| R5 ✅ | Exported file does not import correctly on the other device / in Ableton | 2 | 3 | **6** | 0.1 | EXP-001 | WAV header validation in unit tests; round-trip tests; manual Ableton check when export changes |
| R6 ⏳ | Loop timing drifts / touch input lags on the phone | 2 | 2 | **4** | 0.3 | (loops) | Automated scheduling-accuracy tests; touch-latency measurement on the reference phone |
| R7 ⏳ | Loop library lost or unreadable after an app update | 2 | 3 | **6** | 0.3 | (library) | Data migration tests between versions; library export as backup |
| R8 ⏳ | **New:** iOS Safari audio quirks break the app for general users | 3 | 1 | **3** | later | NFR-CMP-003 | Tier 2 automated WebKit runs; revisit if iOS users matter |
| R10 | **New:** Bluetooth headphones add 100–300 ms of latency, which makes overdubbing practically impossible | 2 | 2 | **4** | 0.2 | NFR-TIM-001 | Known limitation in v1. Exploratory test with Bluetooth headphones on the reference phone. Warning to the user = future feature |
| R11 ✅ | Clipping / distortion: phone microphones distort with loud instruments close by; often noticed only afterwards | 3 | 3 | **9** | 0.1 | REC-005 | Input level + clipping indicator (REC-005); unit tests for clipping detection; automated test with a clipped test file as fake mic input; exploratory charter (loud instruments) |
| R12 ✅ | Phone storage full, or the browser deletes stored recordings when space is low | 2 | 3 | **6** | 0.1 | STO-001.2 | Warning when storage is full (STO-001.2); ask the browser to keep storage persistent. Owner: warning is enough |
| R9 ✅ | **New:** Microphone permission flow differs between browsers / is blocked | 2 | 3 | **6** | 0.1 | REC-001.3/.4 | Automated tests with permission granted/denied; manual check on the reference phone |

## Risk deep-dives

### R1: Track offset (latency) — ✅ agreed, score 9
**Why it matters:** Latency makes apps like this unusable (owner).

**Where latency comes from:**
| Source | Typical size | Notes |
|--------|--------------|-------|
| Input latency (mic → app) | 5–40 ms | Varies by device and browser |
| Output latency (app → speaker/headphones) | 5–40 ms wired, 100–300 ms Bluetooth | See R10 |
| Browser audio buffers | 3–20 ms | Browser reports part of this, not all |

When the user overdubs, they hear the earlier track *late* (output latency) and their playing reaches the app *late* (input latency).
The new track therefore ends up behind the beat by roughly input + output latency.

**Mitigation:**
1. Read the latency values the browser reports, and correct recordings by that amount.
2. Offer a **calibration**: the app plays a click and records it, and the measured delay is the correction value.
3. Store the correction per device.

**Test approach (high priority):**
- *Unit:* the alignment calculation (shift by N samples) with known inputs.
- *Integration (automated):* fake microphone input with a known click at a known position, then assert the recorded click
  lands within 5 ms (NFR-TIM-001).
- *Manual (each release from 0.2):* record against the metronome on the reference phone and computer, then check alignment in Ableton.
- *Exploratory:* wired vs Bluetooth headphones, phone speaker, external USB mic.

**Decision:** Score 9 agreed. Bluetooth noted as separate risk R10. A Bluetooth warning is a future feature.

### R2: Audio processing harms instrument sound — ✅ agreed, score 6
**Why it happens:** Browser processing is tuned for speech. Noise suppression cuts sustained notes,
echo cancellation removes the metronome and parts of the instrument, auto gain removes dynamics.

**Mitigation (decided):**
- Noise suppression, echo cancellation and auto gain are **all off by default**.
- The per-track noise filter toggle turns on **noise suppression only**.

**Test approach:**
- *Automated:* the settings the browser actually applied match what the app asked for
  (filter off → all three off; filter on → only noise suppression on).
- *Exploratory acceptance test:* charter [CH-001](charters/CH-001-audio-processing.md) with concrete observations.
  Run before a release when the impact analysis shows a change to audio processing or the input pipeline.
- **No** manual test step of the type "verify that it sounds OK": it has no clear pass/fail and gives no information.

**Decision:** Impact 2 agreed (the user can always record again).

### R11: Clipping / distortion — ✅ agreed, score 9
**Why it matters:** If recordings are distorted, nobody will use the app (owner). Impact raised to 3.

**Interaction with R2:** turning auto gain *off* (R2) makes clipping *more* likely, because nothing turns the level down.
A browser app cannot change the phone's hardware microphone gain, so the user has to react (move the phone away or play softer).
That is why the user must **see** the level while recording.

**Mitigation:** REC-005 in release 0.1: input level and clipping indicator.

**Test approach (high priority):**
- *Unit:* clipping detection with known sample buffers (silence, normal level, full-scale, a single peak).
- *Automated E2E:* fake microphone input with a deliberately clipped test file → the clipping indicator appears;
  a clean test file → it does not.
- *Exploratory:* loud instruments (piano close up, drums, amp) on the reference phone; charter to be written in phase 6.

### R12: Storage full / data evicted — ✅ agreed, score 6
**Decision:** A warning is enough (STO-001.2). Cheap extra mitigation: ask the browser to mark the app's storage as persistent,
so it is not deleted automatically when space is low.

### R3: Phone limits (background, lock, calls, battery saver) — ✅ agreed, score 6
**Mitigation:** Screen stays on while recording (REC-006). Audio before an interruption is kept (REC-003).

**Test approach: two layers.**
The app's *reaction* to an interruption can be simulated and automated.
Whether the *real phone* actually sends those signals, and when, can only be checked on the device.

| Situation | What the app actually sees | Automated simulation (Playwright / Chrome DevTools Protocol) |
|-----------|----------------------------|--------------------------------------------------------------|
| Switch to another app | Page becomes hidden (`visibilitychange`) | Force visibility to hidden and fire the event |
| Battery saver freezes the tab | Page is frozen, then maybe discarded | `Page.setWebLifecycleState: frozen`; close and reopen the page |
| Battery saver kills the tab / crash | Page is gone, app restarts | Crash the page (`Page.crash`), reopen, check ≤ 2 s loss (REC-003) |
| Phone call takes the microphone | Microphone track ends | Fire an `ended` event on the fake microphone track |
| Slow phone in power-save mode | Less CPU | CPU throttling (`Emulation.setCPUThrottlingRate`) |
| Storage almost full (R12) | Storage quota exceeded | Override the storage quota (`Storage.overrideQuotaForOrigin`) |
| Screen lock (REC-006) | Wake lock requested / released | Check that the wake lock is active while recording |

**Design consequence:** browser APIs (microphone, wake lock, storage) are wrapped in small adapters,
so tests can inject events. This is called designing for testability; it is decided in phase 5.

**Manual layer:** exploratory charter CH-002 "Phone interruptions" on the reference phone. It checks the
*assumptions* in the table above: does OxygenOS really fire these signals, and is the recording handled as in the automated tests?

**Possible later step:** run tests in an Android emulator, which can simulate calls, a low battery and power-save (Doze) mode
with `adb` commands. It is real Android Chrome, but not OxygenOS.

### R4: Recording lost — ✅ agreed, score 6
Covered by REC-003, STO-001, R3's automated simulations (crash, freeze, storage quota) and charter CH-002. No extra measures.

### R5: Export does not import correctly — ✅ agreed, score 6
Export is **mono** (phone microphones are mono; stereo only doubles the size).
Tests: unit test parses the WAV header (48 kHz, 24-bit, mono, length); round-trip test compares exported samples with the recording;
manual Ableton check (`@manual`, EXP-001.3) when the impact analysis requires it.

### R9: Microphone permission flow — ✅ agreed, score 6
Tests: Playwright grants/denies permission per test (REC-001.3/.4), permission withdrawn while the app is open,
app opened without HTTPS. Manual check on the reference phone in the first acceptance test (P5).

### Workshop summary
Owner: *"The main focus is ease of use and quick recording with high enough quality to play with in Ableton. The risks cover this well."*

### R6, R7, R8 — ⏳ provisional
Scores accepted as they stand. Reviewed in depth when the release they belong to is planned (0.3 / later).

## Future features from the risk workshop
| Feature | From risk |
|---------|-----------|
| Warn the user when Bluetooth audio output is detected | R10 |
