import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

Given('a recording is playing', async ({ app }) => {
  await app.recordFor('0:02');
  await app.stopRecording();
  await app.button('Play recording').click();
  await expect(app.page.getByTestId('player-status')).toHaveText('Playing');
});

Given('the user has just stopped a recording', async ({ app }) => {
  await app.recordFor('0:02');
  await app.stopRecording();
});

When('the user starts playback', async ({ app }) => {
  await app.button('Play recording').click();
});

When('the user stops playback', async ({ app }) => {
  await app.button('Stop playback').click();
});

When('playback reaches the end', async ({ app }) => {
  // No user action: the recording is a few seconds long and ends by itself.
  await expect(app.page.getByTestId('player-status')).toHaveText('Stopped', { timeout: 10_000 });
});

Then('the recording plays from the start', async ({ app }) => {
  await expect(app.page.getByTestId('player-status')).toHaveText('Playing');
  await expect(app.page.getByLabel('Playback position')).toHaveText('0:00');
});

Then('the playback position is shown', async ({ app }) => {
  await expect(app.page.getByLabel('Playback position')).toHaveText('0:01', { timeout: 5_000 });
});

Then('playback stops', async ({ app }) => {
  await expect(app.page.getByTestId('player-status')).toHaveText('Stopped');
  await expect(app.button('Play recording')).toBeVisible();
});

Then('the new recording plays', async ({ app }) => {
  await expect(app.page.getByTestId('player-status')).toHaveText('Playing');
  const length = await app.page.getByTestId('recording-length').textContent();
  await expect(app.page.getByTestId('playback-duration')).toHaveText(length ?? '');
});
