/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { GridMenuItem } from '../../enums/GridMenuItem';
import { MoveDirection } from '../../enums/MoveDirection';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_tables');

const table1Row = 2;

const table1Column = 6;

let table1Name = 'Table1';

const table2Row = 2;

const table2Column = 2;

const table2Name = 'ForDeleteTest';

const table3Name = 'ForDeleteHotKey';

const table3Row = 12;

const table3Column = 3;

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${table1Row}, ${table1Column}, "title", "headers")\ntable ${table1Name}\n[Field1] = 1\n[Field2] = 9\n`;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 5\n[Field2] = 4\n`;
  const table3Dsl = `!layout(${table3Row}, ${table3Column}, "title", "headers")\ntable ${table3Name}\n[Field1] = 5\n[Field2] = 7\n`;
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
    table1Row,
    table1Column
  );
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('table actions', () => {
  test('open project and check it present in the project list and title', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    await projectPage.projectShouldBeInProjectsTree(projectName);
    await projectPage.titleShouldContainProjectName(projectName);
  });

  test('check grid dimensions', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.assertGridDimensions(100000, 1000);
  });

  test('click on grid row', async () => {});

  test('click on grid column', async () => {});

  test('selection on click', async () => {
    const row = 2,
      column = 2;
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(row, column);
    await projectPage.checkGridSelectionIndexes(row, column);
  });

  test('table renaming', async () => {
    const newName = 'RenamedTable1';
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Rename);
    await projectPage.getVisualization().expectCellBecameEditable(table1Name);
    await projectPage.getVisualization().setCellValue(newName);
    await projectPage
      .getVisualization()
      .expectCellTextChange(table1Row, table1Column, newName);
    table1Name = newName;
  });

  test('table start renaming and cancel', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Rename);
    await projectPage.getVisualization().expectCellBecameEditable(table1Name);
    const newName = 'RenamedTableNotToSave';
    await projectPage.getVisualization().setCellValueAndCancel(newName);
    const tmp = table1Name;
    table1Name = newName;
    await projectPage
      .getVisualization()
      .expectCellTextChange(table1Row, table1Column, tmp);
    table1Name = tmp;
  });

  test('table renaming through F2', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table1Row, table1Column);
    await page.keyboard.press('F2');
    await projectPage.getVisualization().expectCellBecameEditable(table1Name);
    const newName = 'RenamedTableKeys';
    await projectPage.getVisualization().setCellValue(newName);
    await projectPage
      .getVisualization()
      .expectCellTextChange(table1Row, table1Column, newName);
    table1Name = newName;
  });

  test('move table left', async () => {
    /*   const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getVisualization().expectMoveSelectionToBeVisible();
    await projectPage.getVisualization().moveCurrentTable(MoveDirection.LEFT);
    await projectPage
      .getVisualization()
      .verifyTableMove(table1Row, table1Column, table1Name, MoveDirection.LEFT);
    table1Column = table1Column - 1;*/
  });

  test('move table right', async () => {
    /*  const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getVisualization().expectMoveSelectionToBeVisible();
    await projectPage.getVisualization().moveCurrentTable(MoveDirection.RIGHT);
    await projectPage
      .getVisualization()
      .verifyTableMove(
        table1Row,
        table1Column,
        table1Name,
        MoveDirection.RIGHT
      );
    table1Column = table1Column + 1;*/
  });

  test('move table up', async () => {
    /* const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getVisualization().expectMoveSelectionToBeVisible();
    await projectPage.getVisualization().moveCurrentTable(MoveDirection.UP);
    await projectPage
      .getVisualization()
      .verifyTableMove(table1Row, table1Column, table1Name, MoveDirection.UP);
    table1Row = table1Row - 1;*/
  });

  test('move table down', async () => {
    /*  const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getVisualization().expectMoveSelectionToBeVisible();
    await projectPage.getVisualization().moveCurrentTable(MoveDirection.DOWN);
    await projectPage
      .getVisualization()
      .verifyTableMove(table1Row, table1Column, table1Name, MoveDirection.DOWN);
    table1Row = table1Row + 1;*/
  });

  test('create derived table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table1Row, table1Column, GridMenuItem.CreateDerived);
    await projectPage
      .getVisualization()
      .expectTableToAppear(table1Row, table1Column + 3);
  });

  test('delete table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuAction(table2Row, table2Column, GridMenuItem.Delete);
    await projectPage
      .getVisualization()
      .expectTableToDissapear(table2Row, table2Column);
  });

  test('delete table by hotkey', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table3Row, table3Column);
    await page.keyboard.press('Delete');
    await projectPage
      .getVisualization()
      .expectTableToDissapear(table3Row, table3Column);
  });

  test('context menu', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table1Row, table1Column);
    await page.keyboard.press('ContextMenu');
    await projectPage.getVisualization().expectContextMenuVisible();
  });
});
