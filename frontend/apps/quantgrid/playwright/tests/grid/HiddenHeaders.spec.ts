/* eslint-disable playwright/expect-expect */
import test from '@playwright/test';

import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_hiddenheaders');

const table1Row = 2;

const table1Column = 8;

const table1Name = 'Table1';

const spreadsheet: SpreadSheet = new SpreadSheet();

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  spreadsheet.addTable(Table1);
  await TestFixtures.createProjectNew(browser, projectName, spreadsheet);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('hidden headers', () => {
  test('hide a table header', async ({ page }) => {});

  test('hide a field header', async ({ page }) => {});

  test('show a table header', async ({ page }) => {});

  test('show a field header', async ({ page }) => {});

  test('table menu available with hidden fields', async ({ page }) => {});

  test('field menu available with hidden table header', async ({ page }) => {});

  test('add overwrite without headers', async ({ page }) => {});

  test('change formula without header', async ({ page }) => {});
});
