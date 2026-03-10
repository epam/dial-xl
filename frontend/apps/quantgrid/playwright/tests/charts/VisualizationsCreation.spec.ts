/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { VisualizationChart } from '../../components/VisualizationChart';
import { GridMenuItem } from '../../enums/GridMenuItem';
import { MoveDirection } from '../../enums/MoveDirection';
import { VisualizationsMenuItems } from '../../enums/VisualizationsMenuItems';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_create_visualizations');

const table1Row = 2;

const table1Column = 2;

const table1Name = 'Table1';

const table2Row = 2;

const table2Column = 6;

const table2Name = 'ForDeleteTest';

const table3Name = 'ForDeleteHotKey';

const table3Row = 12;

const table3Column = 3;

let browserContext: BrowserContext;

let page: Page;

const storagePath = TestFixtures.getStoragePath();

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${table1Row}, ${table1Column}, "title", "headers")\ntable ${table1Name}\n[Field1] = 1\n[Field2] = 9\n`;
  const table2Dsl = `!layout(${table2Row}, ${table2Column}, "title", "headers")\ntable ${table2Name}\n[Field1] = 5\n[Field2] = 4\n`;
  const table3Dsl = `!layout(${table3Row}, ${table3Column}, "title", "headers")\ntable ${table3Name}\n[Field1] = 5\n[Field2] = 7\n`;
  browserContext = await browser.newContext({ storageState: storagePath });
  await TestFixtures.createProject(
    storagePath,
    browserContext,
    projectName,
    table3Row,
    table3Column,
    table3Name,
    table1Dsl,
    table2Dsl,
    table3Dsl,
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
  const visualizationChart = new VisualizationChart(page);
  await visualizationChart.delete();
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browserContext, projectName);
  await browserContext.close();
});

test.describe('add visualization', () => {
  test('add line chart', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.Line,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add heat map chart', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.Heatmap,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add scatterplot chart', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.Scatterplot,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add pie chart', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.PieChart,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add bar chart', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.BarChart,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add stacked bar chart', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.StackedBar,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add histogram', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.Histogram,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });

  test('add period series', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage
      .getVisualization()
      .performMenuSubAction(
        table2Row,
        table2Column,
        GridMenuItem.AddChart,
        VisualizationsMenuItems.PeriodSeries,
      );
    await projectPage
      .getVisualization()
      .expectVisualizationToAppear(table2Row, table2Column);
  });
});
