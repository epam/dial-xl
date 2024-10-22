/* eslint-disable playwright/expect-expect */
import test from '@playwright/test';

import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_to_share');

test.beforeAll(async ({ browser }) => {
  await TestFixtures.createEmptyProject(browser, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('sharing projects tests', () => {
  test('share project and check visibility', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check it not available for edit', async ({
    page,
  }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project with editing permissions and check it can be edited', async ({
    page,
  }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and then unshare it', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check it cant be deleted', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and rename it', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check updates in grid', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and check updates in editor', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });

  test('share project and modify concurrently', async ({ page }) => {
    await TestFixtures.openProject(page, projectName);
  });
});
