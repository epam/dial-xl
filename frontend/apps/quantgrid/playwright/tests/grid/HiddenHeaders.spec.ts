/* eslint-disable playwright/expect-expect */
import test, { BrowserContext, Page } from '@playwright/test';

import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_hiddenheaders');

const table1Row = 2;

const table1Column = 8;

const table1Name = 'Table1';

const spreadsheet: SpreadSheet = new SpreadSheet();

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  spreadsheet.addTable(Table1);
  await TestFixtures.createProjectNew(
    storagePath,
    browser,
    projectName,
    spreadsheet
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

test.describe('hidden headers', () => {
  test('hide a table header', async () => {});

  test('hide a field header', async () => {});

  test('show a table header', async () => {});

  test('show a field header', async () => {});

  test('table menu available with hidden fields', async () => {});

  test('field menu available with hidden table header', async () => {});

  test('add overwrite without headers', async () => {});

  test('change formula without header', async () => {});
});
