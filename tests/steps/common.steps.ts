import { Given } from './fixtures';

Given('the app is open', async ({ page }) => {
  // Relative path, so it also works when the app is deployed under /<repo-name>/.
  await page.goto('./');
});
