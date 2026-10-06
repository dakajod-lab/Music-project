import { beforeEach, describe, expect, it } from 'vitest';
import { RecorderController } from '../../src/core/recorder/RecorderController';
import { MAX_RECORDING_MS } from '../../src/core/recorder/recorderMachine';
import { FakeAudioInput, FakeClock } from '../support/fakes';

let clock: FakeClock;
let mic: FakeAudioInput;
let recorder: RecorderController;

beforeEach(() => {
  clock = new FakeClock();
  mic = new FakeAudioInput(clock);
  recorder = new RecorderController(mic, clock);
});

async function startRecording() {
  recorder.dispatch({ type: 'START' });
  await recorder.settled();
}

describe('REC-001 record audio (core + fake adapters)', () => {
  it('REC-001.1/.2 records for as long as the user records, then keeps the audio', async () => {
    await startRecording();
    expect(recorder.getState().status).toBe('recording');

    clock.advance(2_000);
    expect(recorder.getState().elapsedMs).toBe(2_000);

    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(recorder.getState()).toMatchObject({ status: 'idle', hasRecording: true, recordingMs: 2_000 });
    expect(recorder.getRecording()?.samples).toHaveLength(2 * 48_000);
  });

  it('REC-001.3 starting asks the microphone (and so the browser) for access', async () => {
    await startRecording();
    expect(mic.startCalls).toBe(1);
  });

  it.each([
    { problem: 'denied' as const, event: 'denied' },
    { problem: 'noMicrophone' as const, event: 'noMicrophone' },
  ])('REC-001.4 microphone problem "$problem" → no recording, error shown', async ({ problem }) => {
    mic.problem = problem;
    await startRecording();
    expect(recorder.getState()).toMatchObject({ status: 'error', error: problem, hasRecording: false });
    clock.advance(1_000);
    expect(recorder.getState().elapsedMs).toBe(0); // the timer never started
  });

  it('stops counting time after the recording stops', async () => {
    await startRecording();
    clock.advance(1_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    clock.advance(10_000);
    expect(recorder.getState().recordingMs).toBe(1_000);
  });
});

describe('REC-002 time limit (core + fake clock)', () => {
  it('REC-002.1 stops automatically at 5:00 and keeps all 5 minutes of audio', async () => {
    await startRecording();
    clock.advance(MAX_RECORDING_MS + 60_000); // a minute past the limit
    await recorder.settled();

    expect(recorder.getState()).toMatchObject({
      status: 'idle',
      stoppedBy: 'limit',
      recordingMs: MAX_RECORDING_MS,
    });
    expect(recorder.getRecording()?.samples).toHaveLength((MAX_RECORDING_MS / 1000) * 48_000);
  });
});

describe('REC-003 interruption (core + fake adapters)', () => {
  it('keeps the audio recorded before the microphone was taken away', async () => {
    await startRecording();
    clock.advance(3_000);
    mic.end();
    await recorder.settled();
    expect(recorder.getState()).toMatchObject({
      status: 'idle',
      stoppedBy: 'interrupted',
      recordingMs: 3_000,
    });
    expect(recorder.getRecording()?.samples).toHaveLength(3 * 48_000);
  });
});

describe('REC-004 replace (core + fake adapters)', () => {
  beforeEach(async () => {
    await startRecording();
    clock.advance(1_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
  });

  it('REC-004.2 confirming deletes the old audio and records new audio', async () => {
    recorder.dispatch({ type: 'START' });
    recorder.dispatch({ type: 'CONFIRM' });
    expect(recorder.getRecording()).toBeNull();
    await recorder.settled();
    clock.advance(2_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(recorder.getRecording()?.samples).toHaveLength(2 * 48_000);
  });

  it('REC-004.3 cancelling keeps the old audio', async () => {
    const old = recorder.getRecording();
    recorder.dispatch({ type: 'START' });
    recorder.dispatch({ type: 'CANCEL' });
    expect(recorder.getRecording()).toBe(old);
    expect(mic.startCalls).toBe(1); // the microphone was not opened again
  });
});

describe('subscriptions', () => {
  it('notifies listeners on every state change and stops after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = recorder.subscribe(() => calls++);
    recorder.dispatch({ type: 'STOP' }); // ignored in idle: no notification
    expect(calls).toBe(0);
    await startRecording();
    expect(calls).toBeGreaterThan(0);
    unsubscribe();
    const before = calls;
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(calls).toBe(before);
  });
});

describe('side effects (found by mutation testing)', () => {
  it('settled() waits for a slow microphone prompt', async () => {
    let answer!: () => void;
    mic.gate = new Promise((resolve) => (answer = resolve));
    recorder.dispatch({ type: 'START' });
    let done = false;
    void recorder.settled().then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    answer();
    await recorder.settled();
    expect(done).toBe(true);
    expect(recorder.getState().status).toBe('recording');
  });

  it('an unexpected microphone error is treated as "no microphone"', async () => {
    mic.unexpectedError = new TypeError('something odd');
    await startRecording();
    expect(recorder.getState()).toMatchObject({ status: 'error', error: 'noMicrophone' });
  });

  it('the clock only runs while recording', async () => {
    expect(clock.activeTimers).toBe(0);
    mic.gate = new Promise(() => {}); // permission prompt never answered
    recorder.dispatch({ type: 'START' });
    expect(recorder.getState().status).toBe('requestingPermission');
    expect(clock.activeTimers).toBe(0);
  });

  it('no timer keeps running after a recording ends', async () => {
    await startRecording();
    expect(clock.activeTimers).toBe(1);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(clock.activeTimers).toBe(0);
  });

  it('notifies listeners when the finished recording becomes available', async () => {
    await startRecording();
    clock.advance(1_000);
    const seen: boolean[] = [];
    recorder.subscribe(() => seen.push(recorder.getRecording() !== null));
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(seen.at(-1)).toBe(true);
  });
});
