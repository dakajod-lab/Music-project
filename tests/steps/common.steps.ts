import { Given } from './fixtures';

Given('the app is open', async ({ app }) => {
  await app.open();
});
