/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { GridMenuItem } from '../../enums/GridMenuItem';
import { MoveDirection } from '../../enums/MoveDirection';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_tables');

let table1Row = 2;

let table1Column = 6;

let table1Name = 'Table1';

const table2Row = 2;

const table2Column = 2;

const table2Name = 'ForDeleteTest';

const table3Name = 'ForDeleteHotKey';

const table3Row = 2;

const table3Column = 13;

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!placement(${table1Row}, ${table1Column})\ntable ${table1Name}\n[Field1] = 1\n[Field2] = 9\n`;
  const table2Dsl = `!placement(${table2Row}, ${table2Column})\ntable ${table2Name}\n[Field1] = 5\n[Field2] = 4\n`;
  const table3Dsl = `!placement(${table3Row}, ${table3Column})\ntable ${table3Name}\n[Field1] = 5\n[Field2] = 7\n`;
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
    table1Row,
    table1Column
  );
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('table actions', () => {
  test('open project and check it present in the project list and title', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.projectShouldBeInProjectsTree(projectName);
    await projectPage.titleShouldContainProjectName(projectName);
  });

  test('check grid dimensions', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.assertGridDimensions(100000, 1000);
  });

  test('selection on click', async ({ page }) => {
    const row = 2,
      column = 2;
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(row, column);
    await projectPage.checkGridSelectionIndexes(row, column);
  });

  test('table renaming', async ({ page }) => {
    const newName = 'RenamedTable1';
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Rename);
    await projectPage.getGrid().expectCellBecameEditable(table1Name);
    await projectPage.getGrid().setCellValue(newName);
    await projectPage
      .getGrid()
      .expectCellTextChange(table1Row, table1Column, newName);
    table1Name = newName;
  });

  test('table start renaming and cancel', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Rename);
    await projectPage.getGrid().expectCellBecameEditable(table1Name);
    const newName = 'RenamedTableNotToSave';
    await projectPage.getGrid().setCellValueAndCancel(newName);
    const tmp = table1Name;
    table1Name = newName;
    await projectPage
      .getGrid()
      .expectCellTextChange(table1Row, table1Column, tmp);
    table1Name = tmp;
  });

  test('table renaming through F2', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table1Row, table1Column);
    await page.keyboard.press('F2');
    await projectPage.getGrid().expectCellBecameEditable(table1Name);
    const newName = 'RenamedTableKeys';
    await projectPage.getGrid().setCellValue(newName);
    await projectPage
      .getGrid()
      .expectCellTextChange(table1Row, table1Column, newName);
    table1Name = newName;
  });

  test('move table left', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getGrid().expectMoveSelectionToBeVisible();
    await projectPage.getGrid().moveCurrentTable(MoveDirection.LEFT);
    await projectPage
      .getGrid()
      .verifyTableMove(table1Row, table1Column, table1Name, MoveDirection.LEFT);
    table1Column = table1Column - 1;
  });

  test('move table right', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getGrid().expectMoveSelectionToBeVisible();
    await projectPage.getGrid().moveCurrentTable(MoveDirection.RIGHT);
    await projectPage
      .getGrid()
      .verifyTableMove(
        table1Row,
        table1Column,
        table1Name,
        MoveDirection.RIGHT
      );
    table1Column = table1Column + 1;
  });

  test('move table up', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getGrid().expectMoveSelectionToBeVisible();
    await projectPage.getGrid().moveCurrentTable(MoveDirection.UP);
    await projectPage
      .getGrid()
      .verifyTableMove(table1Row, table1Column, table1Name, MoveDirection.UP);
    table1Row = table1Row - 1;
  });

  test('move table down', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.Move);
    await projectPage.getGrid().expectMoveSelectionToBeVisible();
    await projectPage.getGrid().moveCurrentTable(MoveDirection.DOWN);
    await projectPage
      .getGrid()
      .verifyTableMove(table1Row, table1Column, table1Name, MoveDirection.DOWN);
    table1Row = table1Row + 1;
  });

  test('create derived table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table1Row, table1Column, GridMenuItem.CreateDerived);
    await projectPage
      .getGrid()
      .expectTableToAppear(table1Row, table1Column + 3);
  });

  test('delete table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getGrid()
      .performMenuAction(table2Row, table2Column, GridMenuItem.Delete);
    await projectPage.getGrid().expectTableToDissapear(table2Row, table2Column);
  });

  test('delete table by hotkey', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table3Row, table3Column);
    await page.keyboard.press('Delete');
    await projectPage.getGrid().expectTableToDissapear(table3Row, table3Column);
  });

  test('context menu', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table1Row, table1Column);
    await page.keyboard.press('ContextMenu');
    await projectPage.getGrid().expectContextMenuVisible();
  });
});
