# CH-001: Audio processing and the noise filter

_Exploratory test charter. Linked risk: **R2**. Linked requirements: noise filter toggle (0.2)._

## Charter
> **Explore** recording of real instruments with the noise filter on and off
> **with** the reference phone, a piano (or another instrument with long sustained notes), and wired headphones
> **to discover** whether the audio processing changes the sound of the instrument in ways a musician would not accept.

## When to run (acceptance test before release)
Run when the impact analysis for a release shows a change to any of:
- the noise filter or the other audio processing settings
- the audio input pipeline (microphone setup, sample rate, buffering)
- the reference phone's OS or Chrome major version

## Setup
- Same instrument, same position, same room for every take.
- Record each take twice: **filter off** and **filter on**. Export both and compare them side by side (e.g. in Ableton).

## Things to look for
Each item is an observation with a clear yes/no answer. "Sounds OK" is not an acceptable result.

| # | Play this | Observe | Expected with filter **off** |
|---|-----------|---------|------------------------------|
| 1 | One long sustained note until it fades | Does the fade-out end abruptly or get cut? | Fades naturally to silence |
| 2 | Very soft passage, then very loud passage | Is the difference in loudness preserved? | Soft stays soft, loud stays loud (no auto gain) |
| 3 | Short, sharp notes (staccato / percussive) | Are the starts of the notes (attacks) blunted or missing? | Attacks are intact |
| 4 | Play along with the metronome through the **phone speaker** | Is the metronome audible in the recording? | Yes, it is audible (no echo cancellation; this is expected) |
| 5 | Record with filter **on** in a noisy room (fan, traffic) | Is the background noise reduced? | (Filter on) noise is reduced |
| 6 | Toggle the filter between two takes | Does the new setting apply to the next take? | Yes |

## Session report (fill in per run)
| Field | Value |
|-------|-------|
| Date / tester | |
| App version / build | |
| Device / OS / Chrome version | |
| Duration | |
| Observations 1–6 (pass / fail + note) | |
| Bugs found (IDs) | |
| New questions / risks | |
