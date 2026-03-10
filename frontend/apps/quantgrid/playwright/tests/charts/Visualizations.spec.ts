import { BrowserContext, expect, Page, test } from '@playwright/test';

import { Canvas } from '../../components/Canvas';
import { DetailsPanel } from '../../components/DetailsPanel';
import { VisualizationChart } from '../../components/VisualizationChart';
import { GridMenuItem } from '../../enums/GridMenuItem';
import { MenuType } from '../../enums/MenuType';
import { VisualizationsMenuItems } from '../../enums/VisualizationsMenuItems';
import { expectCellTextToBe } from '../../helpers/canvasExpects';
import { getCellX } from '../../helpers/canvasGridApiUtil';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { getProjectSpreadSheeet } from '../DataProvider';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_visualizations');

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

const storagePath = TestFixtures.getStoragePath();

const dataType = process.env['DATA_TYPE']
  ? process.env['DATA_TYPE']
  : 'default';

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', 'RANGE(10)'));
  Table1.addField(new Field('Field2', '[Field1]*3'));
  Table1.addField(new Field('Field3', '15'));
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
  browserContext = await browser.newContext({ storageState: storagePath });
  await TestFixtures.createProjectNew(
    storagePath,
    browserContext,
    projectName,
    spreadsheet,
  );
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectCellTableToBeDisplayed(
    page,
    table1Row,
    table1Column,
  );
  const projectPage = await ProjectPage.createCleanInstance(page);
  await projectPage.hideAllPanels();
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await TestFixtures.deleteProject(browserContext, projectName);
  await browserContext.close();
});

test.describe('Visualizations', () => {
  test('verify line chart', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performCellSubAction(
        table.getTop(),
        table.getLeft(),
        MenuType.TableHeader,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.Line,
      );
    const detailsPanel = new DetailsPanel(page);
    await detailsPanel.closePanel();
    const chartVisualization = new VisualizationChart(page);
    await chartVisualization.shouldBeVisible();
    const fieldNames = table.getFields().map((field) => field.getName());
    //  await chartVisualization.verifyProperties(fieldNames);
    await chartVisualization.initializeNumbers(10);
    //   await chartVisualization.pointToInterval(3);
    const expectedIntervalData = [
      { name: 'Field1', value: 3 },
      { name: 'Field2', value: 9 },
      { name: 'Field3', value: 15 },
    ];
    //  await chartVisualization.assertIntervalValues(expectedIntervalData);
  });
});
