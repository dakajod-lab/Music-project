import { expect } from '@playwright/test';
import { Then } from './fixtures';

Then('the app runs in a secure context', async ({ page }) => {
  // True for HTTPS, and for localhost during local tests. The post-deploy smoke test checks the real HTTPS site.
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
  const { protocol, hostname } = new URL(page.url());
  if (hostname !== 'localhost') expect(protocol).toBe('https:');
});
