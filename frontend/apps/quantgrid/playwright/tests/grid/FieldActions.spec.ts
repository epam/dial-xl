/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_fields';

const table1Row = 2;

const table1Column = 2;

const table1Name = 'MultiFieldsTable1';

const table2Row = 2;

const table2Column = 6;

let table2Size = 3;

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
  await TestFixtures.expectTableToBeDisplayed(
    page,
    table2Row + 1,
    table2Column
  );
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test('verify fields names', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await expect(
    projectPage.getGrid().getCellTableText(table1Row + 1, table1Column)
  ).toHaveText('Field1');
  await expect(
    projectPage.getGrid().getCellTableText(table1Row + 1, table1Column + 1)
  ).toHaveText('Field2');
  await expect(
    projectPage.getGrid().getCellTableText(table1Row + 1, table1Column + 2)
  ).toHaveText('Field3');
});

test('rename field', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table2Row + 1, table2Column, 'Rename field');
  const newName = 'Field1New';
  await projectPage.getGrid().setCellValue(newName);
  await projectPage
    .getGrid()
    .expectCellTextChange(table2Row + 1, table2Column, newName);
});

test('rename field by hotkey Alt+F2', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(table2Row + 1, table2Column);
  await page.keyboard.press('Alt+F2');
  const newName = 'Field1HotKey';
  await projectPage.getGrid().setCellValue(newName);
  await projectPage
    .getGrid()
    .expectCellTextChange(table2Row + 1, table2Column, newName);
});

test('start renaming field and cancel', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const fieldValue = await projectPage
    .getGrid()
    .getCellTableText(table2Row + 1, table2Column)
    .textContent();
  await projectPage
    .getGrid()
    .performCellAction(table2Row + 1, table2Column, 'Rename field');
  const newName = 'Field1Cancel';
  await projectPage.getGrid().setCellValueAndCancel(newName);
  await projectPage
    .getGrid()
    .expectCellTextChange(table2Row + 1, table2Column, fieldValue || '');
});

test('delete field by menu', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table2Row + 1, table2Column + 1, 'Delete field');
  await projectPage
    .getGrid()
    .expectTableToDissapear(table2Row + 1, table2Column + table2Size - 1);
  table2Size--;
});

test('delete field by hotkey Delete', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(table2Row + 1, table2Column + 1);
  await page.keyboard.press('Delete');
  await projectPage
    .getGrid()
    .expectTableToDissapear(table2Row + 1, table2Column + table2Size - 1);
  table2Size--;
});

test('swap left', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const curFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 1)
    .textContent();
  const leftFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column)
    .textContent();
  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column + 1, 'Swap left');
  await projectPage
    .getGrid()
    .expectCellTextChange(table3Row + 1, table3Column, curFieldValue || '');
  await projectPage
    .getGrid()
    .expectCellTextChange(
      table3Row + 1,
      table3Column + 1,
      leftFieldValue || ''
    );
});

test('swap right', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const curFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 2)
    .textContent();
  const rightFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 3)
    .textContent();
  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column + 2, 'Swap right');
  await projectPage
    .getGrid()
    .expectCellTextChange(table3Row + 1, table3Column + 3, curFieldValue || '');
  await projectPage
    .getGrid()
    .expectCellTextChange(
      table3Row + 1,
      table3Column + 2,
      rightFieldValue || ''
    );
});

test('swap left by hotkey Shift+Alt+ArrowLeft', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const curFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 1)
    .textContent();
  const leftFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column)
    .textContent();
  await projectPage.getGrid().clickOnCell(table3Row + 1, table3Column + 1);
  await page.keyboard.press('Shift+Alt+ArrowLeft');
  await projectPage
    .getGrid()
    .expectCellTextChange(table3Row + 1, table3Column, curFieldValue || '');
  await projectPage
    .getGrid()
    .expectCellTextChange(
      table3Row + 1,
      table3Column + 1,
      leftFieldValue || ''
    );
});

test('swap right by hotkey Shift+Alt+ArrowRight', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const curFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 2)
    .textContent();
  const rightFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 3)
    .textContent();
  await projectPage.getGrid().clickOnCell(table3Row + 2, table3Column + 2);
  await page.keyboard.press('Shift+Alt+ArrowRight');
  await projectPage
    .getGrid()
    .expectCellTextChange(table3Row + 1, table3Column + 3, curFieldValue || '');
  await projectPage
    .getGrid()
    .expectCellTextChange(
      table3Row + 1,
      table3Column + 2,
      rightFieldValue || ''
    );
});

test('swap left for the very left column', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const curFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column)
    .textContent();
  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column, 'Swap left');
  await projectPage
    .getGrid()
    .expectCellTextChange(table3Row + 1, table3Column, curFieldValue || '');
});

test('swap right for the very right column', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  const curFieldValue = await projectPage
    .getGrid()
    .getCellTableText(table3Row + 1, table3Column + 3)
    .textContent();
  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column + 3, 'Swap right');
  await projectPage
    .getGrid()
    .expectCellTextChange(table3Row + 1, table3Column + 3, curFieldValue || '');
});

test('edit formula', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column, 'Edit formula');
  await new Promise((resolve) => setTimeout(resolve, 300));
  const newValue = '222';
  await projectPage.getGrid().setCellValue(newValue);
  await expect(projectPage.getFormula()).toHaveText(newValue);
});

test('edit formula by hotkey F2', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(table3Row + 1, table3Column);
  await page.keyboard.press('F2');
  const newValue = '111';
  await projectPage.getGrid().setCellValue(newValue);
  await projectPage.getGrid().clickOnCell(table3Row + 1, table3Column);
  await expect(projectPage.getFormula()).toHaveText(newValue);
});

test('add key', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column, 'Add key');

  await projectPage.getGrid().expectFieldToBeKey(table3Row + 1, table3Column);

  await projectPage
    .getGrid()
    .performCellAction(table3Row + 1, table3Column, 'Remove key');
});

test('remove key', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table1Row + 1, table1Column, 'Remove key');

  await projectPage.getGrid().expectFieldNotBeKey(table1Row + 1, table1Column);
});

//add dimension
test('add dimension', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table1Row + 1, table1Column + 1, 'Add dimension');

  await projectPage
    .getGrid()
    .expectFieldIsDimension(table1Row + 1, table1Column + 1);

  await projectPage
    .getGrid()
    .performCellAction(table1Row + 1, table1Column + 1, 'Remove dimension');
});

test('remove dimension', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage
    .getGrid()
    .performCellAction(table1Row + 1, table1Column + 2, 'Remove dimension');

  await projectPage
    .getGrid()
    .expectFieldIsNotDimension(table1Row + 1, table1Column + 2);
});
//add overwrite
//remove overwrite
