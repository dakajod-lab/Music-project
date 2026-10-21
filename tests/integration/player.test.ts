import { beforeEach, describe, expect, it } from 'vitest';
import { Player } from '../../src/core/player/Player';
import { FakeAudioOutput, FakeClock } from '../support/fakes';

let clock: FakeClock;
let speaker: FakeAudioOutput;
let player: Player;
const recording = { samples: new Float32Array(3 * 48_000), sampleRate: 48_000 };

beforeEach(() => {
  clock = new FakeClock();
  speaker = new FakeAudioOutput(clock);
  player = new Player(speaker, clock);
});

describe('PLY-001 playback (core + fake speaker)', () => {
  it('starts stopped, with nothing loaded', () => {
    expect(player.getState()).toEqual({ status: 'stopped', positionMs: 0, durationMs: 0 });
  });

  it('PLY-001.1 plays the given audio from the start and reports the duration', async () => {
    await player.play(recording);
    expect(speaker.played).toEqual([recording.samples]);
    expect(player.getState()).toEqual({ status: 'playing', positionMs: 0, durationMs: 3_000 });
  });

  it('PLY-001.1 the position follows the playback', async () => {
    await player.play(recording);
    clock.advance(1_500);
    expect(player.getState().positionMs).toBe(1_500);
  });

  it('the position never passes the end', async () => {
    await player.play(recording);
    clock.advance(10_000);
    expect(player.getState().positionMs).toBe(3_000);
  });

  it('PLY-001.2 stop stops the speaker and resets the position', async () => {
    await player.play(recording);
    clock.advance(1_000);
    player.stop();
    expect(speaker.playing).toBe(false);
    expect(player.getState()).toMatchObject({ status: 'stopped', positionMs: 0 });
    expect(clock.activeTimers).toBe(0);
  });

  it('PLY-001.3 stops by itself at the end', async () => {
    await player.play(recording);
    speaker.finish();
    expect(player.getState()).toMatchObject({ status: 'stopped', positionMs: 0 });
    expect(clock.activeTimers).toBe(0);
  });

  it('stop while not playing does nothing', () => {
    let calls = 0;
    player.subscribe(() => calls++);
    player.stop();
    expect(calls).toBe(0);
  });

  it('playing again restarts from the start and ignores the old playback ending', async () => {
    await player.play(recording);
    clock.advance(1_000);
    const shorter = { samples: new Float32Array(48_000), sampleRate: 48_000 };
    await player.play(shorter);
    expect(player.getState()).toEqual({ status: 'playing', positionMs: 0, durationMs: 1_000 });
    expect(clock.activeTimers).toBe(1);
  });

  it('notifies listeners and stops notifying after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = player.subscribe(() => calls++);
    await player.play(recording);
    expect(calls).toBeGreaterThan(0);
    unsubscribe();
    const before = calls;
    player.stop();
    expect(calls).toBe(before);
  });
});
