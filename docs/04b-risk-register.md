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
| R1 | Overdubbed tracks are offset from the metronome / earlier tracks (latency) | 3 | 3 | **9** | 0.2 | NFR-TIM-001/002 | Latency calibration; automated test that records a known click through fake microphone input and measures the offset |
| R2 | Browser noise suppression harms instrument sound | 3 | 2 | **6** | 0.2 | (noise filter toggle) | Toggle off by default; listening test with real instruments on the reference phone |
| R3 | Mobile browser limits (audio stops in background, storage limits, OEM battery savers on OxygenOS) | 2 | 3 | **6** | 0.1 | REC-003, STO-001 | Manual tests on the reference phone; exploratory charter "phone interruptions" |
| R4 | Recording lost (crash, tab closed, storage full) | 2 | 3 | **6** | 0.1 | REC-003, STO-001 | Incremental saving; automated kill-the-tab test; storage-full simulation |
| R5 | Exported file does not import correctly on the other device / in Ableton | 2 | 3 | **6** | 0.1 | EXP-001 | WAV header validation in unit tests; round-trip tests; manual Ableton check when export changes |
| R6 | Loop timing drifts / touch input lags on the phone | 2 | 2 | **4** | 0.3 | (loops) | Automated scheduling-accuracy tests; touch-latency measurement on the reference phone |
| R7 | Loop library lost or unreadable after an app update | 2 | 3 | **6** | 0.3 | (library) | Data migration tests between versions; library export as backup |
| R8 | **New:** iOS Safari audio quirks break the app for general users | 3 | 1 | **3** | later | NFR-CMP-003 | Tier 2 automated WebKit runs; revisit if iOS users matter |
| R9 | **New:** Microphone permission flow differs between browsers / is blocked | 2 | 3 | **6** | 0.1 | REC-001.3/.4 | Automated tests with permission granted/denied; manual check on the reference phone |

## Workshop questions
_To be discussed one risk at a time._
