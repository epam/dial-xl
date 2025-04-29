/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { Canvas } from '../../components/Canvas';
import {
  expectCellTextNotToBe,
  expectCellTextToBe,
} from '../../helpers/canvasExpects';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_fields');

const table1Row = 12;

const table1Column = 1;

const table1Name = 'Table1';

const spreadsheet: SpreadSheet = new SpreadSheet();

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  Table1.addField(new Field('Field_F', '[Field1]-[Field2]'));
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
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('cell typing', () => {
  test('create a table with custom name and with 1 field', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(3, 3);
    await projectPage.getVisualization().setCellValue('x=5');
    await projectPage.getVisualization().expectTableToAppear(3, 3);
    await projectPage.getVisualization().expectCellTextChange(3, 3, 'x');
    await projectPage.getVisualization().expectCellTextChange(4, 3, '5');
  });

  test('create a manual table with 1 field', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(3, 5);
    await projectPage.getVisualization().setCellValue('5');
    await projectPage.getVisualization().expectCellTextChange(3, 5, '5');
  });

  test('create table starting with =', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    const table = spreadsheet.getTable(0);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue(
        `=${table.getName()}[${table.getField(0).getName()}]`,
        false,
        true
      );
    await projectPage.getVisualization().getCellEditor().finishLine();
    await projectPage.getVisualization().expectTableHeaderToAppear(8, 8);
    await projectPage.getVisualization().expectCellToNotBeDim(10, 8);
  });

  test('create table starting with :', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 6);
    const table = spreadsheet.getTable(0);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue(
        `:${table.getName()}[${table.getField(0).getName()}]`,
        false,
        true
      );
    await projectPage.getVisualization().getCellEditor().finishLine();
    await projectPage.getVisualization().expectTableHeaderToAppear(8, 6);
    await projectPage.getVisualization().expectTableToAppear(10, 6);
    await projectPage.getVisualization().expectCellToNotBeDim(10, 6);
  });

  test('create table using range formula and starting with : creates dim', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 10);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue(':RANGE(3)', false, true);
    await projectPage.getVisualization().getCellEditor().finishLine();
    await projectPage.getVisualization().expectTableHeaderToAppear(8, 10);
    await projectPage.getVisualization().expectTableToAppear(10, 10);
    await projectPage.getVisualization().expectCellToNotBeDim(10, 10);
    await projectPage.getVisualization().expectTableToAppear(12, 10);
  });

  test('create table using range formula and starting with = creates dim', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(12, 5);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=RANGE(3)', false, true);
    await projectPage.getVisualization().getCellEditor().finishLine();
    await projectPage.getVisualization().expectTableHeaderToAppear(12, 5);
    await projectPage.getVisualization().expectTableToAppear(14, 5);
    await projectPage.getVisualization().expectCellToNotBeDim(14, 5);
    //await projectPage.getVisualization().expectTableToAppear(12, 12);
  });

  test('add field to table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const row = spreadsheet.getTable(0).getTop() + 1;
    const column =
      spreadsheet.getTable(0).getLeft() + spreadsheet.getTable(0).width();
    await projectPage.clickOnGridCell(row, column);
    await projectPage.getVisualization().setCellValue('Field3=5');
    await projectPage.getVisualization().expectFieldHeaderToAppear(row, column);
    await projectPage.getVisualization().expectTableToAppear(row + 1, column);
    spreadsheet.getTable(0).addField(new Field('Field3', '5'));
    await projectPage
      .getVisualization()
      .expectCellTextChange(row, column, 'Field3');
    await projectPage
      .getVisualization()
      .expectCellTextChange(row + 1, column, '5');
  });

  test('add override', async () => {
    /*  const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    const row = table.getTop() + 2;
    const column = table.getLeft() + 1;
    await projectPage.clickOnGridCell(row, column);
    const overrideValue = '22';
    await projectPage.getVisualization().setCellValue(overrideValue);
        await expectCellTextToBe(
          <Canvas>projectPage
            .getVisualization(),
            row,
             column,
             overrideValue
             );
    table.createOverride(
      table.getField(1).getName(),
      new Map<number, string>()
    );
    table.addOverrideValue(table.getField(1).getName(), 1, overrideValue);*/
  });

  test('rename table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.clickOnGridCell(table.getTop(), table.getLeft());
    const newTableName = 'RenamedTable';
    await projectPage.getVisualization().setCellValue(newTableName);
    await projectPage
      .getVisualization()
      .expectCellTextChange(table.getTop(), table.getLeft(), newTableName);
    table.updateName(newTableName);
  });

  test('add operation to existing formula', async () => {
    /*  const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    const initialValue = await projectPage
      .getCellText(table.getFirstCellCoord(), table.getLeft() + 2);
    await projectPage
      .getVisualization()
      .dbClickOnCell(table.getFirstCellCoord(), table.getLeft() + 2);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('+3', false, false);
    await projectPage.getVisualization().getCellEditor().finishLine();
    await expectCellTextNotToBe(
      <Canvas>projectPage
        .getVisualization(),
        table.getFirstCellCoord(),
         table.getLeft()+2,
         initialValue
         );*/
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
      .getVisualization()
      .getCellEditor()
      .typeValue(textToType, false, false);
    await page.keyboard.press(directionKey);
    const valueTocheck = isNaN(Number(textToType))
      ? textToType
      : textToType + '.0';
    await projectPage.getVisualization().expectTableToAppear(x, y);
    await projectPage
      .getVisualization()
      .expectCellTextChange(x, y, valueTocheck);
  }

  test('create a complex table by typing', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 2);
    await move(page, projectPage, 'ArrowRight', 'income', 8, 2);
    await move(page, projectPage, 'ArrowDown', '10', 8, 3);
    await move(page, projectPage, 'ArrowLeft', '5', 9, 3);
    await move(page, projectPage, 'ArrowDown', 'spending', 9, 2);
    await move(page, projectPage, 'ArrowRight', 'profit', 10, 2);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage.clickOnGridCell(8, 3);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('-', false, false);
    await projectPage.getVisualization().getCellEditor().closeTooltip();
    await projectPage.clickOnGridCell(9, 3);
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(
      /=Table(.*)\(ROW\(\)(.*)-(.*)2\)\[Column2\]-Table(.*)\(ROW\(\)(.*)-(.*)1\)\[Column2\]/
    );
    await page.keyboard.press('Enter');
    await projectPage.getVisualization().expectTableToAppear(10, 3);
    //TODO: enable when backend bug fixed
    // await projectPage.getVisualization().expectCellTextChange(10, 3, '5.0');
    await projectPage.clickOnGridCell(7, 2);
    await projectPage.getVisualization().setCellValue('name');
    await projectPage.clickOnGridCell(7, 3);
    await projectPage.getVisualization().setCellValue('value');
    await projectPage.getVisualization().expectFieldHeaderToAppear(7, 2);
    await projectPage.getVisualization().expectFieldHeaderToAppear(7, 3);
    await projectPage.getVisualization().expectCellTextChange(7, 2, 'name');
    await projectPage.getVisualization().expectCellTextChange(7, 3, 'value');
  });

  test('brackets highlighting', async () => {});

  [
    { arrow: 'ArrowUp' },
    { arrow: 'ArrowDown' },
    { arrow: 'ArrowLeft' },
    { arrow: 'ArrowRight' },
  ].forEach(({ arrow }) => {
    test(`press ${arrow} in formula mode during creation`, async () => {});

    test(`press ${arrow} in type mode during creation`, async () => {});
  });
});
