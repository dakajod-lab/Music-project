import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLIPPING_HOLD_MS,
  FULL_RECORDING_BYTES,
  RecorderController,
  SAVE_INTERVAL_MS,
} from '../../src/core/recorder/RecorderController';
import { MAX_RECORDING_MS } from '../../src/core/recorder/recorderMachine';
import { FakeAudioInput, FakeClock, FakeLifecycle, FakeRecordingStore } from '../support/fakes';

let clock: FakeClock;
let mic: FakeAudioInput;
let recorder: RecorderController;
let store: FakeRecordingStore;
let lifecycle: FakeLifecycle;

beforeEach(() => {
  clock = new FakeClock();
  mic = new FakeAudioInput(clock);
  store = new FakeRecordingStore();
  lifecycle = new FakeLifecycle();
  recorder = new RecorderController({ audioInput: mic, clock, store, lifecycle });
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
    expect(clock.activeTimers).toBeGreaterThan(0); // timer, saving and the fake microphone's blocks
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

describe('REC-005 input level (core + fake adapters)', () => {
  it('REC-005.1 reports the peak of the latest block while recording', async () => {
    await startRecording();
    mic.emit(0.1, -0.5, 0.2);
    expect(recorder.getLevel()).toEqual({ peak: 0.5, clipping: false });
  });

  it('REC-005.2 reports clipping and keeps it visible for the hold time', async () => {
    await startRecording();
    clock.advance(10_000); // not at time 0: "now - lastClip" and "now + lastClip" must differ (mutation testing)
    mic.emit(1, 1, 1);
    expect(recorder.getLevel().clipping).toBe(true);
    clock.advance(CLIPPING_HOLD_MS);
    mic.emit(0.1);
    expect(recorder.getLevel().clipping).toBe(true); // exactly at the hold time: still shown
    clock.advance(1);
    mic.emit(0.1);
    expect(recorder.getLevel().clipping).toBe(false);
  });

  it('notifies level listeners', async () => {
    let calls = 0;
    recorder.subscribeLevel(() => calls++);
    await startRecording();
    mic.emit(0.3);
    expect(calls).toBeGreaterThan(0);
  });

  it('stops notifying level listeners after unsubscribe', async () => {
    let calls = 0;
    const unsubscribe = recorder.subscribeLevel(() => calls++);
    unsubscribe();
    await startRecording();
    mic.emit(0.3);
    expect(calls).toBe(0);
  });

  it('a clipped run in progress does not carry over to the next recording', async () => {
    await startRecording();
    mic.emit(1, 1); // two full-scale samples: not yet clipping
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    recorder.dispatch({ type: 'START' });
    recorder.dispatch({ type: 'CONFIRM' });
    await recorder.settled();
    mic.emit(1); // a third one, in a new recording
    expect(recorder.getLevel().clipping).toBe(false);
  });

  it('resets the level when the recording stops', async () => {
    await startRecording();
    mic.emit(1, 1, 1);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(recorder.getLevel()).toEqual({ peak: 0, clipping: false });
  });
});

describe('REC-005.3 checking the level (core + fake adapters)', () => {
  async function checkLevel() {
    recorder.dispatch({ type: 'CHECK_LEVEL' });
    await recorder.settled();
  }

  it('opens the microphone and shows the level without recording', async () => {
    await checkLevel();
    expect(recorder.getState().status).toBe('monitoring');
    mic.emit(0.25);
    expect(recorder.getLevel().peak).toBe(0.25);
    clock.advance(5_000);
    expect(recorder.getState().elapsedMs).toBe(0);
    expect(clock.activeTimers).toBe(0);
  });

  it('stopping the check closes the microphone and resets the level', async () => {
    await checkLevel();
    mic.emit(1, 1, 1);
    recorder.dispatch({ type: 'STOP_CHECK' });
    await recorder.settled();
    expect(mic.openSessions).toBe(0);
    expect(recorder.getLevel()).toEqual({ peak: 0, clipping: false });
  });

  it('recording straight from the check reuses the microphone and keeps only audio after the start', async () => {
    await checkLevel();
    clock.advance(4_000); // checking for 4 s: not part of the recording
    recorder.dispatch({ type: 'START' });
    await recorder.settled();
    expect(mic.startCalls).toBe(1);
    clock.advance(2_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    expect(recorder.getRecording()?.samples).toHaveLength(2 * 48_000);
    expect(mic.openSessions).toBe(0);
  });

  it('check level → start with an existing recording → confirm records (does not go back to checking)', async () => {
    await startRecording();
    clock.advance(1_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    await checkLevel();
    recorder.dispatch({ type: 'START' });
    expect(recorder.getState().status).toBe('confirmingReplace');
    recorder.dispatch({ type: 'CONFIRM' });
    await recorder.settled();
    expect(recorder.getState().status).toBe('recording');
  });

  it('a microphone interruption during the check closes it', async () => {
    await checkLevel();
    mic.end();
    await recorder.settled();
    expect(recorder.getState().status).toBe('idle');
    expect(mic.openSessions).toBe(0);
  });
});

describe('STO-001 kept on the device (core + fake store)', () => {
  /** A fresh controller on the same store: what happens when the app is opened again. */
  async function reopen() {
    const again = new RecorderController({ audioInput: mic, clock, store, lifecycle: new FakeLifecycle() });
    await again.restore();
    return again;
  }

  it('saves the audio while recording, every second', async () => {
    await startRecording();
    clock.advance(2_500);
    await recorder.settled();
    expect(store.savedSamples).toBe(2 * 48_000); // the last half second is not saved yet
  });

  it('STO-001.1 a finished recording comes back when the app is opened again', async () => {
    await startRecording();
    clock.advance(3_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    const again = await reopen();
    expect(again.getState()).toMatchObject({ hasRecording: true, recordingMs: 3_000, stoppedBy: null });
    expect(again.getRecording()?.samples).toHaveLength(3 * 48_000);
  });

  it('STO-001.3 / REC-003 a crash loses at most the save interval, and the recording is marked recovered', async () => {
    await startRecording();
    clock.advance(3_700); // the app "crashes" here: no STOP, nothing more is saved
    await recorder.settled();
    const again = await reopen();
    expect(again.getState().stoppedBy).toBe('recovered');
    const lostMs = 3_700 - again.getState().recordingMs;
    expect(lostMs).toBeGreaterThanOrEqual(0);
    expect(lostMs).toBeLessThanOrEqual(SAVE_INTERVAL_MS);
    expect(SAVE_INTERVAL_MS).toBeLessThanOrEqual(2_000); // REC-003.1: at most 2 s lost
  });

  it('STO-001.1 the length shown before closing is exactly the length shown after reopening', async () => {
    await startRecording();
    clock.advance(2_950); // the audio ends a little before or after the timer; the shown length must not change
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    const shown = recorder.getState().recordingMs;
    store.stored?.chunks.pop(); // the saved audio is a bit shorter than the timer
    expect((await reopen()).getState().recordingMs).toBe(shown);
  });

  it('a recovered recording is only reported as recovered once', async () => {
    await startRecording();
    clock.advance(2_000);
    await recorder.settled();
    await (await reopen()).settled();
    const third = await reopen();
    expect(third.getState()).toMatchObject({ hasRecording: true, stoppedBy: null });
  });

  it('nothing stored: the app starts empty', async () => {
    await recorder.restore();
    expect(recorder.getState()).toMatchObject({ hasRecording: false });
    expect(recorder.getRecording()).toBeNull();
  });

  it('REC-004.2 confirming a replacement deletes the stored recording', async () => {
    await startRecording();
    clock.advance(1_000);
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    mic.gate = new Promise(() => {}); // the new recording never starts, so only CONFIRM can have cleared the store
    recorder.dispatch({ type: 'START' });
    recorder.dispatch({ type: 'CONFIRM' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await store.load()).toBeNull();
  });

  it('STO-001.2 a full device stops the recording and keeps the audio', async () => {
    store.capacitySamples = 1.5 * 48_000; // room for 1.5 s
    await startRecording();
    clock.advance(3_000);
    await recorder.settled();
    expect(recorder.getState()).toMatchObject({
      status: 'idle',
      stoppedBy: 'storageFull',
      hasRecording: true,
    });
    expect(recorder.getRecording()?.samples.length).toBeGreaterThan(0);
    expect(mic.openSessions).toBe(0);
    expect(clock.activeTimers).toBe(0);
  });

  it('STO-001.4 warns when there is not enough room for a full-length recording, and still records', async () => {
    store.free = FULL_RECORDING_BYTES - 1;
    await startRecording();
    expect(recorder.getNotices().lowStorage).toBe(true);
    expect(recorder.getState().status).toBe('recording');
  });

  it('STO-001.4 no warning when exactly a full-length recording fits', async () => {
    store.free = FULL_RECORDING_BYTES;
    await startRecording();
    expect(recorder.getNotices().lowStorage).toBe(false);
  });

  it('no warning when the browser cannot tell the free space', async () => {
    store.free = null;
    await startRecording();
    expect(recorder.getNotices().lowStorage).toBe(false);
  });

  it('the low-storage warning is cleared for the next recording', async () => {
    store.free = 0;
    await startRecording();
    recorder.dispatch({ type: 'STOP' });
    await recorder.settled();
    store.free = 1e12;
    recorder.dispatch({ type: 'START' });
    recorder.dispatch({ type: 'CONFIRM' });
    await recorder.settled();
    expect(recorder.getNotices().lowStorage).toBe(false);
  });

  it('another storage error keeps recording in memory and says saving failed', async () => {
    store.append = async () => {
      throw new Error('disk on fire');
    };
    await startRecording();
    clock.advance(2_000);
    await recorder.settled();
    expect(recorder.getState().status).toBe('recording');
    expect(recorder.getNotices().saveFailed).toBe(true);
  });
});

describe('REC-003 going to the background (core + fake lifecycle)', () => {
  it('stops the recording and keeps (and saves) the audio recorded before', async () => {
    await startRecording();
    clock.advance(2_000);
    lifecycle.hide();
    await recorder.settled();
    expect(recorder.getState()).toMatchObject({
      status: 'idle',
      stoppedBy: 'interrupted',
      recordingMs: 2_000,
    });
    expect(recorder.getRecording()?.samples).toHaveLength(2 * 48_000);
    expect((await store.load())?.complete).toBe(true);
  });

  it('ends a level check and closes the microphone', async () => {
    recorder.dispatch({ type: 'CHECK_LEVEL' });
    await recorder.settled();
    lifecycle.hide();
    await recorder.settled();
    expect(recorder.getState().status).toBe('idle');
    expect(mic.openSessions).toBe(0);
  });

  it('does nothing when idle', () => {
    const before = recorder.getState();
    lifecycle.hide();
    expect(recorder.getState()).toBe(before);
  });
});
