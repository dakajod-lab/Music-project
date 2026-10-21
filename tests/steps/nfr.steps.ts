import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

// ── Shared ───────────────────────────────────────────────────────────────────

When('the user records and stops a recording', async ({ app }) => {
  await app.recordFor('0:01');
  await app.stopRecording();
});

Then('the recording is ready', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording ready');
});

// ── NFR-SEC ──────────────────────────────────────────────────────────────────

Then('no network request sends data from the device', async ({ app }) => {
  // The app is static (ADR-002): it may only download its own files. Any request that sends a body could carry audio.
  const sending = app.requests
    .filter((r) => r.method() !== 'GET' || r.postData() !== null)
    .map((r) => `${r.method()} ${r.url()}`);
  expect(app.requests.length).toBeGreaterThan(0); // guard: the listener did see the page load
  expect(sending).toEqual([]);
});

Then("every network request goes to the app's own site", async ({ app }) => {
  const own = new URL(app.page.url()).origin;
  const foreign = app.requests
    .map((r) => r.url())
    .filter((url) => !url.startsWith('data:') && !url.startsWith('blob:'))
    .filter((url) => new URL(url).origin !== own);
  expect(foreign).toEqual([]);
});

// ── NFR-A11Y-002 ─────────────────────────────────────────────────────────────

async function pressButtonWithKeyboard(app: import('./fixtures').AppDriver, name: string) {
  const target = app.button(name);
  for (let i = 0; i < 20 && !(await target.evaluate((el) => el === document.activeElement)); i++) {
    await app.page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
  await app.page.keyboard.press('Enter');
}

When('the user records and stops a recording using only the keyboard', async ({ app }) => {
  await pressButtonWithKeyboard(app, 'Start recording');
  await expect(app.status()).toHaveText('Recording');
  await expect(app.page.getByTestId('elapsed-time')).toHaveText('0:01', { timeout: 10_000 });
  await pressButtonWithKeyboard(app, 'Stop recording');
});

// ── NFR-PERF-001 ─────────────────────────────────────────────────────────────

When('the user opens the app', async ({ app }) => {
  await app.open();
});

Then('recording can be started within 3 seconds', async ({ app }) => {
  // Early warning only: CI is not the reference phone (see performance.feature).
  expect(app.readyAfterMs).not.toBeNull();
  expect(app.readyAfterMs).toBeLessThanOrEqual(3_000);
});

// ── NFR-CMP-002 ──────────────────────────────────────────────────────────────

Given('the screen is {int} px wide', async ({ app }, width: number) => {
  await app.page.setViewportSize({ width, height: 800 });
});

Then('the page does not scroll sideways', async ({ app }) => {
  const { scrollWidth, innerWidth } = await app.page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
});

Then('the recording controls are visible', async ({ app }) => {
  await expect(app.button('Start recording')).toBeInViewport();
});
