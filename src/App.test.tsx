import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  FakeAudioInput,
  FakeAudioOutput,
  FakeClock,
  FakeLifecycle,
  FakeRecordingStore,
} from '../tests/support/fakes';
import { App } from './App';
import { Player } from './core/player/Player';
import { RecorderController } from './core/recorder/RecorderController';

function setup() {
  const clock = new FakeClock();
  const mic = new FakeAudioInput(clock);
  const speaker = new FakeAudioOutput(clock);
  const store = new FakeRecordingStore();
  const lifecycle = new FakeLifecycle();
  const recorder = new RecorderController({ audioInput: mic, clock, store, lifecycle });
  const player = new Player(speaker, clock);
  render(<App createServices={() => ({ recorder, player })} />);
  return { clock, mic, speaker, store, lifecycle, recorder, player, user: userEvent.setup() };
}

async function recordSeconds(ctx: ReturnType<typeof setup>, seconds: number) {
  await ctx.user.click(screen.getByRole('button', { name: 'Start recording' }));
  await act(() => ctx.recorder.settled());
  act(() => ctx.clock.advance(seconds * 1000));
  await ctx.user.click(screen.getByRole('button', { name: 'Stop recording' }));
  await act(() => ctx.recorder.settled());
}

describe('App', () => {
  it('renders the app title', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Music Recorder' })).toBeInTheDocument();
  });

  it('REC-001 start → elapsed time and limit shown → stop → recording ready', async () => {
    const { clock, recorder, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    await act(() => recorder.settled());
    expect(screen.getByRole('status')).toHaveTextContent('Recording');
    expect(screen.getByLabelText('Time limit')).toHaveTextContent('5:00');

    act(() => clock.advance(3_000));
    expect(screen.getByLabelText('Elapsed time')).toHaveTextContent('0:03');

    await user.click(screen.getByRole('button', { name: 'Stop recording' }));
    await act(() => recorder.settled());
    expect(screen.getByRole('status')).toHaveTextContent('Recording ready');
    expect(screen.getByTestId('recording-length')).toHaveTextContent('0:03');
  });

  it.each([
    { problem: 'denied' as const, text: /Allow the microphone for this site/ },
    { problem: 'noMicrophone' as const, text: /No microphone was found/ },
  ])('REC-001.4 explains "$problem" and returns to start after OK', async ({ problem, text }) => {
    const { mic, recorder, user } = setup();
    mic.problem = problem;
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    await act(() => recorder.settled());
    expect(screen.getByRole('alert')).toHaveTextContent(text);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
  });

  it('NFR-USA-001 the replace dialog focuses the safe choice, not the destructive one', async () => {
    const { recorder, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    await act(() => recorder.settled());
    await user.click(screen.getByRole('button', { name: 'Stop recording' }));
    await act(() => recorder.settled());
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    expect(screen.getByRole('button', { name: 'Keep existing recording' })).toHaveFocus();
  });

  it('REC-005.1/.2 shows the input level and a clipping warning while recording', async () => {
    const { mic, recorder, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Start recording' }));
    await act(() => recorder.settled());
    act(() => mic.emit(0.1, -0.4, 0.2));
    expect(screen.getByTestId('input-level')).toHaveAttribute('value', String(Math.fround(0.4)));
    expect(screen.queryByTestId('clipping-warning')).not.toBeInTheDocument();
    act(() => mic.emit(1, 1, 1));
    expect(screen.getByRole('alert')).toHaveTextContent(/clipping/);
  });

  it('REC-005.3 checks the level without recording, then closes the microphone', async () => {
    const { mic, recorder, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Check input level' }));
    await act(() => recorder.settled());
    expect(screen.getByRole('status')).toHaveTextContent('Checking input level');
    expect(screen.getByTestId('input-level')).toBeInTheDocument();
    expect(screen.queryByLabelText('Elapsed time')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stop checking' }));
    await act(() => recorder.settled());
    expect(mic.openSessions).toBe(0);
    expect(screen.queryByTestId('input-level')).not.toBeInTheDocument();
  });

  it('PLY-001 plays the recording from the start, shows the position and stops', async () => {
    const ctx = setup();
    await recordSeconds(ctx, 3);
    await ctx.user.click(screen.getByRole('button', { name: 'Play recording' }));
    await act(() => Promise.resolve());
    expect(screen.getByTestId('player-status')).toHaveTextContent('Playing');
    expect(screen.getByTestId('playback-duration')).toHaveTextContent('0:03');
    act(() => ctx.clock.advance(1_000));
    expect(screen.getByLabelText('Playback position')).toHaveTextContent('0:01');
    await ctx.user.click(screen.getByRole('button', { name: 'Stop playback' }));
    expect(screen.getByTestId('player-status')).toHaveTextContent('Stopped');
    expect(ctx.speaker.playing).toBe(false);
  });

  it('starting a new recording stops playback first', async () => {
    const ctx = setup();
    await recordSeconds(ctx, 1);
    await ctx.user.click(screen.getByRole('button', { name: 'Play recording' }));
    await act(() => Promise.resolve());
    await ctx.user.click(screen.getByRole('button', { name: 'Start recording' }));
    expect(ctx.speaker.playing).toBe(false);
  });

  it('STO-001.3 tells the user when a recording was recovered after a crash', async () => {
    const ctx = setup();
    await ctx.store.begin(48_000);
    await ctx.store.append(new Float32Array(2 * 48_000));
    await act(() => ctx.recorder.restore());
    expect(screen.getByTestId('recording-info')).toHaveTextContent(/Recovered/);
    expect(screen.getByTestId('recording-length')).toHaveTextContent('0:02');
  });

  it('STO-001.2 tells the user when storage is full', async () => {
    const ctx = setup();
    ctx.store.capacitySamples = 48_000;
    await ctx.user.click(screen.getByRole('button', { name: 'Start recording' }));
    await act(() => ctx.recorder.settled());
    act(() => ctx.clock.advance(3_000));
    await act(() => ctx.recorder.settled());
    expect(screen.getByTestId('recording-info')).toHaveTextContent(/storage is full/);
  });

  it('STO-001.4 warns about low storage while recording', async () => {
    const ctx = setup();
    ctx.store.free = 1_000;
    await ctx.user.click(screen.getByRole('button', { name: 'Start recording' }));
    await act(() => ctx.recorder.settled());
    expect(screen.getByTestId('low-storage-warning')).toBeInTheDocument();
  });
});
