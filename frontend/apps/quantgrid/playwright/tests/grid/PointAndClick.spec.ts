/* eslint-disable playwright/no-conditional-in-test */
/* eslint-disable playwright/expect-expect */
import test, { BrowserContext, expect, Page } from '@playwright/test';

import { Canvas } from '../../components/Canvas';
import { ProjectTree } from '../../components/ProjectTree';
import { expectCellTextToBe } from '../../helpers/canvasExpects';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_pointandclick');

const table1Row = 2;

const table1Column = 8;

const table1Name = 'Table1';

const spreadsheet: SpreadSheet = new SpreadSheet();

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  const table2 = new Table(2, 2, 'SameRowTable');
  table2.addField(new Field('KeyField', 'RANGE(10)', false, true));
  table2.addField(new Field('Field1', '5'));
  table2.addOverrideValue('Field1', 3, '8');
  table2.addOverrideValue('Field1', 4, '9');
  const table3 = new Table(8, 8, 'SameColumnTable');
  table3.addField(new Field('x', '123'));
  spreadsheet.addTable(Table1);
  spreadsheet.addTable(table2);
  spreadsheet.addTable(table3);
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

test.describe('point and click', () => {
  test('point and click disabled for overriden field', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 2,
      table.getLeft() + 1
    );
    await projectPage.getVisualization().getCellEditor().typeValue('7', false);
    await projectPage.clickOnGridCell(
      spreadsheet.getTable(0).getFirstCellCoord(),
      spreadsheet.getTable(0).getLeft()
    );
    await projectPage.getVisualization().getCellEditor().shouldBeHidden();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 2,
      table.getLeft() + 1,
      '7'
    );
    table.addOverrideValue(table.getField(1).getName(), 3, '7');
  });

  test('point and click disabled for new field without formula', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(2);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await projectPage.getVisualization().getCellEditor().typeValue('23', false);
    await projectPage.clickOnGridCell(
      spreadsheet.getTable(0).getFirstCellCoord(),
      spreadsheet.getTable(0).getLeft()
    );
    await projectPage.getVisualization().getCellEditor().shouldBeHidden();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord(),
      table.getLeft() + 1,
      '23'
    );
    table.addField(new Field('Field1', 'NA'));
    table.addOverrideValue('Field1', 1, '23.0');
  });

  test('point and click on empty cell', async () => {
    /*const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await projectPage.getVisualization().getCellEditor().typeValue('=', false);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getVisualization().getCellEditor().shouldBeHidden();
    await expectCellTextToBe(
      <Canvas>projectPage
        .getVisualization(),
        table.getFirstCellCoord(),
         table.getLeft() + 1,
      '5');*/
  });

  test('point and click on empty cell for new field', async () => {
    /*const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 2
    );
    await projectPage.getVisualization().getCellEditor().typeValue('=', false);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getVisualization().getCellEditor().shouldBeHidden();
    await expect(
      projectPage
        .getVisualization()
        .getCellTableText(table.getFirstCellCoord(), table.getLeft() + 2)
    ).toBeNull();*/
  });

  test('point and click same column', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(2);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getFirstCellCoord(),
      targetTable.getLeft()
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toContainText(
      `${targetTable.getName()}(1)[${targetTable.getField(0).getName()}]`
    );
    await projectPage.getVisualization().getCellEditor().finishLine();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord(),
      table.getLeft(),
      await projectPage
        .getVisualization()
        .getCellTableText(
          targetTable.getFirstCellCoord(),
          targetTable.getLeft()
        )
    );
  });

  test('point and click same table different row and column', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 6,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft()
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toContainText(
      `${table.getName()}(ROW() - 2)[${table.getField(0).getName()}]`
    );
    await projectPage.getVisualization().getCellEditor().finishLine();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 6,
      table.getLeft() + 1,
      await projectPage
        .getVisualization()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft())
    );
  });

  test('point and click same table same row', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 5,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 5,
      table.getLeft()
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toContainText(`[${table.getField(0).getName()}]`);
    await projectPage.getVisualization().getCellEditor().finishLine();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 5,
      table.getLeft() + 1,
      await projectPage
        .getVisualization()
        .getCellTableText(table.getFirstCellCoord() + 5, table.getLeft())
    );
  });

  test('point and click same table field header', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 3,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      table.getFieldHeadersRow(),
      table.getLeft()
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toContainText(`[${table.getField(0).getName()}]`);
    await projectPage.getVisualization().getCellEditor().finishLine();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 3,
      table.getLeft() + 1,
      await projectPage
        .getVisualization()
        .getCellTableText(table.getFirstCellCoord() + 3, table.getLeft())
    );
  });

  test('point and click same table header', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    // eslint-disable-next-line playwright/no-conditional-in-test
    const oldValue = await projectPage
      .getVisualization()
      .getCellTableText(table.getFirstCellCoord() + 1, table.getLeft() + 1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 1,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(table.getTop(), table.getLeft());
    //  await new Promise((resolve) => setTimeout(resolve, 1000));
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 1,
      table.getLeft() + 1,
      oldValue
    );
  });

  test('point and click different table cell', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getFirstCellCoord() + 3,
      targetTable.getLeft()
    );
    //SameRowTable(3)[KeyField]
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(
      `=${targetTable.getName()}(4)[${targetTable.getField(0).getName()}]`
    );
    await projectPage.getVisualization().getCellEditor().finishLine();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft() + 1,
      await projectPage
        .getVisualization()
        .getCellTableText(
          targetTable.getFirstCellCoord() + 3,
          targetTable.getLeft()
        )
    );
  });

  test('point and click different table field header', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getFieldHeadersRow(),
      targetTable.getLeft() + 1
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(
      `=${targetTable.getName()}[${targetTable.getField(1).getName()}]`
    );
    await projectPage.getVisualization().getCellEditor().finishLine();
    await projectPage
      .getVisualization()
      .expectCellToBeDim(
        sourceTable.getFirstCellCoord(),
        sourceTable.getLeft() + 1
      );
  });

  test('point and click different table header', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getTop(),
      targetTable.getLeft()
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=${targetTable.getName()}`);
    await projectPage.getVisualization().getCellEditor().finishLine();
    await projectPage
      .getVisualization()
      .expectCellToBeDim(
        sourceTable.getFirstCellCoord(),
        sourceTable.getLeft()
      );
  });

  test('point and drag several fields', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue = await projectPage
      .getVisualization()
      .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage
      .getVisualization()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft(),
        table.getFirstCellCoord(),
        table.getLeft() + 1
      );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=');
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1,
      oldValue
    );
  });

  test('point and drag outside field area', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue = await projectPage
      .getVisualization()
      .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage
      .getVisualization()
      .dragFromCellToCell(
        table.getFirstCellCoord() + 5,
        table.getLeft() + 3,
        table.getFirstCellCoord() + 8,
        table.getLeft() + 3
      );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=');
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1,
      oldValue
    );
  });
  /*
  test('point and drag the same field', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue =
      await projectPage
        .getVisualization()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1);

    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage
      .getVisualization()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft() + 1,
        table.getFirstCellCoord() + 2,
        table.getLeft() + 1
      );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=[${table.getField(1).getName()}]`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage
        .getVisualization(),
        table.getFirstCellCoord()+4,
         table.getLeft()+1,
         oldValue
         );
  });

  test('point and drag other field from the same table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue =
      await projectPage
        .getVisualization()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1);

    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage
      .getVisualization()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft(),
        table.getFirstCellCoord() + 2,
        table.getLeft()
      );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=[${table.getField(0).getName()}]`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage
        .getVisualization(),
        table.getFirstCellCoord()+4,
         table.getLeft()+1,
         oldValue
         );
  });

  test('point and drag a field from another table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const sourceTable = spreadsheet.getTable(0);
    const oldValue =
      await projectPage
        .getVisualization()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        );

    await projectPage.clickOnGridCell(
      sourceTable.getFieldHeadersRow(),
      sourceTable.getLeft()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectPage
      .getVisualization()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft(),
        table.getFirstCellCoord() + 2,
        table.getLeft()
      );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}[${table.getField(0).getName()}]`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage
        .getVisualization(),
        table.getFirstCellCoord(),
         table.getLeft(),
         oldValue
        );
  });*/

  test('click on table in project tree', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const sourceTable = spreadsheet.getTable(0);
    const oldValue = await projectPage
      .getVisualization()
      .getCellTableText(sourceTable.getFirstCellCoord(), sourceTable.getLeft());
    await projectPage.clickOnGridCell(
      sourceTable.getFieldHeadersRow(),
      sourceTable.getLeft()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    const projectTree = new ProjectTree(page);
    await projectTree.clickOnNode(spreadsheet.getTable(2).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=${spreadsheet.getTable(2).getName()}`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft(),
      oldValue
    );
  });

  test('click on field in project tree same table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const sourceTable = spreadsheet.getTable(1);
    const oldValue = await projectPage
      .getVisualization()
      .getCellTableText(sourceTable.getFirstCellCoord(), sourceTable.getLeft());
    const projectTree = new ProjectTree(page);
    await projectTree.expandItem(sourceTable.getName());
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectTree.clickOnNode(sourceTable.getField(1).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=[${sourceTable.getField(1).getName()}]`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft(),
      oldValue
    );
  });

  test('click on field in project tree different table', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    const sourceTable = spreadsheet.getTable(2);
    const targetTable = spreadsheet.getTable(1);
    const oldValue = await projectPage
      .getVisualization()
      .getCellTableText(sourceTable.getFirstCellCoord(), sourceTable.getLeft());
    const projectTree = new ProjectTree(page);
    await projectTree.expandItem(targetTable.getName());
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, true);
    await projectTree.clickOnNode(targetTable.getField(0).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(
      `=${targetTable.getName()}[${targetTable.getField(0).getName()}]`
    );
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
    await expectCellTextToBe(
      <Canvas>projectPage.getVisualization(),
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft(),
      oldValue
    );
  });

  test('replace reference', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.showProjectPanel();
    await projectPage.getVisualization().clickOnCell(12, 6);
    await projectPage.getVisualization().getCellEditor().typeValue('=', false);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}(1)[${table.getField(1).getName()}]`);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft()
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}(1)[${table.getField(0).getName()}]`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('point and click with &', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getVisualization().clickOnCell(16, 6);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('53 &', false);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`53 &${table.getName()}(1)[${table.getField(1).getName()}]`);
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });
});
