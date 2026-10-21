# Recorder state machine (ADR-007)

_Status: **Agreed** (2026-10-06). Implemented in `src/core/recorder/`._

The recorder is a pure function `transition(state, event) → state` with an explicit table of allowed transitions.
It knows nothing about the browser: adapters (microphone, clock, storage) send it events, and the UI shows its state.

## States
| State | Meaning | Shown to the user |
|-------|---------|-------------------|
| `idle` | Microphone closed. A finished recording may exist. | Start is possible |
| `requestingPermission` | Waiting for the user to answer the browser's microphone prompt. `intent` says why: `record` or `monitor` | Waiting for access |
| `monitoring` | Microphone open to check the input level; nothing is recorded (REC-005.3) | Input level, start or stop checking |
| `confirmingReplace` | A recording exists and the user started a new one (REC-004) | Replace or cancel |
| `recording` | Audio is being captured | Elapsed time, limit, input level |
| `error` | Microphone cannot be used (REC-001.4) | Reason and how to fix it |

## Diagram
```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> requestingPermission: START (no recording)
    idle --> confirmingReplace: START (recording exists)
    idle --> requestingPermission: CHECK_LEVEL (intent monitor)
    requestingPermission --> monitoring: PERMISSION_GRANTED (intent monitor)
    monitoring --> recording: START (no recording)
    monitoring --> confirmingReplace: START (recording exists)
    monitoring --> idle: STOP_CHECK / INTERRUPTED
    confirmingReplace --> requestingPermission: CONFIRM
    confirmingReplace --> idle: CANCEL
    requestingPermission --> recording: PERMISSION_GRANTED
    requestingPermission --> error: PERMISSION_DENIED / NO_MICROPHONE
    recording --> idle: STOP
    recording --> idle: TICK (limit reached)
    recording --> idle: INTERRUPTED
    error --> idle: DISMISS
```

## Transition table
Every state × event combination is defined. **—** means the event is ignored (state unchanged).
These "ignored" cells are tested too: e.g. a double tap on stop must not break anything.

| State ↓ / Event → | START | CONFIRM | CANCEL | GRANTED | DENIED | NO_MIC | TICK | STOP | INTERRUPTED | DISMISS | CHECK_LEVEL | STOP_CHECK |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **idle** | requestingPermission (record), or confirmingReplace if a recording exists | — | — | — | — | — | — | — | — | — | requestingPermission (monitor) | — |
| **confirmingReplace** | — | requestingPermission (record) | idle | — | — | — | — | — | — | — | — | — |
| **requestingPermission** | — | — | — | recording, or monitoring if intent is monitor | error (denied) | error (no mic) | — | — | — | — | — | — |
| **monitoring** | recording, or confirmingReplace if a recording exists | — | — | — | — | — | — | — | idle | — | — | idle |
| **recording** | — | — | — | — | — | — | elapsed += Δ; idle at 5:00 | idle | idle (keep audio) | — | — | — |
| **error** | — | — | — | — | — | — | — | — | — | idle | — | — |

12 events × 6 states = **72 cells → 72 test cases** (state transition testing, test strategy §4).

**Side effects (RecorderController):** entering `requestingPermission` opens the microphone; entering `recording`
starts the timer and keeps samples from that moment; leaving `recording` stops and keeps the audio; leaving
`monitoring` without recording closes the microphone.

## Scope of step 7.4
| Requirement | In 7.4 |
|-------------|--------|
| REC-001.1–.4 Start, stop, permission, microphone unusable | ✅ state machine + UI + microphone adapter |
| REC-002.1 Stop automatically at 5:00 | ✅ tested with a **fake clock** (no 5-minute wait) |
| REC-004 Replace confirmation | ✅ state machine + UI |
| REC-003, REC-005, REC-006, STO, PLY, EXP | Later steps |

## Decisions
| Date | Decision | Reason |
|------|----------|--------|
| 2026-10-06 | Input level before recording (REC-005.3) via a separate "check level" action; the microphone is never opened on app start. | Privacy: no microphone indicator while the app is idle. Recording itself still starts immediately. |
| 2026-10-06 | Hand-written state machine, no library. | Small, readable, every line mutation-tested. |
| 2026-10-06 | 7.4 scope: REC-001 + REC-002 end to end; full state machine unit-tested. | Reviewable PR size. |
| 2026-10-21 | New state `monitoring` and events CHECK_LEVEL / STOP_CHECK for REC-005.3 (step 7.5). Recording from `monitoring` reuses the open microphone; samples from the check are not part of the recording. | Implements the agreed "check level" action (option b). |
