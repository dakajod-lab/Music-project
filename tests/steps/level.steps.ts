import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

Given('no recording is in progress', async ({ app }) => {
  await app.open();
  await expect(app.status()).not.toHaveText('Recording');
});

When('the user checks the input level', async ({ app }) => {
  await app.button('Check input level').click();
  await expect(app.status()).toHaveText('Checking input level');
});

When('the input is too loud and clips', async ({ app }) => {
  // The fake microphone plays a tone at -12 dBFS (0.25); 8x drives it far past full scale.
  await app.setInputGain(8);
});

Then('the current input level is shown', async ({ app }) => {
  const meter = app.page.getByTestId('input-level');
  await expect(meter).toBeVisible();
  await expect.poll(async () => Number(await meter.getAttribute('value'))).toBeGreaterThan(0.1);
});

Then('the user is told that the input is clipping', async ({ app }) => {
  await expect(app.page.getByTestId('clipping-warning')).toBeVisible();
});
