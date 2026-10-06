import { formatTime } from '../core/formatTime';
import { MAX_RECORDING_MS } from '../core/recorder/recorderMachine';
import type { RecorderController } from '../core/recorder/RecorderController';
import { useRecorderState } from './useRecorder';

const PROBLEM_TEXT = {
  denied:
    'Microphone access is needed to record. Allow the microphone for this site in your browser settings, then try again.',
  noMicrophone: 'No microphone was found. Connect a microphone and try again.',
} as const;

const STOP_TEXT = {
  user: 'Recording stopped.',
  limit: `Recording stopped automatically at the ${formatTime(MAX_RECORDING_MS)} limit.`,
  interrupted: 'Recording was interrupted. The audio up to the interruption is kept.',
} as const;

/** Minimal, design-neutral recorder UI. Look and feel comes later (roadmap). */
export function Recorder({ recorder }: { recorder: RecorderController }) {
  const state = useRecorderState(recorder);
  const { dispatch } = recorder;
  const isRecording = state.status === 'recording';

  return (
    <section aria-label="Recorder">
      <p role="status" data-testid="recorder-status">
        {
          {
            idle: state.hasRecording ? 'Recording ready' : 'Ready to record',
            confirmingReplace: 'Replace the existing recording?',
            requestingPermission: 'Waiting for microphone access…',
            recording: 'Recording',
            error: 'Cannot record',
          }[state.status]
        }
      </p>

      {isRecording && (
        <p>
          <span data-testid="elapsed-time" aria-label="Elapsed time">
            {formatTime(state.elapsedMs)}
          </span>
          {' / '}
          <span data-testid="time-limit" aria-label="Time limit">
            {formatTime(MAX_RECORDING_MS)}
          </span>
        </p>
      )}

      {state.status === 'idle' && state.hasRecording && (
        <p data-testid="recording-info">
          Recording length: <span data-testid="recording-length">{formatTime(state.recordingMs)}</span>
          {state.stoppedBy && <> · {STOP_TEXT[state.stoppedBy]}</>}
        </p>
      )}

      {state.status === 'idle' && (
        <button type="button" onClick={() => dispatch({ type: 'START' })}>
          Start recording
        </button>
      )}
      {isRecording && (
        <button type="button" onClick={() => dispatch({ type: 'STOP' })}>
          Stop recording
        </button>
      )}

      {state.status === 'confirmingReplace' && (
        <div role="alertdialog" aria-label="Replace recording">
          <p>Starting a new recording deletes the existing one.</p>
          {/* NFR-USA-001: the safe choice comes first and gets focus; the destructive one is never the default. */}
          <button type="button" autoFocus onClick={() => dispatch({ type: 'CANCEL' })}>
            Keep existing recording
          </button>
          <button type="button" onClick={() => dispatch({ type: 'CONFIRM' })}>
            Delete and record new
          </button>
        </div>
      )}

      {state.status === 'error' && state.error && (
        <div role="alert">
          <p>{PROBLEM_TEXT[state.error]}</p>
          <button type="button" onClick={() => dispatch({ type: 'DISMISS' })}>
            OK
          </button>
        </div>
      )}
    </section>
  );
}
