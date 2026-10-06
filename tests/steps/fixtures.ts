import { type Page, expect } from '@playwright/test';
import { test as base, createBdd } from 'playwright-bdd';

export type MicMode = 'real' | 'denied' | 'none';

/** Drives the app in the browser. Holds per-scenario setup that must exist before the page loads. */
export class AppDriver {
  micMode: MicMode = 'real';
  private opened = false;
  oldRecordingLength: string | null = null;

  constructor(readonly page: Page) {}

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
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        w.__micRequests++;
        if (mode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
        if (mode === 'none') throw new DOMException('Requested device not found', 'NotFoundError');
        return original(constraints);
      };
    }, this.micMode);
    // Controllable clock (REC-002): runs in real time until a step fast-forwards it.
    await this.page.clock.install();
    await this.page.goto('./');
    await this.page.clock.resume();
  }

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
