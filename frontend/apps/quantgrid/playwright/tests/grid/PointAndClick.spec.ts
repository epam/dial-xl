/* eslint-disable playwright/no-conditional-in-test */
/* eslint-disable playwright/expect-expect */
import test, { expect } from '@playwright/test';

import { ProjectTree } from '../../components/ProjectTree';
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
  await TestFixtures.createProjectNew(browser, projectName, spreadsheet);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('point and click', () => {
  test('point and click disabled for overriden field', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 2,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('7', false);
    await projectPage.clickOnGridCell(
      spreadsheet.getTable(0).getFirstCellCoord(),
      spreadsheet.getTable(0).getLeft()
    );
    await projectPage.getGrid().getCellEditor().shouldBeHidden();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 2, table.getLeft() + 1)
    ).toHaveText('7');
    table.addOverrideValue(table.getField(1).getName(), 3, '7');
  });

  test('point and click disabled for new field without formula', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(2);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('23', false);
    await projectPage.clickOnGridCell(
      spreadsheet.getTable(0).getFirstCellCoord(),
      spreadsheet.getTable(0).getLeft()
    );
    await projectPage.getGrid().getCellEditor().shouldBeHidden();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord(), table.getLeft() + 1)
    ).toHaveText('23.0');
    table.addField(new Field('Field1', 'NA'));
    table.addOverrideValue('Field1', 1, '23.0');
  });

  test('point and click on empty cell', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getGrid().getCellEditor().shouldBeHidden();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord(), table.getLeft() + 1)
    ).toHaveText('5');
  });

  test('point and click on empty cell for new field', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 2
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getGrid().getCellEditor().shouldBeHidden();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord(), table.getLeft() + 2)
    ).toBeHidden();
  });

  test('point and click same column', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(2);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getFirstCellCoord(),
      targetTable.getLeft()
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toContainText(
      `${targetTable.getName()}(1)[${targetTable.getField(0).getName()}]`
    );
    await projectPage.getGrid().getCellEditor().finishLine();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord(), table.getLeft())
    ).toHaveText(
      (await projectPage
        .getGrid()
        .getCellTableText(
          targetTable.getFirstCellCoord(),
          targetTable.getLeft()
        )
        .textContent()) || ''
    );
  });

  test('point and click same table different row and column', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 6,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft()
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toContainText(
      `${table.getName()}(ROW() - 2)[${table.getField(0).getName()}]`
    );
    await projectPage.getGrid().getCellEditor().finishLine();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 6, table.getLeft() + 1)
    ).toHaveText(
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft())
        .textContent()) || ''
    );
  });

  test('point and click same table same row', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 5,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 5,
      table.getLeft()
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toContainText(`[${table.getField(0).getName()}]`);
    await projectPage.getGrid().getCellEditor().finishLine();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 5, table.getLeft() + 1)
    ).toHaveText(
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 5, table.getLeft())
        .textContent()) || ''
    );
  });

  test('point and click same table field header', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 3,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      table.getFieldHeadersRow(),
      table.getLeft()
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toContainText(`[${table.getField(0).getName()}]`);
    await projectPage.getGrid().getCellEditor().finishLine();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 3, table.getLeft() + 1)
    ).toHaveText(
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 3, table.getLeft())
        .textContent()) || ''
    );
  });

  test('point and click same table header', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    // eslint-disable-next-line playwright/no-conditional-in-test
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 1, table.getLeft() + 1)
        .textContent()) || '';
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 1,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(table.getTop(), table.getLeft());
    //  await new Promise((resolve) => setTimeout(resolve, 1000));
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 1, table.getLeft() + 1)
    ).toHaveText(oldValue);
  });

  test('point and click different table cell', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getFirstCellCoord() + 3,
      targetTable.getLeft()
    );
    //SameRowTable(3)[KeyField]
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(
      `=${targetTable.getName()}(4)[${targetTable.getField(0).getName()}]`
    );
    await projectPage.getGrid().getCellEditor().finishLine();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft() + 1
        )
    ).toHaveText(
      (await projectPage
        .getGrid()
        .getCellTableText(
          targetTable.getFirstCellCoord() + 3,
          targetTable.getLeft()
        )
        .textContent()) || ''
    );
  });

  test('point and click different table field header', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getFieldHeadersRow(),
      targetTable.getLeft() + 1
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(
      `=${targetTable.getName()}[${targetTable.getField(1).getName()}]`
    );
    await projectPage.getGrid().getCellEditor().finishLine();
    await projectPage
      .getGrid()
      .expectCellToBeDim(
        sourceTable.getFirstCellCoord(),
        sourceTable.getLeft() + 1
      );
  });

  test('point and click different table header', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const targetTable = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage.clickOnGridCell(
      targetTable.getTop(),
      targetTable.getLeft()
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=${targetTable.getName()}`);
    await projectPage.getGrid().getCellEditor().finishLine();
    await projectPage
      .getGrid()
      .expectCellToBeDim(
        sourceTable.getFirstCellCoord(),
        sourceTable.getLeft()
      );
  });

  test('point and drag several fields', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
        .textContent()) || '';
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage
      .getGrid()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft(),
        table.getFirstCellCoord(),
        table.getLeft() + 1
      );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=');
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
    ).toHaveText(oldValue);
  });

  test('point and drag outside field area', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
        .textContent()) || '';
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage
      .getGrid()
      .dragFromCellToCell(
        table.getFirstCellCoord() + 5,
        table.getLeft() + 3,
        table.getFirstCellCoord() + 8,
        table.getLeft() + 3
      );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=');
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
    ).toHaveText(oldValue);
  });

  test('point and drag the same field', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
        .textContent()) || '';

    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage
      .getGrid()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft() + 1,
        table.getFirstCellCoord() + 2,
        table.getLeft() + 1
      );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=[${table.getField(1).getName()}]`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
    ).toHaveText(oldValue);
  });

  test('point and drag other field from the same table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
        .textContent()) || '';

    await projectPage.clickOnGridCell(
      table.getFirstCellCoord() + 4,
      table.getLeft() + 1
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage
      .getGrid()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft(),
        table.getFirstCellCoord() + 2,
        table.getLeft()
      );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=[${table.getField(0).getName()}]`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(table.getFirstCellCoord() + 4, table.getLeft() + 1)
    ).toHaveText(oldValue);
  });

  test('point and drag a field from another table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    const sourceTable = spreadsheet.getTable(0);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
        .textContent()) || '';

    await projectPage.clickOnGridCell(
      sourceTable.getFieldHeadersRow(),
      sourceTable.getLeft()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectPage
      .getGrid()
      .dragFromCellToCell(
        table.getFirstCellCoord(),
        table.getLeft(),
        table.getFirstCellCoord() + 2,
        table.getLeft()
      );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}[${table.getField(0).getName()}]`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
    ).toHaveText(oldValue);
  });

  test('click on table in project tree', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(0);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
        .textContent()) || '';
    await projectPage.clickOnGridCell(
      sourceTable.getFieldHeadersRow(),
      sourceTable.getLeft()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    const projectTree = new ProjectTree(page);
    await projectTree.clickOnNode(spreadsheet.getTable(2).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=${spreadsheet.getTable(2).getName()}`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
    ).toHaveText(oldValue);
  });

  test('click on field in project tree same table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(1);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
        .textContent()) || '';
    const projectTree = new ProjectTree(page);
    await projectTree.expandItem(sourceTable.getName());
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectTree.clickOnNode(sourceTable.getField(1).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=[${sourceTable.getField(1).getName()}]`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
    ).toHaveText(oldValue);
  });

  test('click on field in project tree different table', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const sourceTable = spreadsheet.getTable(2);
    const targetTable = spreadsheet.getTable(1);
    const oldValue =
      (await projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
        .textContent()) || '';
    const projectTree = new ProjectTree(page);
    await projectTree.expandItem(targetTable.getName());
    await projectPage.clickOnGridCell(
      sourceTable.getFirstCellCoord(),
      sourceTable.getLeft()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, true);
    await projectTree.clickOnNode(targetTable.getField(0).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(
      `=${targetTable.getName()}[${targetTable.getField(0).getName()}]`
    );
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
    await expect(
      projectPage
        .getGrid()
        .getCellTableText(
          sourceTable.getFirstCellCoord(),
          sourceTable.getLeft()
        )
    ).toHaveText(oldValue);
  });

  test('replace reference', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getGrid().clickOnCell(12, 12);
    await projectPage.getGrid().getCellEditor().typeValue('=', false);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}(1)[${table.getField(1).getName()}]`);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft()
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=${table.getName()}(1)[${table.getField(0).getName()}]`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('point and click with &', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getGrid().clickOnCell(12, 12);
    await projectPage.getGrid().getCellEditor().typeValue('53 &', false);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFirstCellCoord(),
      table.getLeft() + 1
    );
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`53 &${table.getName()}(1)[${table.getField(1).getName()}]`);
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });
});
