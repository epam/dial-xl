/* eslint-disable playwright/expect-expect */
import * as path from 'path';

import test, { BrowserContext, expect, Page } from '@playwright/test';

import { ShareForm } from '../../components/ShareForm';
import { FileMenuItems } from '../../enums/FileMenuItems';
import { MenuItems } from '../../enums/MenuItems';
import { ProjectPage } from '../../pages/ProjectPage';
import { ProjectSelection } from '../../pages/ProjectSelection';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_to_share');

const secondUsername = process.env['QUANTGRID_TEST_USERNAME2'];
const secondPassword = process.env['QUANTGRID_TEST_PASSWORD'];
const authType = process.env['AUTH_TYPE'];

let browserContext: BrowserContext;
let browserContext2: BrowserContext;

let page: Page;
let secondPage: Page;

const storagePath = TestFixtures.getStoragePath();

test.beforeAll(async ({ browser }) => {
  browserContext2 = await browser.newContext();
  secondPage = await browserContext2.newPage();
  await secondPage.goto('/');
  await TestFixtures.performLogin(
    secondPage,
    secondUsername,
    secondPassword,
    authType,
  );
  const startPage = new ProjectSelection(secondPage);
  await expect(startPage.getWelcomeElement()).toBeVisible();
  await secondPage.close();
  browserContext = await browser.newContext({ storageState: storagePath });
  await TestFixtures.createEmptyProject(
    storagePath,
    browserContext,
    projectName,
  );
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  secondPage = await browserContext2.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async () => {
  await page.close();
  await secondPage.close();
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browserContext, projectName);
  await browserContext.close();
  await browserContext2.close();
});

test.describe('sharing projects tests', () => {
  test('share project and check visibility', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.performMenuCommand(
      MenuItems.File,
      FileMenuItems.ShareProject,
    );
    const sharingForm = new ShareForm(page);
    const link = await sharingForm.getShareLink();
    await secondPage.goto(link);
    const projectPageShared = await ProjectPage.createInstance(secondPage);
    await projectPageShared.titleShouldContainProjectName(projectName);
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
