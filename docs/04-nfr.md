# 04 — Non-functional Requirements

_Status: **Agreed v1.0** (2026-10-01)._

NFRs describe **how well** the app works, not **what** it does. Each one has a measurable
target and a verification method, so it can be tested.

## Performance (PERF)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-PERF-001 | Time from opening the app to being able to record (app already installed/cached) | ≤ 3 s on the reference phone (stretch goal: ≤ 1.5 s) | Automated measurement (Playwright + performance marks) |
| NFR-PERF-002 | Time from "start recording" to audio being captured | ≤ 300 ms | Automated measurement |

## Timing (TIM), from release 0.2
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-TIM-001 | Offset between an overdubbed track and the metronome, after latency compensation | ≤ 5 ms (≈ 240 samples) | Automated test with a known click signal |
| NFR-TIM-002 | Exported tracks have identical length and start at the same sample | Exact (0 samples) | Automated test on exported files |

## Compatibility (CMP)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-CMP-001 | **Tier 1** (must work; automated + manual on real devices): Chrome on Android (reference: OnePlus, OxygenOS 16) and Chrome on desktop. Latest 2 versions. | 100 % of release scope | Automated runs (Chromium, mobile emulation) + manual check on the reference devices |
| NFR-CMP-003 | **Tier 2** (should work; automated only, failures are reported but do not block a release): Firefox, Edge, Safari (WebKit). | Best effort | Automated cross-browser runs |
| NFR-CMP-002 | Supported screen widths | 360 px (small phone) to 2560 px (large monitor) | Automated layout tests at fixed sizes |

## Reliability (REL)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-REL-001 | Max audio lost on crash or tab close | ≤ 2 s (agreed, see REC-003.1) | Automated test |
| NFR-REL-002 | _Later (not in MVP):_ the app works offline after the first visit | Record, play and export work without a network | Automated test with network disabled |

## Usability (USA)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-USA-001 | Destructive choices (e.g. replacing a recording) are clearly distinguishable from cancelling, and never the default | Agreed | Design review + manual check |

## Accessibility (A11Y)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-A11Y-001 | Accessibility standard | WCAG 2.2 level AA | Automated scan (axe) + manual keyboard/screen reader check |
| NFR-A11Y-002 | All functions can be used with a keyboard on desktop | 100 % of functions | Automated E2E using only the keyboard |

## Privacy & security (SEC)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-SEC-001 | Audio never leaves the device in v1 | No network requests contain audio | Automated network monitoring in E2E tests |
| NFR-SEC-002 | The app is only served over HTTPS (browsers require it for microphone access) | 100 % | Deployment check |
| NFR-SEC-003 | No tracking or analytics (for now) | None | Automated network monitoring |

## Reference devices
| Device | OS / browser | Used for |
|--------|--------------|----------|
| Phone (OnePlus) | OxygenOS 16.0.10 (Android), Chrome | Manual release checks, Capture mode, real microphone tests |
| Computer | Chrome (desktop) | Manual release checks, Studio mode |

## Open questions
_None._

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-10-01 | Tier 1 browsers = Chrome on Android + Chrome on desktop (the owner's devices). Others are Tier 2. | Test effort goes where the primary user is. |
| 2026-10-01 | iOS/Safari is Tier 2 for now. | Not used by the primary user; known audio quirks are a risk for general users later (noted in risk workshop). |
| 2026-10-01 | PERF-001: ≤ 3 s, stretch goal ≤ 1.5 s. | Faster is better for Capture mode, but 3 s is acceptable. |
| 2026-10-01 | TIM-001: ≤ 5 ms accepted. | Below what is audible. |
| 2026-10-01 | Offline support moved to "later". | Network is normally available. |
| 2026-10-01 | Accessibility target WCAG 2.2 AA. | Industry standard; good practice for testing. |
| 2026-10-01 | No analytics for now. | Privacy; not needed for a personal-first app. |
