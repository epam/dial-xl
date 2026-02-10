/* eslint-disable playwright/expect-expect */
import test, { BrowserContext, Page } from '@playwright/test';

import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_to_share');

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  await TestFixtures.createEmptyProject(storagePath, browser, projectName);
  browserContext = await browser.newContext({ storageState: storagePath });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('sharing projects tests', () => {
  test('share project and check visibility', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check it not available for edit', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project with editing permissions and check it can be edited', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and then unshare it', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check it cant be deleted', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and rename it', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check updates in grid', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check updates in editor', async () => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and modify concurrently', async () => {
    await TestFixtures.openProject(page, projectName);
  });
});
