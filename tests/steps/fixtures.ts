import { type Page, type Request, expect } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';

export type MicMode = 'real' | 'denied' | 'none';

/** Drives the app in the browser. Holds per-scenario setup that must exist before the page loads. */
export class AppDriver {
  micMode: MicMode = 'real';
  private opened = false;
  oldRecordingLength: string | null = null;
  /** Every network request the page makes, from the first navigation on (NFR-SEC-001/003). */
  readonly requests: Request[] = [];
  /** Time between starting navigation and the start button being usable (NFR-PERF-001). */
  readyAfterMs: number | null = null;

  /** Elapsed time shown just before an interruption (REC-003), in seconds. */
  elapsedAtInterruption: number | null = null;

  constructor(public page: Page) {
    page.on('request', (request) => this.requests.push(request));
  }

  /** Continues the scenario in another page (after closing a tab, a crash or a browser restart). */
  async reopenIn(page: Page): Promise<void> {
    this.page = page;
    page.on('request', (request) => this.requests.push(request));
    this.opened = false;
    await this.open();
  }

  /** Remembers the elapsed time right before an interruption. */
  async noteElapsed(): Promise<void> {
    this.elapsedAtInterruption = toSeconds(
      (await this.page.getByTestId('elapsed-time').textContent()) ?? '0:00',
    );
  }

  async recordingLengthSeconds(): Promise<number> {
    return toSeconds((await this.page.getByTestId('recording-length').textContent()) ?? '0:00');
  }

  get isOpen(): boolean {
    return this.opened;
  }

  async open(): Promise<void> {
    if (this.opened) return;
    this.opened = true;
    // Simulates microphone problems at the browser API boundary (P4); 'real' uses Chromium's fake microphone.
    await this.page.addInitScript((mode: MicMode) => {
      const w = window as unknown as { __micRequests: number };
      w.__micRequests = 0;
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      // Volume control between Chromium's fake microphone and the app, so a test can make the input clip.
      const gain = { value: 1, node: null as GainNode | null };
      (window as unknown as { __setInputGain: (g: number) => void }).__setInputGain = (g) => {
        gain.value = g;
        if (gain.node) gain.node.gain.value = g;
      };
      // REC-003: lets a test take the microphone away, as a phone call or unplugging would.
      let lastStream: MediaStream | null = null;
      (window as unknown as { __endMicrophone: () => void }).__endMicrophone = () =>
        lastStream?.getAudioTracks().forEach((t) => t.dispatchEvent(new Event('ended')));
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        w.__micRequests++;
        if (mode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
        if (mode === 'none') throw new DOMException('Requested device not found', 'NotFoundError');
        const real = await original(constraints);
        const context = new AudioContext({ sampleRate: 48_000 });
        const destination = context.createMediaStreamDestination();
        gain.node = new GainNode(context, { gain: gain.value });
        context.createMediaStreamSource(real).connect(gain.node).connect(destination);
        lastStream = destination.stream;
        return destination.stream;
      };
    }, this.micMode);
    // Controllable clock (REC-002): runs in real time until a step fast-forwards it.
    await this.page.clock.install();
    const navigationStarted = Date.now();
    await this.page.goto('./');
    await expect(this.button('Start recording')).toBeEnabled();
    this.readyAfterMs = Date.now() - navigationStarted;
    await this.page.clock.resume();
  }

  setInputGain = (gain: number) =>
    this.page.evaluate(
      (g) => (window as unknown as { __setInputGain: (g: number) => void }).__setInputGain(g),
      gain,
    );

  micRequests = () =>
    this.page.evaluate(() => (window as unknown as { __micRequests: number }).__micRequests);

  status = () => this.page.getByTestId('recorder-status');
  button = (name: string) => this.page.getByRole('button', { name });

  async startRecording(): Promise<void> {
    await this.open();
    await this.button('Start recording').click();
  }

  async recordFor(text: string): Promise<void> {
    await this.startRecording();
    await expect(this.status()).toHaveText('Recording');
    await expect(this.page.getByTestId('elapsed-time')).toHaveText(text, { timeout: 10_000 });
  }

  async stopRecording(): Promise<void> {
    await this.button('Stop recording').click();
    await expect(this.status()).toHaveText('Recording ready');
  }
}

export const test = base.extend<{ app: AppDriver }>({
  app: async ({ page }, provide) => {
    await provide(new AppDriver(page));
  },
});

export const { Given, When, Then, Step } = createBdd(test);

/** "1:05" → 65 */
export function toSeconds(text: string): number {
  const [minutes = '0', seconds = '0'] = text.trim().split(':');
  return Number(minutes) * 60 + Number(seconds);
}
