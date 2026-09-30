# 02 — Scope: MVP vs Later

_Status: **Agreed v1.0** (2026-09-30)._

## Persona
**"The Idea Catcher"** (primary user = the product owner)
- Plays instruments and produces in Ableton.
- Ideas come at random times: on the bus, at night, in the middle of practice.
- Wants to capture an idea within seconds, build on it with a simple beat or chords,
  and finish it in Ableton later.
- Frustration: voice memos are messy, have no tempo, and are hard to line up in a DAW.

## Prioritisation method
**MoSCoW** per release:
- **Must**: The release is not usable without it.
- **Should**: Important, but the release still works without it.
- **Could**: Nice to have if time allows.
- **Won't (this time)**: Explicitly deferred. Written down so nobody builds it by accident.

## Feature areas
| Area | Code | Description |
|------|------|-------------|
| Projects | PRJ | Create, open, rename, delete projects; tempo and time signature |
| Recording | REC | Record audio from the microphone into a track |
| Playback | PLY | Play back recordings and projects |
| Metronome | MET | Click track, count-in |
| Tracks | TRK | Multiple tracks, play together, mute, volume, delete |
| Instruments | INS | Built-in drums and piano |
| Loops | LOOP | Create loops (grid / live), place them in a project |
| Library | LIB | Save, reuse, export and import loops |
| Audio processing | AUD | Noise filter toggle, latency compensation |
| Export / Import | EXP | WAV export of tracks; project and library transfer by file |
| Capture mode | CAP | Fast phone flow from opening the app to recording |

## Proposed release plan (for discussion)

### Release 0.1: "Walking skeleton" (the thinnest possible end-to-end slice)
Goal: prove the full pipeline (code → tests → CI → deployed URL) with minimal features.
- Must: Record one audio track in the browser (phone and computer).
- Must: Play it back.
- Must: Export it as WAV.
- Must: Deployed to a public URL with CI running tests.

### Release 0.2: "Multitrack"
- Must: Projects with tempo (BPM) and time signature.
- Must: Metronome with count-in.
- Must: Multiple tracks that play together; overdub while listening.
- Must: Latency compensation, so tracks line up (R1).
- Must: Export all tracks as separate WAVs of the same length, starting at bar 1.
- Must: BPM shown in the export/save dialog.
- Should: Mute and volume per track.
- Should: Noise filter toggle per track (off by default).

### Release 0.3: "Create"
- Must: Drum and piano instruments.
- Must: Create a loop by placing notes on a grid.
- Must: Place loops in a project as tracks.
- Must: Save loops to the library and reuse them.
- Should: Export and import the library as a file.
- Could: Create a loop by playing live, with quantize.

### Release 0.4: "Capture & Transfer" (= MVP complete)
- Must: Capture mode: a fast flow on the phone.
- Must: Export a whole project as one file and import it on another device.
- Should: Create a loop by playing live, with quantize (if not done in 0.3).

### Won't (MVP), candidates for later
- Cloud inbox / upload (Option B), then instant sync.
- Default loop library.
- Shared library between users.
- Native mobile apps.
- Effects, mixing automation.
- MIDI export of loops (wanted later, but not the core appeal: audio recording is).

## Limits (MVP)
| Limit | Value | Note |
|-------|-------|------|
| Tracks per project | 8 | Boundary-tested (8 allowed, 9th refused). |
| Recording length per track | 5 minutes | The app is for ideas, not finished songs. A single constant, easy to change. |

## Look & feel
Visual design is worked out gradually, release by release, after the test structure is in place.
Requirements stay design-neutral (see roadmap conventions).

## Open questions
_None._

## Decision log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-09-30 | Release order 0.1 → 0.4 agreed; walking skeleton first. | Full test/CI/deploy structure in place before the app grows. |
| 2026-09-30 | Audio only. MIDI export of loops moved to "later". | Recording live instruments is the core appeal; MIDI tools already exist. |
| 2026-09-30 | Max 8 tracks per project. | Enough for idea sketches; clear boundary for testing. |
| 2026-09-30 | Max recording length 5 minutes per track (proposed; owner said "can be much lower"). | Ideas, not finished songs. Keeps storage and memory small on phones. |
| 2026-09-30 | Look and feel is designed gradually, after the test structure exists. | Structure before polish. |
