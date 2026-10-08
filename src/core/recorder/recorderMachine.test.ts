import { describe, expect, it } from 'vitest';
import {
  type RecorderEvent,
  type RecorderState,
  type RecorderStatus,
  MAX_RECORDING_MS,
  initialState,
  transition,
} from './recorderMachine';

const base = (status: RecorderStatus, patch: Partial<RecorderState> = {}): RecorderState => ({
  ...initialState,
  status,
  ...patch,
});

const EVENTS: Record<RecorderEvent['type'], RecorderEvent> = {
  START: { type: 'START' },
  CONFIRM: { type: 'CONFIRM' },
  CANCEL: { type: 'CANCEL' },
  PERMISSION_GRANTED: { type: 'PERMISSION_GRANTED' },
  PERMISSION_DENIED: { type: 'PERMISSION_DENIED' },
  NO_MICROPHONE: { type: 'NO_MICROPHONE' },
  TICK: { type: 'TICK', deltaMs: 100 },
  STOP: { type: 'STOP' },
  INTERRUPTED: { type: 'INTERRUPTED' },
  DISMISS: { type: 'DISMISS' },
};

/** Representative state per status, as reached in normal use. */
const STATES: Record<RecorderStatus, RecorderState> = {
  idle: base('idle'),
  confirmingReplace: base('confirmingReplace', { hasRecording: true, recordingMs: 3000 }),
  requestingPermission: base('requestingPermission'),
  recording: base('recording', { elapsedMs: 1000 }),
  error: base('error', { error: 'denied' }),
};

/**
 * The full transition table from docs/design/recorder-state-machine.md (ADR-007).
 * `null` = event is ignored: the state must stay exactly the same.
 */
const TABLE: Record<RecorderStatus, Record<RecorderEvent['type'], RecorderStatus | null>> = {
  idle: {
    START: 'requestingPermission',
    CONFIRM: null,
    CANCEL: null,
    PERMISSION_GRANTED: null,
    PERMISSION_DENIED: null,
    NO_MICROPHONE: null,
    TICK: null,
    STOP: null,
    INTERRUPTED: null,
    DISMISS: null,
  },
  confirmingReplace: {
    START: null,
    CONFIRM: 'requestingPermission',
    CANCEL: 'idle',
    PERMISSION_GRANTED: null,
    PERMISSION_DENIED: null,
    NO_MICROPHONE: null,
    TICK: null,
    STOP: null,
    INTERRUPTED: null,
    DISMISS: null,
  },
  requestingPermission: {
    START: null,
    CONFIRM: null,
    CANCEL: null,
    PERMISSION_GRANTED: 'recording',
    PERMISSION_DENIED: 'error',
    NO_MICROPHONE: 'error',
    TICK: null,
    STOP: null,
    INTERRUPTED: null,
    DISMISS: null,
  },
  recording: {
    START: null,
    CONFIRM: null,
    CANCEL: null,
    PERMISSION_GRANTED: null,
    PERMISSION_DENIED: null,
    NO_MICROPHONE: null,
    TICK: 'recording',
    STOP: 'idle',
    INTERRUPTED: 'idle',
    DISMISS: null,
  },
  error: {
    START: null,
    CONFIRM: null,
    CANCEL: null,
    PERMISSION_GRANTED: null,
    PERMISSION_DENIED: null,
    NO_MICROPHONE: null,
    TICK: null,
    STOP: null,
    INTERRUPTED: null,
    DISMISS: 'idle',
  },
};

const cells = Object.entries(TABLE).flatMap(([status, row]) =>
  Object.entries(row).map(([event, expected]) => ({
    status: status as RecorderStatus,
    event: event as RecorderEvent['type'],
    expected,
  })),
);

describe('ADR-007 recorder state machine: full transition table (state transition testing)', () => {
  it('covers every state × event combination', () => {
    expect(cells).toHaveLength(5 * 10);
  });

  it.each(cells)('$status + $event → $expected', ({ status, event, expected }) => {
    const before = STATES[status];
    const after = transition(before, EVENTS[event]);
    if (expected === null) {
      expect(after).toBe(before); // ignored: same object, nothing changed
    } else {
      expect(after.status).toBe(expected);
    }
  });
});

describe('initial state', () => {
  it('starts idle, with no recording, no error and the timer at 0', () => {
    expect(initialState).toEqual({
      status: 'idle',
      elapsedMs: 0,
      hasRecording: false,
      recordingMs: 0,
      stoppedBy: null,
      error: null,
    });
  });
});

