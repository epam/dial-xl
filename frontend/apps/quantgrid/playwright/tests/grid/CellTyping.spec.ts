/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_fields';

test.beforeAll(async ({ browser }) => {
  await TestFixtures.createEmptyProject(browser, projectName);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test('create table with 1 field', async ({ page }) => {});

test('add field to table', async ({ page }) => {});

test('add overwrite', async ({ page }) => {});

test('rename table', async ({ page }) => {});
