/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_paste');

const table1Row = 2;

const table1Column = 2;

const table1Name = 'MultiFieldsTable1';

const table2Row = 2;

const table2Column = 6;

//const table2Size = 3;

const table2Name = 'MultiFieldsTable2';

const table3Row = 2;

const table3Column = 10;

const table3Name = 'TableForSwaps';

//let table3Size = 4;

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${table1Row}, ${table1Column}, "title", "headers")\ntable ${table1Name}\nkey [Field1] = 1\n[Field2] = 7\ndim [Field3] = 3\n`;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n`;
  const table3Dsl = `!layout(${table3Row}, ${table3Column}, "title", "headers")\ntable ${table3Name}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n[Field4] = 10\n`;
  await TestFixtures.createProject(
    storagePath,
    browser,
    projectName,
    table3Row,
    table3Column,
    table3Name,
    table1Dsl,
    table2Dsl,
    table3Dsl
  );
  browserContext = await browser.newContext({ storageState: storagePath });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectCellTableToBeDisplayed(
    page,
    table2Row,
    table2Column
  );
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('copy paste', () => {
  test('copy and paste a single value', async () => {});

  test('paste multi values into a row', async () => {});

  test('paste multi values into a column', async () => {});

  test('paste multi values into a rectangle area', async () => {});

  test('paste multi values into a row behind borders', async () => {});

  test('paste multi values into a column behind borders(manual table)', async () => {});

  test('paste a value into a field header', async () => {});

  test('paste a value into a table header', async () => {});
});
