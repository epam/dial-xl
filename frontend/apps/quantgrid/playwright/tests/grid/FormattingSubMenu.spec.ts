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

const projectName = TestFixtures.addGuid('autotest_formats');

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

const storagePath = TestFixtures.getStoragePath();

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
  table3.addField(new Field('Column1', '32000'));
  table3.addField(new Field('Column2', '34532.23'));
  table3.addField(new Field('Column3', '36745.496'));
  table3.addField(new Field('Column4', '10'));
  table3.addField(new Field('Column5', 'TEXT([Column1])'));
  table3.addField(new Field('Column6', 'TEXT([Column2])'));
  table3.addField(new Field('Column7', 'TEXT([Column3])'));
  spreadsheet.addTable(table1);
  spreadsheet.addTable(table2);
  spreadsheet.addTable(table3);
  if (dataType !== 'default') {
    spreadsheet = getProjectSpreadSheeet(dataType, spreadsheet);
  }
  browserContext = await browser.newContext({ storageState: storagePath });
  await TestFixtures.createProjectNew(
    storagePath,
    browserContext,
    projectName,
    spreadsheet,
  );
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(1));
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.hideAllPanels();
  await projectPage.getEditorPanel().toggle();
  await projectPage.getHistoryPanel().toggle();
  await projectPage.expectPanelToBeVisible(Panels.HistoryPanel);
});

test.afterAll(async ({ browser }) => {
  await page.close();
  await TestFixtures.deleteProject(browserContext, projectName);
  await browserContext.close();
});

