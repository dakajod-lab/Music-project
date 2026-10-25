import { formatTime } from '../core/formatTime';
import type { Player } from '../core/player/Player';
import { MAX_RECORDING_MS } from '../core/recorder/recorderMachine';
import type { RecorderController } from '../core/recorder/RecorderController';
import { useInputLevel, useNotices, usePlayerState, useRecorderState } from './useRecorder';

const PROBLEM_TEXT = {
  denied:
    'Microphone access is needed to record. Allow the microphone for this site in your browser settings, then try again.',
  noMicrophone: 'No microphone was found. Connect a microphone and try again.',
} as const;

const STOP_TEXT = {
  user: 'Recording stopped.',
  limit: `Recording stopped automatically at the ${formatTime(MAX_RECORDING_MS)} limit.`,
  interrupted: 'Recording was interrupted. The audio up to the interruption is kept.',
  storageFull: 'Device storage is full. The recording was stopped; the audio recorded so far is kept.',
  recovered:
    'Recovered: the app closed unexpectedly during this recording. The audio up to that moment is kept.',
} as const;

const STATUS_TEXT = {
  confirmingReplace: 'Replace the existing recording?',
  requestingPermission: 'Waiting for microphone access…',
  monitoring: 'Checking input level',
  recording: 'Recording',
  error: 'Cannot record',
} as const;

/** Minimal, design-neutral recorder UI. Look and feel comes later (roadmap). */
export function Recorder({ recorder, player }: { recorder: RecorderController; player: Player }) {
  const state = useRecorderState(recorder);
  const playerState = usePlayerState(player);
  const notices = useNotices(recorder);
  const { dispatch } = recorder;
  const isRecording = state.status === 'recording';
  const micOpen = isRecording || state.status === 'monitoring';
  const isPlaying = playerState.status === 'playing';

  const start = () => {
    player.stop(); // never record while playing back
    dispatch({ type: 'START' });
  };

  return (
    <section aria-label="Recorder">
      <p role="status" data-testid="recorder-status">
        {state.status === 'idle'
          ? state.hasRecording
            ? 'Recording ready'
            : 'Ready to record'
          : STATUS_TEXT[state.status]}
      </p>

      {micOpen && <InputLevelMeter recorder={recorder} />}

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

      {isRecording && notices.lowStorage && (
        <p role="alert" data-testid="low-storage-warning">
          Storage is almost full: this recording may not fit. It will stop automatically if the device runs
          out of space.
        </p>
      )}
      {notices.saveFailed && (
        <p role="alert" data-testid="save-failed-warning">
          The recording could not be saved on this device. Export it before closing the app.
        </p>
      )}

      {state.status === 'idle' && state.hasRecording && (
        <p data-testid="recording-info">
          Recording length: <span data-testid="recording-length">{formatTime(state.recordingMs)}</span>
          {state.stoppedBy && <> · {STOP_TEXT[state.stoppedBy]}</>}
        </p>
      )}

      {(state.status === 'idle' || state.status === 'monitoring') && (
        <button type="button" onClick={start}>
          Start recording
        </button>
      )}
      {state.status === 'idle' && (
        <button type="button" onClick={() => dispatch({ type: 'CHECK_LEVEL' })}>
          Check input level
        </button>
      )}
      {state.status === 'monitoring' && (
        <button type="button" onClick={() => dispatch({ type: 'STOP_CHECK' })}>
          Stop checking
        </button>
      )}
      {isRecording && (
        <button type="button" onClick={() => dispatch({ type: 'STOP' })}>
          Stop recording
        </button>
      )}

      {state.status === 'idle' && state.hasRecording && (
        <div aria-label="Playback">
          {isPlaying ? (
            <button type="button" onClick={() => player.stop()}>
              Stop playback
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const recording = recorder.getRecording();
                if (recording) void player.play(recording);
              }}
            >
              Play recording
            </button>
          )}
          <p>
            <span data-testid="player-status">{isPlaying ? 'Playing' : 'Stopped'}</span>{' '}
            <span data-testid="playback-position" aria-label="Playback position">
              {formatTime(playerState.positionMs)}
            </span>
            {' / '}
            <span data-testid="playback-duration">
              {formatTime(playerState.durationMs || state.recordingMs)}
            </span>
          </p>
        </div>
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

/** REC-005: live input level and clipping warning. */
function InputLevelMeter({ recorder }: { recorder: RecorderController }) {
  const level = useInputLevel(recorder);
  return (
    <div>
      <label>
        Input level{' '}
        <meter data-testid="input-level" min={0} max={1} high={0.9} value={level.peak}>
          {Math.round(level.peak * 100)}%
        </meter>
      </label>
      {level.clipping && (
        <p role="alert" data-testid="clipping-warning">
          Input is clipping (too loud). Move the microphone further away or play more softly.
        </p>
      )}
    </div>
  );
}
