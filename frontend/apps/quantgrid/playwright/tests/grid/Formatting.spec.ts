/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { Canvas } from '../../components/Canvas';
import { Currencies } from '../../enums/Curencies';
import { FieldMenuItem } from '../../enums/FieldMenuItem';
import { Formats } from '../../enums/Formats';
import { GridMenuItem } from '../../enums/GridMenuItem';
import { Panels } from '../../enums/Panels';
import { expectCellTextToBe } from '../../helpers/canvasExpects';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { getProjectSpreadSheeet } from '../DataProvider';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_fields');

const table1Row = 2;

const table1Column = 2;

const table1Name = 'MultiFieldsTable1';

const table2Row = 2;

const table2Column = 6;

//const table2Size = 3;

const table2Name = 'MultiFieldsTable2';

const table3Row = 20;

const table3Column = 6;

const table3Name = 'TableForSwaps';

const dataType = process.env['DATA_TYPE']
  ? process.env['DATA_TYPE']
  : 'default';

let spreadsheet: SpreadSheet = new SpreadSheet();

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

//let table3Size = 4;

test.beforeAll(async ({ browser }) => {
  const table1 = new Table(table1Row, table1Column, table1Name);
  table1.addField(new Field('Column1', '1.4'));
  table1.addField(new Field('Column2', '3'));
  table1.addField(new Field('Column3', '[Column1]-[Column2]'));
  const table2 = new Table(table2Row, table2Column, table2Name);
  table2.addField(new Field('Column1', '1'));
  table2.addField(new Field('Column2', '7'));
  table2.addField(new Field('Column3', '3'));
  const table3 = new Table(table3Row, table3Column, table3Name);
  table3.addField(new Field('Column1', '20/10/2020'));
  table3.addField(new Field('Column2', '15:40'));
  table3.addField(new Field('Column3', '10/10/2000 20:15'));
  table3.addField(new Field('Column4', '10'));
  spreadsheet.addTable(table1);
  spreadsheet.addTable(table2);
  spreadsheet.addTable(table3);
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
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(1));
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.hideAllPanels();
  await page.keyboard.press('Alt+1');
  await page.keyboard.press('Alt+2');
  await page.keyboard.press('Alt+4');
  await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('formatting tests', () => {
  test(
    `general format for number ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFirstCellCoord(),
          spreadsheet.getTable(1).getLeft()
        );
      await projectPage.selectFormat(Formats.General);
      await projectPage.expectLastHistoryRecord(
        `Set format "general" to column "${spreadsheet
          .getTable(1)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(1).getName()}"`
      );
    }
  );

  test(
    `text format for number ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFirstCellCoord(),
          spreadsheet.getTable(1).getLeft()
        );
      await projectPage.selectFormat(Formats.Number);
      await projectPage.expectLastHistoryRecord(
        `Set format "number" to column "${spreadsheet
          .getTable(1)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(1).getName()}"`
      );
    }
  );

  test(
    `integer format for number ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFirstCellCoord(),
          spreadsheet.getTable(1).getLeft()
        );
      await projectPage.selectFormat(Formats.Integer);
      await projectPage.expectLastHistoryRecord(
        `Set format "number" to column "${spreadsheet
          .getTable(1)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(1).getName()}"`
      );
    }
  );

  test(
    `number format for number ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFirstCellCoord(),
          spreadsheet.getTable(1).getLeft()
        );
      await projectPage.selectFormat(Formats.Number);
      await projectPage.expectLastHistoryRecord(
        `Set format "number" to column "${spreadsheet
          .getTable(1)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(1).getName()}"`
      );
    }
  );

  test(
    `scientific format ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft()
        );
      await projectPage.selectFormat(Formats.Scientific);
      await projectPage.expectLastHistoryRecord(
        `Set format "scientific" to column "${spreadsheet
          .getTable(0)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(0).getName()}"`
      );
    }
  );

  test(
    `currency format for integer number ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFirstCellCoord(),
          spreadsheet.getTable(1).getLeft()
        );
      await projectPage.selectFormatWithSubItem(
        Formats.Currency,
        Currencies.EUR
      );
      await projectPage.expectLastHistoryRecord(
        `Set format "currency" to column "${spreadsheet
          .getTable(1)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(1).getName()}"`
      );
    }
  );

  test(
    `currency format for decimal number ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft()
        );
      await projectPage.selectFormatWithSubItem(
        Formats.Currency,
        Currencies.EUR
      );
      await projectPage.expectLastHistoryRecord(
        `Set format "currency" to column "${spreadsheet
          .getTable(0)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(0).getName()}"`
      );
    }
  );

  test(
    `date format ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFirstCellCoord(),
          spreadsheet.getTable(2).getLeft()
        );
      await projectPage.selectFormatWithSubItem(Formats.Date, '14/11/2024');
      await projectPage.expectLastHistoryRecord(
        `Set format "date" to column "${spreadsheet
          .getTable(2)
          .getField(0)
          .getName()}" of table "${spreadsheet.getTable(2).getName()}"`
      );
    }
  );

  test(
    `time format ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFirstCellCoord(),
          spreadsheet.getTable(2).getLeft() + 1
        );
      await projectPage.selectFormatWithSubItem(Formats.Time, '14:30');
      await projectPage.expectLastHistoryRecord(
        `Set format "date" to column "${spreadsheet
          .getTable(2)
          .getField(1)
          .getName()}" of table "${spreadsheet.getTable(2).getName()}"`
      );
    }
  );

  test(
    `datetime format ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFirstCellCoord(),
          spreadsheet.getTable(2).getLeft() + 2
        );
      await projectPage.selectFormatWithSubItem(
        Formats.DateTime,
        '14/11/2024 14:30'
      );
      await projectPage.expectLastHistoryRecord(
        `Set format "date" to column "${spreadsheet
          .getTable(2)
          .getField(2)
          .getName()}" of table "${spreadsheet.getTable(2).getName()}"`
      );
    }
  );

  test(
    `percent format ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft() + 1
        );
      await projectPage.selectFormat(Formats.Percents);
      await projectPage.expectLastHistoryRecord(
        `Set format "percentage" to column "${spreadsheet
          .getTable(0)
          .getField(1)
          .getName()}" of table "${spreadsheet.getTable(0).getName()}"`
      );
    }
  );
});