describe('REC-001 record audio', () => {
  it('START without a recording asks for permission and resets the timer', () => {
    const next = transition(base('idle', { elapsedMs: 5000 }), EVENTS.START);
    expect(next).toMatchObject({ status: 'requestingPermission', elapsedMs: 0 });
  });

  it('a granted permission starts recording from 0', () => {
    expect(transition(STATES.requestingPermission, EVENTS.PERMISSION_GRANTED)).toMatchObject({
      status: 'recording',
      elapsedMs: 0,
    });
  });

  it.each([
    { event: EVENTS.PERMISSION_DENIED, error: 'denied' },
    { event: EVENTS.NO_MICROPHONE, error: 'noMicrophone' },
  ])('REC-001.4 $event.type → error "$error"', ({ event, error }) => {
    expect(transition(STATES.requestingPermission, event)).toMatchObject({ status: 'error', error });
  });

  it('DISMISS clears the error', () => {
    expect(transition(STATES.error, EVENTS.DISMISS)).toMatchObject({ status: 'idle', error: null });
  });

  it('REC-001.2 STOP keeps the recording and its length', () => {
    expect(transition(base('recording', { elapsedMs: 4200 }), EVENTS.STOP)).toMatchObject({
      status: 'idle',
      hasRecording: true,
      recordingMs: 4200,
      stoppedBy: 'user',
    });
  });

  it('TICK adds the elapsed time', () => {
    const next = transition(base('recording', { elapsedMs: 1000 }), { type: 'TICK', deltaMs: 250 });
    expect(next).toMatchObject({ status: 'recording', elapsedMs: 1250 });
  });
});

describe('REC-002 recording time limit', () => {
  it('is 5 minutes', () => {
    expect(MAX_RECORDING_MS).toBe(5 * 60 * 1000);
  });

  // Boundary value analysis around the limit (test strategy §4).
  it.each([
    { from: MAX_RECORDING_MS - 2, delta: 1, status: 'recording', elapsed: MAX_RECORDING_MS - 1 },
    { from: MAX_RECORDING_MS - 1, delta: 1, status: 'idle', elapsed: MAX_RECORDING_MS },
    { from: MAX_RECORDING_MS - 50, delta: 100, status: 'idle', elapsed: MAX_RECORDING_MS },
  ])('$from ms + $delta ms → $status at $elapsed ms', ({ from, delta, status, elapsed }) => {
    const next = transition(base('recording', { elapsedMs: from }), { type: 'TICK', deltaMs: delta });
    expect(next).toMatchObject({ status, elapsedMs: elapsed });
  });

  it('REC-002.1 stops automatically and keeps all 5 minutes', () => {
    const next = transition(base('recording', { elapsedMs: MAX_RECORDING_MS - 1 }), {
      type: 'TICK',
      deltaMs: 1,
    });
    expect(next).toMatchObject({
      status: 'idle',
      hasRecording: true,
      recordingMs: MAX_RECORDING_MS,
      stoppedBy: 'limit',
    });
  });
});

describe('REC-003 interruption (state part)', () => {
  it('INTERRUPTED stops and keeps the audio so far', () => {
    expect(transition(base('recording', { elapsedMs: 3000 }), EVENTS.INTERRUPTED)).toMatchObject({
      status: 'idle',
      hasRecording: true,
      recordingMs: 3000,
      stoppedBy: 'interrupted',
    });
  });
});

describe('REC-004 replace confirmation (state part)', () => {
  const withRecording = base('idle', { hasRecording: true, recordingMs: 3000 });

  it('REC-004.1 START with an existing recording asks for confirmation', () => {
    expect(transition(withRecording, EVENTS.START).status).toBe('confirmingReplace');
  });

  it('REC-004.2 CONFIRM deletes the old recording and asks for permission', () => {
    expect(transition(STATES.confirmingReplace, EVENTS.CONFIRM)).toMatchObject({
      status: 'requestingPermission',
      hasRecording: false,
      recordingMs: 0,
    });
  });

  it('REC-004.3 CANCEL keeps the old recording unchanged', () => {
    expect(transition(STATES.confirmingReplace, EVENTS.CANCEL)).toMatchObject({
      status: 'idle',
      hasRecording: true,
      recordingMs: 3000,
    });
  });
});
