/* eslint-disable playwright/expect-expect */
import { expect, Page, test } from '@playwright/test';

import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_fields');

const table1Row = 2;

const table1Column = 8;

const table1Name = 'Table1';

const spreadsheet: SpreadSheet = new SpreadSheet();

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  Table1.addField(new Field('Field_F', '[Field1]-[Field2]'));
  spreadsheet.addTable(Table1);
  await TestFixtures.createProjectNew(browser, projectName, spreadsheet);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('cell typing', () => {
  test('create a table with custom name and with 1 field', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(3, 3);
    await projectPage.getGrid().setCellValue('x=5');
    await projectPage.getGrid().expectTableToAppear(2, 3);
    await projectPage.getGrid().expectCellTextChange(2, 3, 'x');
    await projectPage.getGrid().expectCellTextChange(3, 3, '5.0');
  });

  test('create a manual table with 1 field', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(3, 5);
    await projectPage.getGrid().setCellValue('5');
    await projectPage.getGrid().expectCellTextChange(3, 5, '5.0');
  });

  test('create table starting with =', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    const table = spreadsheet.getTable(0);
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue(
        `=${table.getName()}[${table.getField(0).getName()}]`,
        false,
        true
      );
    await projectPage.getGrid().getCellEditor().finishLine();
    await projectPage.getGrid().expectTableHeaderToAppear(8, 8);
    await projectPage.getGrid().expectCellToNotBeDim(10, 8);
  });

  test('create table starting with :', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 6);
    const table = spreadsheet.getTable(0);
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue(
        `:${table.getName()}[${table.getField(0).getName()}]`,
        false,
        true
      );
    await projectPage.getGrid().getCellEditor().finishLine();
    await projectPage.getGrid().expectTableHeaderToAppear(8, 6);
    await projectPage.getGrid().expectTableToAppear(10, 6);
    await projectPage.getGrid().expectCellToNotBeDim(10, 6);
  });

  test('create table using range formula and starting with : creates dim', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 10);
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue(':RANGE(3)', false, true);
    await projectPage.getGrid().getCellEditor().finishLine();
    await projectPage.getGrid().expectTableHeaderToAppear(8, 10);
    await projectPage.getGrid().expectTableToAppear(10, 10);
    await projectPage.getGrid().expectCellToNotBeDim(10, 10);
    await projectPage.getGrid().expectTableToAppear(12, 10);
  });

  test('create table using range formula and starting with = creates dim', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 12);
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue('=RANGE(3)', false, true);
    await projectPage.getGrid().getCellEditor().finishLine();
    await projectPage.getGrid().expectTableHeaderToAppear(8, 12);
    await projectPage.getGrid().expectTableToAppear(10, 12);
    await projectPage.getGrid().expectCellToNotBeDim(10, 12);
    await projectPage.getGrid().expectTableToAppear(12, 12);
  });

  test('add field to table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const row = spreadsheet.getTable(0).getTop() + 1;
    const column =
      spreadsheet.getTable(0).getLeft() + spreadsheet.getTable(0).width();
    await projectPage.clickOnGridCell(row, column);
    await projectPage.getGrid().setCellValue('Field3=5');
    await projectPage.getGrid().expectFieldHeaderToAppear(row, column);
    await projectPage.getGrid().expectTableToAppear(row + 1, column);
    spreadsheet.getTable(0).addField(new Field('Field3', '5'));
    await projectPage.getGrid().expectCellTextChange(row, column, 'Field3');
    await projectPage.getGrid().expectCellTextChange(row + 1, column, '5');
  });

  test('add override', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    const row = table.getTop() + 2;
    const column = table.getLeft() + 1;
    await projectPage.clickOnGridCell(row, column);
    const overrideValue = '22';
    await projectPage.getGrid().setCellValue(overrideValue);
    await expect(projectPage.getCellText(row, column)).toHaveText(
      overrideValue
    );
    table.createOverride(
      table.getField(1).getName(),
      new Map<number, string>()
    );
    table.addOverrideValue(table.getField(1).getName(), 1, overrideValue);
  });

  test('rename table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.clickOnGridCell(table.getTop(), table.getLeft());
    const newTableName = 'RenamedTable';
    await projectPage.getGrid().setCellValue(newTableName);
    await projectPage
      .getGrid()
      .expectCellTextChange(table.getTop(), table.getLeft(), newTableName);
    table.updateName(newTableName);
  });

  test('add operation to existing formula', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    let initialValue = await projectPage
      .getCellText(table.getFirstCellCoord(), table.getLeft() + 2)
      .textContent();
    initialValue = initialValue ? initialValue : '';
    await projectPage
      .getGrid()
      .dbClickOnCell(table.getFirstCellCoord(), table.getLeft() + 2);
    await projectPage.getGrid().getCellEditor().typeValue('+3', false, false);
    await projectPage.getGrid().getCellEditor().finishLine();
    await expect(
      projectPage.getCellText(table.getFirstCellCoord(), table.getLeft() + 2)
    ).not.toHaveText(initialValue);
  });

  async function move(
    page: Page,
    projectPage: ProjectPage,
    directionKey: string,
    textToType: string,
    x: number,
    y: number
  ) {
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue(textToType, false, false);
    await page.keyboard.press(directionKey);
    const valueTocheck = isNaN(Number(textToType))
      ? textToType
      : textToType + '.0';
    await projectPage.getGrid().expectTableToAppear(x, y);
    await projectPage.getGrid().expectCellTextChange(x, y, valueTocheck);
  }

  test('create a complex table by typing', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 2);
    await move(page, projectPage, 'ArrowRight', 'income', 8, 2);
    await move(page, projectPage, 'ArrowDown', '10', 8, 3);
    await move(page, projectPage, 'ArrowLeft', '5', 9, 3);
    await move(page, projectPage, 'ArrowDown', 'spending', 9, 2);
    await move(page, projectPage, 'ArrowRight', 'profit', 10, 2);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage.clickOnGridCell(8, 3);
    await projectPage.getGrid().getCellEditor().typeValue('-', false, false);
    await projectPage.getGrid().getCellEditor().closeTooltip();
    await projectPage.clickOnGridCell(9, 3);
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(
      /=Table(.*)\(ROW\(\)(.*)-(.*)2\)\[Field2\]-Table(.*)\(ROW\(\)(.*)-(.*)1\)\[Field2\]/
    );
    await page.keyboard.press('Enter');
    await projectPage.getGrid().expectTableToAppear(10, 3);
    //TODO: enable when backend bug fixed
    // await projectPage.getGrid().expectCellTextChange(10, 3, '5.0');
    await projectPage.clickOnGridCell(7, 2);
    await projectPage.getGrid().setCellValue('name');
    await projectPage.clickOnGridCell(7, 3);
    await projectPage.getGrid().setCellValue('value');
    await projectPage.getGrid().expectFieldHeaderToAppear(7, 2);
    await projectPage.getGrid().expectFieldHeaderToAppear(7, 3);
    await projectPage.getGrid().expectCellTextChange(7, 2, 'name');
    await projectPage.getGrid().expectCellTextChange(7, 3, 'value');
  });
});
