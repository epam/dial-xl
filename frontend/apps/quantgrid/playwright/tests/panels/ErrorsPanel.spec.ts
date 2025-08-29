/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_errors');

const tableRow = 2;

const tableColumn = 2;

const tableName = 'Table1';

const table2Row = 2;

const table2Column = 10;

const table2Name = 'Table2';

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${tableRow}, ${tableColumn}, "title", "headers")\ntable ${tableName}\n[Field1] = 5\n[Field2] = 7\n[Field3] = 4\n[Field4] = 10`;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 5\n key [Field2] = 7\n[Field3] = 4\ndim [Field4] = 10`;
  await TestFixtures.createProject(
    storagePath,
    browser,
    projectName,
    tableRow,
    tableColumn,
    tableName,
    table1Dsl,
    table2Dsl
  );
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

test.describe('error panel', () => {
  test('invalid table declaration', async () => {});

  test('invalid field declaration', async () => {});
});
