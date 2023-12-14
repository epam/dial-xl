/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_editor';

let tableRow = 2;

let tableColumn = 2;

let tableName = 'TableX';

let tableDslSize = 6;

const table2Row = 2;

const table2Column = 10;

const table2Name = 'ForIndexes';

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

//change placement
test('edit placement row in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const newRow = 4;
  await projectPage
    .getEditor()
    .setTokenValue(0, 12, tableRow.toString().length, newRow.toString());
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectTableHeaderToDissapear(tableRow, tableColumn);
  await projectPage.getGrid().expectTableHeaderToAppear(newRow, tableColumn);
  tableRow = newRow;
});

test('edit placement column in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const newColumn = 4;
  await projectPage
    .getEditor()
    .setTokenValue(0, 15, tableColumn.toString().length, newColumn.toString());
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectTableHeaderToDissapear(tableRow, tableColumn);
  await projectPage.getGrid().expectTableHeaderToAppear(tableRow, newColumn);
  tableColumn = newColumn;
});
//change tableName
test('edit table name in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const newName = 'TableNew';
  await projectPage.getEditor().setTokenValue(1, 12, tableName.length, newName);
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectCellTextChange(tableRow, tableColumn, newName);
  tableName = newName;
});
//change fieldName
test('edit table field name in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const newName = 'ChangedName';
  await projectPage.getEditor().setTokenValue(2, 7, 6, newName);
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectCellTextChange(tableRow + 1, tableColumn, newName);
});
//change fieldValue
test('edit table field value in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const newName = '8';
  await projectPage.getEditor().setTokenValue(3, 12, 1, newName);
  await projectPage.getEditor().saveDsl();
  await projectPage.getGrid().clickOnCell(tableRow + 1, tableColumn + 1);
  await expect(projectPage.getFormula()).toHaveText(newName);
});

//delete field
test('delete field in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getEditor().setTokenValue(5, 13, 13, '');
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectTableToDissapear(tableRow + 1, tableColumn + 3);
  tableDslSize--;
});
//add key
test('add key in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getEditor().setTokenValue(tableDslSize + 3, 0, 0, 'key ');
  await projectPage.getEditor().saveDsl();
  await projectPage.getGrid().expectFieldToBeKey(table2Row + 1, table2Column);
});
//remove key
test('remove key in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getEditor().setTokenValue(tableDslSize + 4, 4, 4, '');
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectFieldNotBeKey(table2Row + 1, table2Column + 1);
});
//add dim
test('add dimension in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getEditor().setTokenValue(tableDslSize + 5, 0, 0, 'dim ');
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectFieldIsDimension(table2Row + 1, table2Column + 2);
});
//remove dim
test('remove dimension in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getEditor().setTokenValue(tableDslSize + 6, 4, 4, '');
  await projectPage.getEditor().saveDsl();
  await projectPage
    .getGrid()
    .expectFieldIsNotDimension(table2Row + 1, table2Column + 3);
});
//add new table
test('add new table in dsl', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  projectPage.addDSL('!placement(1, 15)\ntable NewTable\n[Field1] = 3');
  await projectPage.getGrid().expectTableHeaderToAppear(1, 15);
});
//cancel last change
//create table with existing name
//create field with existing name
//add overwrite
//delete overwrite
