import { expect, test } from '@playwright/test';

import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { getProjectSpreadSheeet } from '../DataProvider';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_cell_actions');

const table1Row = 2;

const table1Column = 2;

const table1Name = 'Table1';

const table2Row = 2;

const table2Column = 10;

const table2Name = 'Table2';

let projectPage: ProjectPage;

let spreadsheet: SpreadSheet = new SpreadSheet();

const dataType = process.env['DATA_TYPE']
  ? process.env['DATA_TYPE']
  : 'default';

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  Table1.addField(new Field('Field3', '4'));
  Table1.addField(new Field('Field4', '10'));
  const Table2 = new Table(table2Row, table2Column, table2Name);
  Table2.addField(new Field('Field1', '5'));
  Table2.addField(new Field('Field2', '7'));
  Table2.addField(new Field('Field3', '4'));
  Table2.addField(new Field('Field4', '10'));
  spreadsheet.addTable(Table1);
  spreadsheet.addTable(Table2);
  if (dataType !== 'default') {
    spreadsheet = getProjectSpreadSheeet(dataType, spreadsheet);
  }
  await TestFixtures.createProjectNew(browser, projectName, spreadsheet);
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
test.describe('table cell actions', () => {
  test(
    `add override ${dataType}`,
    {
      tag: ['@hiddenAll', '@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      const overrideValue = '222';
      await projectPage
        .getGrid()
        .performCellAction(
          table.getFirstCellCoord(),
          table.getLeft() + 2,
          'Edit Cell'
        );
      await projectPage.getGrid().expectCellBecameEditable(undefined);
      await projectPage.getGrid().setCellValue(overrideValue);
      await expect(
        projectPage.getCellText(table.getFirstCellCoord(), table.getLeft() + 2)
      ).toHaveText(overrideValue);
      table.createOverride(
        table.getField(2).getName(),
        new Map<number, string>()
      );
      table.addOverrideValue(table.getField(2).getName(), 1, overrideValue);
    }
  );

  /*test(
    `remove overwrite ${dataType}`,
    {
      tag: ['@hiddenAll', '@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      await projectPage
        .getGrid()
        .performCellAction(
          table.getFirstCellCoord(),
          table.getLeft() + 2,
          'Remove Override Cell'
        );
      await expect(
        projectPage.getCellText(table.getFirstCellCoord(), table.getLeft() + 2)
      ).toHaveText(table.getField(2).getValue());
      table.removeOverrideValue(table.getField(2).getName(), 1);
    }
  );*/
});
