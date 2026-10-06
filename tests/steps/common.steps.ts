import { Given } from './fixtures';

Given('the app is open', async ({ page }) => {
  await page.goto('/');
});
