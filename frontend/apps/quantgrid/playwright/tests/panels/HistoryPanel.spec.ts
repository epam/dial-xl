/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_editor';

const tableRow = 2;

const tableColumn = 2;

const tableName = 'Table1';

const table2Row = 2;

const table2Column = 10;

const table2Name = 'Table2';

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!placement(${tableRow}, ${tableColumn})\ntable ${tableName}\n[Field1] = 5\n[Field2] = 7\n[Field3] = 4\n[Field4] = 10`;
  const table2Dsl = `!placement(${table2Row}, ${table2Column})\ntable ${table2Name}\n[Field1] = 5\n key [Field2] = 7\n[Field3] = 4\ndim [Field4] = 10`;
  await TestFixtures.createProject(
    browser,
    projectName,
    tableRow,
    tableColumn,
    tableName,
    table1Dsl,
    table2Dsl
  );
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test('rename table', async ({ page }) => {});

test('delete table', async ({ page }) => {});

test('move table', async ({ page }) => {});

test('add key', async ({ page }) => {});

test('add field', async ({ page }) => {});

test('remove field', async ({ page }) => {});

test('edit formula', async ({ page }) => {});

test('add overwrite', async ({ page }) => {});

test('remove overwrite', async ({ page }) => {});

test('change dsl', async ({ page }) => {});
