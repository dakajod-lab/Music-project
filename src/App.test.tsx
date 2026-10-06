import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeAudioInput, FakeClock } from '../tests/support/fakes';
import { App } from './App';
import { RecorderController } from './core/recorder/RecorderController';

function setup() {
  const clock = new FakeClock();
  const mic = new FakeAudioInput(clock);
  const recorder = new RecorderController(mic, clock);
  render(<App createRecorder={() => recorder} />);
  return { clock, mic, recorder, user: userEvent.setup() };
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
});
