/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_settingsmenu');

let browserContext: BrowserContext;

let page: Page;

const storagePath = TestFixtures.getStoragePath();

test.beforeAll(async ({ browser }) => {
  browserContext = await browser.newContext({ storageState: storagePath });
  await TestFixtures.createEmptyProject(
    storagePath,
    browserContext,
    projectName,
  );
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browserContext, projectName);
  await browserContext.close();
});

test.describe('clear sheet history', () => {
  test('clear sheet history', async () => {});
});
