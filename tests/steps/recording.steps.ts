import { expect } from '@playwright/test';
import { MAX_RECORDING_MS } from '../../src/core/recorder/recorderMachine';
import { Given, Step, Then, When } from './fixtures';

// ── Microphone setup ─────────────────────────────────────────────────────────

Given('microphone access is granted', async ({ app, context }) => {
  await context.grantPermissions(['microphone']);
  app.micMode = 'real';
});

Given('microphone access has never been requested', async ({ app }) => {
  // Test environment limit: the fake-microphone flag makes Chromium report the permission as already "granted",
  // so the browser's stored state cannot be reset here. We check the app's side instead: it has not asked for
  // the microphone before the user starts recording. The real browser prompt is checked manually on the
  // reference phone (first acceptance test, P5).
  await app.open();
  expect(await app.micRequests()).toBe(0);
});

Given('microphone access is denied', async ({ app }) => {
  app.micMode = 'denied';
});

Given('no microphone is available', async ({ app }) => {
  app.micMode = 'none';
});

// ── Recording ────────────────────────────────────────────────────────────────

Given('a recording is in progress', async ({ app }) => {
  await app.recordFor('0:01');
});

Given('a recording exists', async ({ app }) => {
  await app.recordFor('0:02');
  await app.stopRecording();
  app.oldRecordingLength = await app.page.getByTestId('recording-length').textContent();
});

When('the user starts recording', async ({ app }) => {
  await app.startRecording();
});

When('the user starts a new recording', async ({ app }) => {
  await app.button('Start recording').click();
});

When('the user stops recording', async ({ app }) => {
  await app.button('Stop recording').click();
});

When('the recording reaches 5 minutes', async ({ app }) => {
  // Fast-forward the page's clock instead of waiting 5 real minutes.
  await app.page.clock.runFor(MAX_RECORDING_MS + 1_000);
});

Then('audio is recorded', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording');
  await expect(app.page.getByTestId('elapsed-time')).not.toHaveText('0:00', { timeout: 5_000 });
});

Then('the elapsed time is shown', async ({ app }) => {
  await expect(app.page.getByLabel('Elapsed time')).toHaveText(/^\d+:\d{2}$/);
});

Then('the time limit is shown', async ({ app }) => {
  await expect(app.page.getByLabel('Time limit')).toHaveText('5:00');
});

Then('the recording stops', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording ready');
  await expect(app.button('Stop recording')).toHaveCount(0);
});

Then('the recording stops automatically', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording ready');
  await expect(app.page.getByTestId('recording-info')).toContainText('stopped automatically');
});

Then('all 5 minutes are kept', async ({ app }) => {
  // The UI shows the recorded length; the sample-exact check is in tests/integration/recorder.test.ts.
  await expect(app.page.getByTestId('recording-length')).toHaveText('5:00');
});

Then('the user is asked for microphone access', async ({ app }) => {
  // The prompt itself is drawn by the browser; we verify the app requested the microphone, which triggers it.
  await expect
    .poll(() => app.page.evaluate(() => (window as unknown as { __micRequests: number }).__micRequests))
    .toBe(1);
});

Then('no recording starts', async ({ app }) => {
  await expect(app.status()).not.toHaveText('Recording');
  await expect(app.button('Stop recording')).toHaveCount(0);
});

Then('the user is told access is needed, and how to allow it', async ({ app }) => {
  await expect(app.page.getByRole('alert')).toContainText('Microphone access is needed');
  await expect(app.page.getByRole('alert')).toContainText('Allow the microphone for this site');
});

Then('the user is told no microphone was found', async ({ app }) => {
  await expect(app.page.getByRole('alert')).toContainText('No microphone was found');
});

// ── REC-004 replace ──────────────────────────────────────────────────────────

// Used as Given (REC-004.2/.3: arrange it) and as Then (REC-004.1: check it). Gherkin ignores the keyword,
// so one definition does both: arrange only if nothing happened yet in this scenario, then always assert.
Step('the user is asked to confirm the replacement', async ({ app }) => {
  if (!app.isOpen) {
    await app.recordFor('0:02');
    await app.stopRecording();
    app.oldRecordingLength = await app.page.getByTestId('recording-length').textContent();
    await app.button('Start recording').click();
  }
  await expect(app.page.getByRole('alertdialog', { name: 'Replace recording' })).toBeVisible();
});

When('the user confirms', async ({ app }) => {
  await app.button('Delete and record new').click();
});

When('the user cancels', async ({ app }) => {
  await app.button('Keep existing recording').click();
});

Then('the new recording starts', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording');
  await expect(app.page.getByTestId('elapsed-time')).toHaveText('0:00');
});

Then('the old recording is deleted', async ({ app }) => {
  // Stop the new recording straight away: its length must not be the old one.
  await app.stopRecording();
  await expect(app.page.getByTestId('recording-length')).not.toHaveText(app.oldRecordingLength ?? '');
});

Then('the old recording is unchanged', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording ready');
  await expect(app.page.getByTestId('recording-length')).toHaveText(app.oldRecordingLength ?? '');
});
