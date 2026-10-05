# 04b — Risk Register (Risk Workshop)

_Status: **Workshop in progress**. Scores below are Claude's first proposal. The product owner scores too, then we agree._

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
| R3 | Mobile browser limits (audio stops in background, storage limits, OEM battery savers on OxygenOS) | 2 | 3 | **6** | 0.1 | REC-003, STO-001 | Manual tests on the reference phone; exploratory charter "phone interruptions" |
| R4 | Recording lost (crash, tab closed, storage full) | 2 | 3 | **6** | 0.1 | REC-003, STO-001 | Incremental saving; automated kill-the-tab test; storage-full simulation |
| R5 | Exported file does not import correctly on the other device / in Ableton | 2 | 3 | **6** | 0.1 | EXP-001 | WAV header validation in unit tests; round-trip tests; manual Ableton check when export changes |
| R6 | Loop timing drifts / touch input lags on the phone | 2 | 2 | **4** | 0.3 | (loops) | Automated scheduling-accuracy tests; touch-latency measurement on the reference phone |
| R7 | Loop library lost or unreadable after an app update | 2 | 3 | **6** | 0.3 | (library) | Data migration tests between versions; library export as backup |
| R8 | **New:** iOS Safari audio quirks break the app for general users | 3 | 1 | **3** | later | NFR-CMP-003 | Tier 2 automated WebKit runs; revisit if iOS users matter |
| R10 | **New:** Bluetooth headphones add 100–300 ms of latency, which makes overdubbing practically impossible | 2 | 2 | **4** | 0.2 | NFR-TIM-001 | Known limitation in v1. Exploratory test with Bluetooth headphones on the reference phone. Warning to the user = future feature |
| R9 | **New:** Microphone permission flow differs between browsers / is blocked | 2 | 3 | **6** | 0.1 | REC-001.3/.4 | Automated tests with permission granted/denied; manual check on the reference phone |

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

## Future features from the risk workshop
| Feature | From risk |
|---------|-----------|
| Warn the user when Bluetooth audio output is detected | R10 |
