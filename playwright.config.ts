import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import { fileURLToPath } from 'node:url';

const fakeMicFile = fileURLToPath(new URL('./tests/fixtures/audio/sine-440-normal.wav', import.meta.url));

// Chromium with a fake microphone that plays a known test file (docs/06-test-strategy.md §5).
const chromiumLaunch = {
  // Local sandboxes may provide their own Chromium build; CI uses Playwright's.
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-audio-capture=${fakeMicFile}`,
  ],
};

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'tests/steps/**/*.ts',
  // Scenarios without step definitions yet are reported as skipped ("pending"), not as failures.
  missingSteps: 'skip-scenario',
});

// Tier 2 browsers (NFR-CMP-003) only run when requested; they never block a release.
const tier2 = process.env.PW_TIER2
  ? [
      { name: 'tier2-firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'tier2-webkit', use: { ...devices['Desktop Safari'] } },
    ]
  : [];

// BASE_URL is set when testing an already deployed app (smoke test after deploy); then no local server is started.
const deployedUrl = process.env.BASE_URL;

export default defineConfig({
  testDir,
  grepInvert: /@manual/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retries are allowed in CI only so that flaky tests are *reported* as flaky (P7), never hidden.
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'reports/acceptance.json' }]],
  use: {
    baseURL: deployedUrl ?? 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    // Tier 1 (NFR-CMP-001): Chrome desktop and Chrome on Android (emulated; real phone = manual charters).
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
    { name: 'chromium-android', use: { ...devices['Pixel 7'], launchOptions: chromiumLaunch } },
    ...tier2,
  ],
  webServer: deployedUrl
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
      },
});
