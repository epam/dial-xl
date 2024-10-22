/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

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

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!placement(${table1Row}, ${table1Column})\ntable ${table1Name}\nkey [Field1] = 1\n[Field2] = 7\ndim [Field3] = 3\n`;
  const table2Dsl = `!placement(${table2Row}, ${table2Column})\ntable ${table2Name}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n`;
  const table3Dsl = `!placement(${table3Row}, ${table3Column})\ntable ${table3Name}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n[Field4] = 10\n`;
  await TestFixtures.createProject(
    browser,
    projectName,
    table3Row,
    table3Column,
    table3Name,
    table1Dsl,
    table2Dsl,
    table3Dsl
  );
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectCellTableToBeDisplayed(
    page,
    table2Row,
    table2Column
  );
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('copy paste', () => {
  test('copy and paste a single value', async ({ page }) => {});

  test('paste multi values into a row', async ({ page }) => {});

  test('paste multi values into a column', async ({ page }) => {});

  test('paste multi values into a rectangle area', async ({ page }) => {});

  test('paste multi values into a row behind borders', async ({ page }) => {});

  test('paste multi values into a column behind borders(manual table)', async ({
    page,
  }) => {});

  test('paste a value into a field header', async ({ page }) => {});

  test('paste a value into a table header', async ({ page }) => {});
});
