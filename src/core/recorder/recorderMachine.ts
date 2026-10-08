/** Recorder state machine (ADR-007). Pure: no browser APIs, no side effects. See docs/design/recorder-state-machine.md. */
import type { MicrophoneProblem } from '../ports';

export const MAX_RECORDING_MS = 5 * 60 * 1000; // REC-002

export type RecorderStatus = 'idle' | 'confirmingReplace' | 'requestingPermission' | 'recording' | 'error';
export type StopReason = 'user' | 'limit' | 'interrupted';

export interface RecorderState {
  status: RecorderStatus;
  /** Time recorded so far in the current recording. */
  elapsedMs: number;
  /** Whether a finished recording exists, and its length. */
  hasRecording: boolean;
  recordingMs: number;
  stoppedBy: StopReason | null;
  error: MicrophoneProblem | null;
}

export type RecorderEvent =
  | { type: 'START' }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PERMISSION_DENIED' }
  | { type: 'NO_MICROPHONE' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'STOP' }
  | { type: 'INTERRUPTED' }
  | { type: 'DISMISS' };

export const initialState: RecorderState = {
  status: 'idle',
  elapsedMs: 0,
  hasRecording: false,
  recordingMs: 0,
  stoppedBy: null,
  error: null,
};

/** Returns the next state. Events that are not allowed in the current state return the same object. */
export function transition(state: RecorderState, event: RecorderEvent): RecorderState {
  switch (state.status) {
    case 'idle':
      if (event.type === 'START') {
        return state.hasRecording
          ? { ...state, status: 'confirmingReplace' }
          : { ...state, status: 'requestingPermission', elapsedMs: 0 };
      }
      return state;

    case 'confirmingReplace':
      if (event.type === 'CONFIRM') {
        return {
          ...state,
          status: 'requestingPermission',
          hasRecording: false,
          recordingMs: 0,
          elapsedMs: 0,
        };
      }
      if (event.type === 'CANCEL') return { ...state, status: 'idle' };
      return state;

    case 'requestingPermission':
      if (event.type === 'PERMISSION_GRANTED')
        return { ...state, status: 'recording', elapsedMs: 0, stoppedBy: null };
      if (event.type === 'PERMISSION_DENIED') return { ...state, status: 'error', error: 'denied' };
      if (event.type === 'NO_MICROPHONE') return { ...state, status: 'error', error: 'noMicrophone' };
      return state;

    case 'recording':
      if (event.type === 'TICK') {
        const elapsedMs = Math.min(state.elapsedMs + event.deltaMs, MAX_RECORDING_MS);
        return elapsedMs >= MAX_RECORDING_MS
          ? finish({ ...state, elapsedMs }, 'limit')
          : { ...state, elapsedMs };
      }
      if (event.type === 'STOP') return finish(state, 'user');
      if (event.type === 'INTERRUPTED') return finish(state, 'interrupted');
      return state;

    case 'error':
      if (event.type === 'DISMISS') return { ...state, status: 'idle', error: null };
      return state;
  }
}

function finish(state: RecorderState, stoppedBy: StopReason): RecorderState {
  return { ...state, status: 'idle', hasRecording: true, recordingMs: state.elapsedMs, stoppedBy };
}
