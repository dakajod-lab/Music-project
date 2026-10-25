import { type BrowserContext, type Page, expect } from '@playwright/test';
import { type AppDriver, Then, When, Given } from './fixtures';

const QUOTA_FULL = 400_000; // ~2 s of audio: the device fills up during the recording
const FREE_LOW = 10_000_000; // room for a short idea, not for 5 minutes (~58 MB)

async function setQuota(app: AppDriver, context: BrowserContext, quotaSize: number) {
  await app.open();
  const cdp = await context.newCDPSession(app.page);
  await cdp.send('Storage.overrideQuotaForOrigin', { origin: new URL(app.page.url()).origin, quotaSize });
}

/**
 * Simulates a crash: all JavaScript stops at once (no chance to save anything more), then the tab is gone.
 * (Chromium's own Page.crash also destroys the test's browser context, so the app could not be reopened.)
 */
async function crash(app: AppDriver, context: BrowserContext): Promise<Page> {
  const cdp = await context.newCDPSession(app.page);
  await cdp.send('Runtime.terminateExecution').catch(() => {});
  await app.page.close({ runBeforeUnload: false });
  return context.newPage();
}

async function closeTab(app: AppDriver, context: BrowserContext): Promise<Page> {
  await app.page.close();
  return context.newPage();
}

// ── REC-003 interruptions ────────────────────────────────────────────────────

When('a phone call comes in', async ({ app }) => {
  // In the browser a call shows up as the microphone track ending, the same signal as unplugging.
  await app.noteElapsed();
  await app.page.evaluate(() => (window as unknown as { __endMicrophone: () => void }).__endMicrophone());
});

When('the microphone is disconnected', async ({ app }) => {
  await app.noteElapsed();
  await app.page.evaluate(() => (window as unknown as { __endMicrophone: () => void }).__endMicrophone());
});

When('the app goes to the background', async ({ app }) => {
  await app.noteElapsed();
  await app.page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
});

When('the tab is closed', async ({ app, context }) => {
  await app.noteElapsed();
  await app.reopenIn(await closeTab(app, context));
});

When('the browser crashes', async ({ app, context }) => {
  await app.noteElapsed();
  await app.reopenIn(await crash(app, context));
});

Then('at most {int} s of audio before the interruption is lost', async ({ app }, maxLoss: number) => {
  await expect(app.page.getByTestId('recording-length')).toBeVisible();
  const kept = await app.recordingLengthSeconds();
  expect(app.elapsedAtInterruption).not.toBeNull();
  expect(kept).toBeGreaterThanOrEqual((app.elapsedAtInterruption ?? 0) - maxLoss);
});

// ── STO-001 ──────────────────────────────────────────────────────────────────

When('the user reloads the page and opens the app again', async ({ app }) => {
  app.oldRecordingLength = await app.page.getByTestId('recording-length').textContent();
  await app.page.reload();
});

When('the user closes the tab and opens the app again', async ({ app, context }) => {
  app.oldRecordingLength = await app.page.getByTestId('recording-length').textContent();
  await app.reopenIn(await closeTab(app, context));
});

When('the user restarts the browser and opens the app again', async ({ app, context, browser }) => {
  app.oldRecordingLength = await app.page.getByTestId('recording-length').textContent();
  // A new browser context with the stored data of the old one, IndexedDB included.
  const storageState = await context.storageState({ indexedDB: true });
  await context.close();
  const restarted = await browser.newContext({ storageState, permissions: ['microphone'] });
  await app.reopenIn(await restarted.newPage());
});

Then('the same recording is available', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording ready');
  await expect(app.page.getByTestId('recording-length')).toHaveText(app.oldRecordingLength ?? '');
  await expect(app.button('Play recording')).toBeVisible();
});

Given('the device storage is full', async ({ app, context }) => {
  await setQuota(app, context, QUOTA_FULL);
});

Then('the recorded audio is kept', async ({ app }) => {
  await expect(app.button('Play recording')).toBeVisible();
  expect(await app.recordingLengthSeconds()).toBeGreaterThan(0);
});

Then('the user is told that storage is full', async ({ app }) => {
  await expect(app.page.getByTestId('recording-info')).toContainText('storage is full');
});

When('the app closes unexpectedly and is opened again', async ({ app, context }) => {
  await app.noteElapsed();
  await app.reopenIn(await crash(app, context));
});

Then('the recording up to the moment it closed is available', async ({ app }) => {
  await expect(app.button('Play recording')).toBeVisible();
  // REC-003.1: at most 2 s lost in a crash.
  expect(await app.recordingLengthSeconds()).toBeGreaterThanOrEqual((app.elapsedAtInterruption ?? 0) - 2);
});

Then('the user is told that the recording was recovered', async ({ app }) => {
  await expect(app.page.getByTestId('recording-info')).toContainText('Recovered');
});

Given('the device has less free storage than a full-length recording needs', async ({ app }) => {
  app.reportedFreeBytes = FREE_LOW;
});

Then('the user is warned that the recording may not fit', async ({ app }) => {
  await expect(app.page.getByTestId('low-storage-warning')).toBeVisible();
});

Then('the recording starts', async ({ app }) => {
  await expect(app.status()).toHaveText('Recording');
});
