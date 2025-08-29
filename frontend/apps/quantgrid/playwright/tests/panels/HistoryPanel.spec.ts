/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { GridMenuItem } from '../../enums/GridMenuItem';
import { MoveDirection } from '../../enums/MoveDirection';
import { Panels } from '../../enums/Panels';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { getProjectSpreadSheeet } from '../DataProvider';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_history');

const table1Row = 2;

const table1Column = 2;

const table1Name = 'Table1';

const table2Row = 2;

const table2Column = 10;

const table2Name = 'Table2';

let projectPage: ProjectPage;

let spreadsheet: SpreadSheet = new SpreadSheet();

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

const dataType = process.env['DATA_TYPE']
  ? process.env['DATA_TYPE']
  : 'default';

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  Table1.addField(new Field('Field3', '4'));
  Table1.addField(new Field('Field4', '10'));
  Table1.addOverrideValue('Field1', 1, '555');
  const Table2 = new Table(table2Row, table2Column, table2Name);
  Table2.addField(new Field('Field1', '5'));
  Table2.addField(new Field('Field2', '7'));
  Table2.addField(new Field('Field3', '4'));
  Table2.addField(new Field('Field4', '10'));
  const Table3 = new Table(8, 8, 'Table3');
  Table3.addField(new Field('KeyField', 'RANGE(5)'));
  Table3.addField(new Field('UsualField', '234'));
  Table3.getField(0).makeKey();
  const Table4 = new Table(8, 2, 'Table4');
  Table4.addField(new Field('Field1', '12'));
  Table4.addField(new Field('Field2', '33'));
  Table4.addField(new Field('Field3', '12'));
  spreadsheet.addTable(Table1);
  spreadsheet.addTable(Table2);
  spreadsheet.addTable(Table3);
  spreadsheet.addTable(Table4);
  if (dataType !== 'default') {
    spreadsheet = getProjectSpreadSheeet(dataType, spreadsheet);
  }
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
  projectPage = await ProjectPage.createInstance(page);
  await projectPage.hideAllPanels();
  await page.keyboard.press('Alt+1');
  await page.keyboard.press('Alt+2');
  await page.keyboard.press('Alt+4');
  await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(2));
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('history panel', () => {
  /*  test('add table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(3, 8);
    await projectPage.getVisualization().setCellValue('NewF=3');
    await projectPage.getVisualization().expectTableToAppear(3, 8);
    await projectPage.getVisualization().expectCellTextChange(4, 8, '3');
    await projectPage.getVisualization().expectCellTextChange(3, 8, 'NewF');
    await projectPage.expectLastHistoryRecord('Add table "NewF"');
  });

  test('rename table', async () => {
    const newName = 'RenamedTable';
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage
      .getVisualization()
      .performMenuAction(table.getTop(), table.getLeft(), GridMenuItem.Rename);
    await projectPage
      .getVisualization()
      .expectCellBecameEditable(table.getName());
    await projectPage.getVisualization().setCellValue(newName);
    await projectPage.expectLastHistoryRecord(
      `Rename table "${table.getName()}" to "${newName}"`
    );
    table.updateName(newName);
    table1Name = newName;
  });

  test('delete table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage
      .getVisualization()
      .performMenuAction(table.getTop(), table.getLeft(), GridMenuItem.Delete);
    await projectPage
      .getVisualization()
      .expectTableToDissapear(table.getTop(), table.getLeft());
    spreadsheet.removeTableByName(table.getName());
    await projectPage.expectLastHistoryRecord(
      `Delete table "${table.getName()}"`
    );
  });

  test('move table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.getVisualization().moveTable(table, MoveDirection.DOWN);
    table.updatePlacement(table.getTop() + 1, table.getLeft());
    // \\"${table.getName()}\\" to (${table.getTop()}, ${table.getLeft()})
    await projectPage.expectLastHistoryRecord(
      `Move table "${table.getName()}" to \\(${table.getTop()}, ${table.getLeft()}\\)`
    );
  });

  test(
    `add key ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      await projectPage
        .getVisualization()
        .performCellAction(
          table.getFieldHeadersRow(),
          table.getLeft() + 1,
          GridMenuItem.AddKey
        );
      await projectPage
        .getVisualization()
        .expectFieldToBeKey(table.getFieldHeadersRow(), table.getLeft() + 1);
      table.getField(1).makeKey();
      await projectPage.expectLastHistoryRecord(
        `Add key \\[${table
          .getField(1)
          .getName()}\\] to table "${table.getName()}"`
      );
    }
  );

  test(
    `remove key ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      let table = spreadsheet
        .getTables()
        .find((item) => item.getField(0).isKey());
      table ??= spreadsheet.getTable(0);
      await projectPage
        .getVisualization()
        .performCellAction(
          table.getFieldHeadersRow(),
          table.getLeft(),
          GridMenuItem.RemoveKey
        );
      await projectPage
        .getVisualization()
        .expectFieldNotBeKey(table.getFieldHeadersRow(), table.getLeft());
      table.getField(0).removeKey();
      await projectPage.expectLastHistoryRecord(
        `Remove key \\[${table
          .getField(0)
          .getName()}\\] from table "${table.getName()}"`
      );
    }
  );

  test(
    `add field ${dataType}`,
    {
      tag: ['@hiddenAll', '@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      const row = table.getFieldHeadersRow();
      const column = table.getLeft() + table.width();
      await projectPage.clickOnGridCell(row, column);
      await projectPage.getVisualization().setCellValue('FieldN=5');
      table.addField(new Field('FieldN', '5'));
      await projectPage.expectLastHistoryRecord(
        `Add \\[FieldN\\] to table "${table.getName()}"`
      );
    }
  );

  test(
    `remove field ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      const row = table.getFieldHeadersRow();
      const column = table.getLeft() + 1;
      const fieldName = table.getField(1).getName();
      table.removeField(fieldName);
      await projectPage
        .getVisualization()
        .performCellSubAction(row, column, 'Delete', 'Delete field');
      await projectPage.expectLastHistoryRecord(
        `Delete field \\[${fieldName}\\] from table "${table.getName()}"`
      );
    }
  );

  test(
    `edit formula ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      const row = table.getFieldHeadersRow();
      const column = table.getLeft();
      await projectPage.getVisualization().clickOnCell(row, column);
      await projectPage.sendKeysFormulaValue('23');
      table.getField(0).updateValue(table.getField(0).getValue() + '23');
      await projectPage.expectLastHistoryRecord(
        `Update expression of field \\[${table
          .getField(0)
          .getName()}\\] in table "${table.getName()}"`
      );
    }
  );

  test(
    `add override ${dataType}`,
    {
      tag: ['@hiddenAll', '@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      const overrideValue = '222';
      await projectPage
        .getVisualization()
        .performCellAction(
          table.getFirstCellCoord(),
          table.getLeft() + 2,
          'Edit Cell'
        );
      await projectPage.getVisualization().expectCellBecameEditable(undefined);
      await projectPage.getVisualization().setCellValue(overrideValue);
      table.addOverrideValue(table.getField(2).getName(), 1, overrideValue);
      await projectPage.expectLastHistoryRecord(
        `Add override "${overrideValue}" to table "${table.getName()}"`
      );
    }
  );

  test(
    `remove override ${dataType}`,
    {
      tag: ['@hiddenAll', '@hiddenTable'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const table = spreadsheet.getTable(0);
      const overrideValue = table.getOverrideValue(
        table.getField(0).getName(),
        1
      );
      await projectPage
        .getVisualization()
        .performCellAction(
          table.getFirstCellCoord(),
          table.getLeft(),
          'Remove Override Cell'
        );
      await projectPage.expectLastHistoryRecord(
        `Remove override ${overrideValue} from table "${table.getName()}"`
      );
      table.removeOverrideValue(table.getField(0).getName(), 1);
    }
  );*/

  test('change dsl', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    //  projectPage.getEditor().setTokenValue()
  });

  test('add table and undo', async () => {});

  test('rename table and undo', async () => {});

  test('delete table and undo', async () => {});

  test('move table and undo', async () => {});

  test('add key and undo', async () => {});

  test('remove key and undo', async () => {});

  test('add field and undo', async () => {});

  test('remove field and undo', async () => {});

  test('edit formula and undo', async () => {});

  test('add overwrite and undo', async () => {});

  test('remove overwrite and undo', async () => {});

  test('change dsl and undo', async () => {});

  test('rename, move, delete table and undo all 3 actions', async () => {});

  test('add table, key, overwrite and undo all 3 actions', async () => {});

  test('revert previous undo', async () => {});

  test('undo 3 actions and restore 2', async () => {});

  test('undo all history', async () => {});

  test('undo 3 actions and then undo 2 more', async () => {});

  test('undo 3 actions, make 1 and then undo 2(to original state before all actions)', async () => {});

  test('undo 3 actions, make 3 new, then undo 8', async () => {});

  test('switch to another sheet and check history is consistent', async () => {});

  test('switch to another sheet, make an action, come back and check history is consistent', async () => {});
});
