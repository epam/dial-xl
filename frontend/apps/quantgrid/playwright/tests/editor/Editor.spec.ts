/* eslint-disable playwright/expect-expect */
import fs from 'fs';

import { BrowserContext, expect, Page, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_editor');

let tableRow = 2;

let tableColumn = 2;

let tableName = 'TableX';

let tableDslSize = 6;

const table2Row = 2;

const table2Column = 10;

const table2Name = 'ForIndexes';

const storagePath = `playwright/${projectName}.json`;

let browserContext: BrowserContext;

let page: Page;

test.beforeAll(async ({ browser }, testInfo) => {
  const table1Dsl = `!layout(${tableRow}, ${tableColumn}, "title", "headers")\ntable ${tableName}\n[Field1] = 5\n[Field2] = 7\n[Field3] = 4\n[Field4] = 10\n`;
  tableDslSize = table1Dsl.split('\n').length;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 5\n key [Field2] = 7\n[Field3] = RANGE(6)\ndim [Field4] = RANGE(4)`;
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
  browserContext = await browser.newContext({
    storageState: storagePath,
    /* recordVideo: {
      dir: testInfo.outputPath('videos'),
    },*/
  });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async (testInfo) => {
  //  const videoPath = testInfo.outputPath('my-video.webm');
  await page.close();
});

test.afterAll(async ({ browser }, testInfo) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('editor', () => {
  //change placement layout
  test('edit placement row in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const newRow = 4;
    await projectPage
      .getEditor()
      .setTokenValue(0, 9, tableRow.toString().length, newRow.toString());
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectTableHeaderToDissapear(tableRow, tableColumn);
    await projectPage
      .getVisualization()
      .expectTableHeaderToAppear(newRow, tableColumn);
    tableRow = newRow;
  });

  test('edit placement column in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const newColumn = 4;
    await projectPage
      .getEditor()
      .setTokenValue(
        0,
        12,
        tableColumn.toString().length,
        newColumn.toString()
      );
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectTableHeaderToDissapear(tableRow, tableColumn);
    await projectPage
      .getVisualization()
      .expectTableHeaderToAppear(tableRow, newColumn);
    tableColumn = newColumn;
  });
  //change tableName
  test('edit table name in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const newName = 'TableNew';
    await projectPage
      .getEditor()
      .setTokenValue(1, 12, tableName.length, newName);
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectCellTextChange(tableRow, tableColumn, newName);
    tableName = newName;
  });
  //change fieldName
  test('edit table field name in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const newName = 'ChangedName';
    await projectPage.getEditor().setTokenValue(2, 7, 6, newName);
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectCellTextChange(tableRow + 1, tableColumn, newName);
  });
  //change fieldValue
  test('edit table field value in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const newName = '8';
    await projectPage.getEditor().setTokenValue(3, 12, 1, newName);
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .clickOnCell(tableRow + 1, tableColumn + 1);
    await expect(projectPage.getFormula()).toHaveText('=' + newName);
  });

  //delete field
  test('delete field in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getEditor().setTokenValue(5, 13, 13, '');
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectTableToDissapear(tableRow + 1, tableColumn + 3);
    tableDslSize--;
  });
  //add key
  test('add key in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getEditor().setTokenValue(tableDslSize + 3, 0, 0, 'key ');
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectFieldToBeKey(table2Row + 1, table2Column);
  });
  //remove key
  test('remove key in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getEditor().setTokenValue(tableDslSize + 4, 4, 4, '');
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectFieldNotBeKey(table2Row + 1, table2Column + 1);
  });
  //add dim
  test('add dimension in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getEditor().setTokenValue(tableDslSize + 5, 0, 0, 'dim ');
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectCellToNotBeDim(table2Row + 2, table2Column + 2);
    await projectPage
      .getVisualization()
      .expectFieldIsDimension(table2Row + 1, table2Column + 2);
  });
  //remove dim
  test('remove dimension in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getEditor().setTokenValue(tableDslSize + 6, 4, 4, '');
    await projectPage.getEditor().saveDsl();
    await projectPage
      .getVisualization()
      .expectCellToBeDim(table2Row + 2, table2Column + 3);
    await projectPage
      .getVisualization()
      .expectFieldIsNotDimension(table2Row + 1, table2Column + 3);
  });
  //add new table
  test('add new table in dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.addDSL(
      '!layout(1, 1, "title", "headers")\ntable NewTable\n[Field1] = 3'
    );
    await projectPage.getVisualization().expectTableHeaderToAppear(1, 1);
  });
  //cancel last change
  //create table with existing name
  //create field with existing name
  //add overwrite
  //delete overwrite
});