test.describe('formatting tests sub menu', () => {
  // Currency format test configurations
  const currencyFormats = [
    {
      currency: Currencies.EUR,
      cellValuePrefix: '€',
    },
    {
      currency: Currencies.USD,
      cellValuePrefix: '$',
    },
    {
      currency: Currencies.CHF,
      cellValuePrefix: 'CHF',
    },
    {
      currency: Currencies.GBP,
      cellValuePrefix: '£',
    },
    {
      currency: Currencies.AUD,
      cellValuePrefix: '$',
    },
    {
      currency: Currencies.JPY,
      cellValuePrefix: '¥',
    },
    {
      currency: Currencies.CAD,
      cellValuePrefix: '$',
    },
    {
      currency: Currencies.CNY,
      cellValuePrefix: '¥',
    },
    {
      currency: Currencies.BTC,
      cellValuePrefix: '₿',
    },
    {
      currency: Currencies.ETH,
      cellValuePrefix: 'Ξ',
    },
  ];

  currencyFormats.forEach(({ currency, cellValuePrefix }) => {
    test(
      `currency format ${currency} for integer number ${dataType}`,
      {
        tag: ['@hiddenTable', '@horizonal'],
      },
      async () => {
        const dslFormat = `!format("currency",1,0,"${cellValuePrefix}")`;
        const projectPage = await ProjectPage.createInstance(page);
        const table = spreadsheet.getTable(0);
        const field = table.getField(0);

        await projectPage
          .getVisualization()
          .clickOnCell(table.getFirstCellCoord(), table.getLeft());
        await projectPage.selectFormatWithSubItem(Formats.Currency, currency);
        await projectPage.expectLastHistoryRecord(
          `Set format "currency" to column "${field.getName()}" of table "${table.getName()}"`,
        );

        // Verify DSL contains the format
        const dslText = (
          await projectPage.getEditor().getEditorText()
        ).replaceAll('\u00A0', '');
        expect(dslText).toContain(dslFormat);

        // Verify cell value has the currency symbol prefix
        const cellValue = await projectPage.getCellVisibleValue(
          table.getFirstCellCoord(),
          table.getLeft(),
        );
        expect(cellValue).toMatch(
          new RegExp(
            `^${cellValuePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
          ),
        );
      },
    );
  });

  // Date format test configurations
  const dateFormats = [
    {
      formatIndex: '0',
      format: 'M-dd-yyyy',
      // Pattern to validate the format (e.g., 1-20-2020 or 10-20-2020)
      cellValuePattern: /^\d{1,2}-\d{2}-\d{4}$/,
    },
    {
      formatIndex: '1',
      format: 'yyyy-M-dd',
      // Pattern to validate the format (e.g., 2020-1-20 or 2020-10-20)
      cellValuePattern: /^\d{4}-\d{1,2}-\d{2}$/,
    },
    {
      formatIndex: '2',
      format: 'dd/M/yyyy',
      // Pattern to validate the format (e.g., 20/1/2020 or 20/10/2020)
      cellValuePattern: /^\d{2}\/\d{1,2}\/\d{4}$/,
    },
    {
      formatIndex: '3',
      format: 'M/dd/yyyy',
      // Pattern to validate the format (e.g., 1/20/2020 or 10/20/2020)
      cellValuePattern: /^\d{1,2}\/\d{2}\/\d{4}$/,
    },
    {
      formatIndex: '4',
      format: 'dLLLLyyyy',
      // Pattern to validate the format (e.g., 20 October 2020)
      cellValuePattern: /^\d{1,2} \w+ \d{4}$/,
    },
    {
      formatIndex: '5',
      format: 'LLLLd,yyyy',
      // Pattern to validate the format (e.g., October 20, 2020)
      cellValuePattern: /^\w+ \d{1,2}, \d{4}$/,
    },
    {
      formatIndex: '6',
      format: 'yyyy,LLLLd',
      // Pattern to validate the format (e.g., 2020, October 20)
      cellValuePattern: /^\d{4}, \w+ \d{1,2}$/,
    },
  ];

  dateFormats.forEach(({ formatIndex, format, cellValuePattern }) => {
    test(
      `date format ${format} ${dataType}`,
      {
        tag: ['@hiddenTable', '@horizonal'],
      },
      async () => {
        const dslFormat = `!format("date","${format}")`;
        const projectPage = await ProjectPage.createInstance(page);
        const table = spreadsheet.getTable(2);
        const field = table.getField(0); // Column1 with date value '20/10/2020'

        await projectPage
          .getVisualization()
          .clickOnCell(table.getFirstCellCoord(), table.getLeft());
        await projectPage.selectFormatWithSubItem(Formats.Date, formatIndex);
        await projectPage.expectLastHistoryRecord(
          `Set format "date" to column "${field.getName()}" of table "${table.getName()}"`,
        );

        // Verify DSL contains the format
        const dslText = (
          await projectPage.getEditor().getEditorText()
        ).replaceAll('\u00A0', '');
        expect(dslText).toContain(dslFormat);

        // Verify cell value matches the expected format pattern
        const cellValue = await projectPage.getCellVisibleValue(
          table.getFirstCellCoord(),
          table.getLeft(),
        );
        expect(cellValue).toMatch(cellValuePattern);
        const textValue = await projectPage.getCellVisibleValue(
          table.getFirstCellCoord(),
          table.getLeft() + 4, // Column5 with text value 'TEXT([Column1])'
        );
        expect(textValue).toBe(cellValue);
      },
    );
  });

  // Time format test configurations
  const timeFormats = [
    {
      formatIndex: '0',
      format: 'HH:mm',
      // Pattern to validate the format (e.g., 15:40)
      cellValuePattern: /^\d{2}:\d{2}$/,
    },
    {
      formatIndex: '1',
      format: 'hh:mma',
      // Pattern to validate the format (e.g., 08:15 PM)
      cellValuePattern: /^\d{2}:\d{2} (AM|PM)$/,
    },
    {
      formatIndex: '2',
      format: 'HH:mm:ss',
      // Pattern to validate the format (e.g., 20:15:30)
      cellValuePattern: /^\d{2}:\d{2}:\d{2}$/,
    },
    {
      formatIndex: '3',
      format: 'hh:mm:ssa',
      // Pattern to validate the format (e.g., 08:15:30 PM)
      cellValuePattern: /^\d{2}:\d{2}:\d{2} (AM|PM)$/,
    },
    {
      formatIndex: '4',
      format: 'h:mma',
      // Pattern to validate the format (e.g., 8:15 PM)
      cellValuePattern: /^\d{1,2}:\d{2} (AM|PM)$/,
    },
  ];

  timeFormats.forEach(({ formatIndex, format, cellValuePattern }) => {
    test(
      `time format ${format} ${dataType}`,
      {
        tag: ['@hiddenTable', '@horizonal'],
      },
      async () => {
        const dslFormat = `!format("date","${format}")`;
        const projectPage = await ProjectPage.createInstance(page);
        const table = spreadsheet.getTable(2);
        const field = table.getField(1);

        await projectPage
          .getVisualization()
          .clickOnCell(table.getFirstCellCoord(), table.getLeft() + 1);
        await projectPage.selectFormatWithSubItem(Formats.Time, formatIndex);
        await projectPage.expectLastHistoryRecord(
          `Set format "date" to column "${field.getName()}" of table "${table.getName()}"`,
        );

        // Verify DSL contains the format
        const dslText = (
          await projectPage.getEditor().getEditorText()
        ).replaceAll('\u00A0', '');
        expect(dslText).toContain(dslFormat);

        // Verify cell value matches the expected format pattern
        const cellValue = await projectPage.getCellVisibleValue(
          table.getFirstCellCoord(),
          table.getLeft() + 1,
        );
        expect(cellValue).toMatch(cellValuePattern);
        const textValue = await projectPage.getCellVisibleValue(
          table.getFirstCellCoord(),
          table.getLeft() + 5, // Column6 with text value 'TEXT([Column2])'
        );
        expect(textValue).toBe(cellValue);
      },
    );
  });

  // DateTime format test configurations
  const dateTimeFormats = [
    {
      formatIndex: '0',
      format: 'M/dd/yyyyhh:mma',
      // Pattern to validate the format (e.g., 10/10/2000 08:15 PM)
      cellValuePattern: /^\d{1,2}\/\d{2}\/\d{4} \d{2}:\d{2} (AM|PM)$/,
    },
    {
      formatIndex: '1',
      format: 'dd/M/yyyyHH:mm',
      // Pattern to validate the format (e.g., 10/5/2000 08:15)
      cellValuePattern: /^\d{2}\/\d{1,2}\/\d{4} \d{2}:\d{2}$/,
    },
    {
      formatIndex: '2',
      format: 'yyyy-M-ddHH:mm:ss',
      // Pattern to validate the format (e.g., 2000-5-10 08:15:30)
      cellValuePattern: /^\d{4}-\d{1,2}-\d{2} \d{2}:\d{2}:\d{2}$/,
    },
    {
      formatIndex: '3',
      format: 'LLLLd,yyyyhh:mm:ssa',
      // Pattern to validate the format (e.g., October 10, 2000 08:15:30 PM)
      cellValuePattern: /^[A-Za-z]+ \d{1,2}, \d{4} \d{2}:\d{2}:\d{2} (AM|PM)$/,
    },
    {
      formatIndex: '4',
      format: 'dLLLLyyyyh:mma',
      // Pattern to validate the format (e.g., 10 October 2000 8:15 PM)
      cellValuePattern: /^\d{1,2} [A-Za-z]+ \d{4} \d{1,2}:\d{2} (AM|PM)$/,
    },
    {
      formatIndex: '5',
      format: 'M-dd-yyyyhh:mma',
      // Pattern to validate the format (e.g., 5-10-2000 08:15 PM)
      cellValuePattern: /^\d{1,2}-\d{2}-\d{4} \d{2}:\d{2} (AM|PM)$/,
    },
    {
      formatIndex: '6',
      format: 'yyyy,LLLLdHH:mm',
      // Pattern to validate the format (e.g., 2000, October 10 08:15)
      cellValuePattern: /^\d{4}, [A-Za-z]+ \d{1,2} \d{2}:\d{2}$/,
    },
  ];

  dateTimeFormats.forEach(({ formatIndex, format, cellValuePattern }) => {
    test(
      `datetime format ${format} ${dataType}`,
      {
        tag: ['@hiddenTable', '@horizonal'],
      },
      async () => {
        const dslFormat = `!format("date","${format}")`;
        const projectPage = await ProjectPage.createInstance(page);
        const table = spreadsheet.getTable(2);
        const field = table.getField(2);

        await projectPage
          .getVisualization()
          .clickOnCell(table.getFirstCellCoord(), table.getLeft() + 2);
        await projectPage.selectFormatWithSubItem(
          Formats.DateTime,
          formatIndex,
        );
        await projectPage.expectLastHistoryRecord(
          `Set format "date" to column "${field.getName()}" of table "${table.getName()}"`,
        );

        // Verify DSL contains the format
        const dslText = (
          await projectPage.getEditor().getEditorText()
        ).replaceAll('\u00A0', '');
        expect(dslText).toContain(dslFormat);

        // Verify cell value matches the expected format pattern
        const cellValue = await projectPage.getCellInnerValue(
          table.getFirstCellCoord(),
          table.getLeft() + 2,
        );
        //expect(cellValue).toMatch(cellValuePattern);
      },
    );
  });
});
