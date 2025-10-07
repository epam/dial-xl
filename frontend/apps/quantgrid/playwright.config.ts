// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { config } from 'dotenv';

import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

config();

const fromRoot = (...p: string[]) => path.join(workspaceRoot, ...p);
const authFile = path.join(workspaceRoot, 'playwright', '.auth', 'user.json');
fs.mkdirSync(path.dirname(authFile), { recursive: true });

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL =
  process.env['BASE_URL'] || 'https://quantgrid-dev.staging.deltixhub.io/'; //'http://localhost:4200';

const jobID = process.env['CI_JOB_ID'] || '0';

const workersCount = parseInt(process.env['WORKER_COUNT'] || '4');

const PW_GREP = process.env.PW_GREP;
const grep = PW_GREP ? new RegExp(PW_GREP) : undefined;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './playwright' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  reporter: [
    ['list'],
    ['allure-playwright', { resultsDir: fromRoot('allure-results') }],
    ['blob', { outputFile: fromRoot('blob-report', `report-${jobID}.zip`) }],
  ],
  outputDir: fromRoot('test-results'),
  fullyParallel: false,
  workers: workersCount,
  use: {
    actionTimeout: 20000,
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    contextOptions: {
      recordVideo: {
        dir: fromRoot('test-results', 'videos'),
      },
    },
  },
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  expect: {
    timeout: 20000,
  },
  /* Run your local dev server before starting the tests */ // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  //   cwd: workspaceRoot,
  // },
  /* Configure projects for major browsers */
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'clean' },
    {
      name: 'clean',
      testMatch: /.*\.teardown\.ts/,
      use: { storageState: authFile },
    },
    {
      name: 'chromium',
      grep,
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1920,
          height: 1080,
        },
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    /*{
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },*/

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    /*  {
       name: 'Google Chrome',
       use: { ...devices['Desktop Chrome'], channel: 'chrome' },
     },*/
  ],
});
