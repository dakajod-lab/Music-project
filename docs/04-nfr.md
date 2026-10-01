# 04 — Non-functional Requirements

_Status: **Proposal v0.1**. Values marked ❓ need the product owner's decision._

NFRs describe **how well** the app works, not **what** it does. Each one has a measurable
target and a verification method, so it can be tested.

## Performance (PERF)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-PERF-001 | Time from opening the app to being able to record (app already installed/cached) | ≤ 3 s on a mid-range phone ❓ | Automated measurement (Playwright + performance marks) |
| NFR-PERF-002 | Time from "start recording" to audio being captured | ≤ 300 ms ❓ | Automated measurement |

## Timing (TIM), from release 0.2
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-TIM-001 | Offset between an overdubbed track and the metronome, after latency compensation | ≤ 5 ms (≈ 240 samples) ❓ | Automated test with a known click signal |
| NFR-TIM-002 | Exported tracks have identical length and start at the same sample | Exact (0 samples) | Automated test on exported files |

## Compatibility (CMP)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-CMP-001 | Supported browsers | Latest 2 versions of Chrome (desktop + Android), Safari (macOS + iOS), Firefox, Edge ❓ | Automated cross-browser runs + manual check on real devices |
| NFR-CMP-002 | Supported screen widths | 360 px (small phone) to 2560 px (large monitor) | Automated layout tests at fixed sizes |

## Reliability (REL)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-REL-001 | Max audio lost on crash or tab close | ≤ 2 s (agreed, see REC-003.1) | Automated test |
| NFR-REL-002 | The app works offline after the first visit | Record, play and export work without a network ❓ | Automated test with network disabled |

## Usability (USA)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-USA-001 | Destructive choices (e.g. replacing a recording) are clearly distinguishable from cancelling, and never the default | Agreed | Design review + manual check |

## Accessibility (A11Y)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-A11Y-001 | Accessibility standard | WCAG 2.2 level AA ❓ | Automated scan (axe) + manual keyboard/screen reader check |
| NFR-A11Y-002 | All functions can be used with a keyboard on desktop | 100 % of functions | Automated E2E using only the keyboard |

## Privacy & security (SEC)
| ID | Requirement | Target | Verified by |
|----|-------------|--------|-------------|
| NFR-SEC-001 | Audio never leaves the device in v1 | No network requests contain audio | Automated network monitoring in E2E tests |
| NFR-SEC-002 | The app is only served over HTTPS (browsers require it for microphone access) | 100 % | Deployment check |
| NFR-SEC-003 | No tracking or analytics ❓ | None | Automated network monitoring |

## Open questions
1. **Devices:** Which phone and computer (and browsers) do you use? These become our "must work" reference devices.
2. **PERF-001:** Is ≤ 3 s from opening to recording OK, or should it be faster (it is the core of Capture mode)?
3. **TIM-001:** Is ≤ 5 ms acceptable? (Most people cannot hear offsets under ~10 ms.)
4. **REL-002 offline:** Should the app work without internet (on the subway, in the woods)?
5. **A11Y-001:** WCAG 2.2 AA as target?
6. **SEC-003:** No analytics at all, or simple anonymous usage statistics?
