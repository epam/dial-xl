/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { Canvas } from '../../components/Canvas';
import { FieldMenuItem } from '../../enums/FieldMenuItem';
import { GridMenuItem } from '../../enums/GridMenuItem';
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
  table1.addField(new Field('Field1', '1', true));
  table1.addField(new Field('Field2', 'RANGE(5)'));
  table1.addField(new Field('Field3', 'RANGE(10)', false, true));
  const table2 = new Table(table2Row, table2Column, table2Name);
  table2.addField(new Field('Field1', '1'));
  table2.addField(new Field('Field2', '7'));
  table2.addField(new Field('Field3', '3'));
  const table3 = new Table(table3Row, table3Column, table3Name);
  table3.addField(new Field('Field1', '1'));
  table3.addField(new Field('Field2', '7'));
  table3.addField(new Field('Field3', '3'));
  table3.addField(new Field('Field4', '10'));
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
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('field actions', () => {
  test(
    `verify fields names ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await expectCellTextToBe(
        <Canvas>projectPage.getVisualization(),
        spreadsheet.getTable(0).getFieldHeadersRow(),
        spreadsheet.getTable(0).getLeft(),
        'Field1'
      );
      await expectCellTextToBe(
        <Canvas>projectPage.getVisualization(),
        spreadsheet.getTable(0).getFieldHeadersRow(),
        spreadsheet.getTable(0).getLeft() + 1,
        'Field2'
      );
      await expectCellTextToBe(
        <Canvas>projectPage.getVisualization(),
        spreadsheet.getTable(0).getFieldHeadersRow(),
        spreadsheet.getTable(0).getLeft() + 2,
        'Field3'
      );
    }
  );

  test(
    `rename field ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          'Rename field'
        );
      const newName = 'Field1New';
      await projectPage.getVisualization().setCellValue(newName);
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          newName
        );
      spreadsheet.getTable(1).getField(0).updateName(newName);
    }
  );

  test(
    `rename field by hotkey F2 ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft()
        );
      await page.keyboard.press('F2');
      const newName = 'Field1HotKey';
      await projectPage.getVisualization().setCellValue(newName);
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          newName
        );
      spreadsheet.getTable(1).getField(0).updateName(newName);
    }
  );

  test(
    `start renaming field and cancel ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const fieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft()
        );
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          'Rename field'
        );
      const newName = 'Field1Cancel';
      await projectPage.getVisualization().setCellValueAndCancel(newName);
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          fieldValue || ''
        );
    }
  );

  test(
    `delete field by menu ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellSubAction(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft() + 1,
          'Delete',
          'Delete field'
        );
      await projectPage
        .getVisualization()
        .expectTableToDissapear(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft() +
            spreadsheet.getTable(1).width() -
            1
        );
      spreadsheet
        .getTable(1)
        .removeField(spreadsheet.getTable(1).getField(1).getName());
    }
  );

  test(
    `delete field by hotkey Delete ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft() + 1
        );
      await page.keyboard.press('Delete');
      await projectPage
        .getVisualization()
        .expectTableToDissapear(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft() +
            spreadsheet.getTable(1).width() -
            1
        );
      spreadsheet
        .getTable(1)
        .removeField(spreadsheet.getTable(1).getField(1).getName());
    }
  );

  test(
    `swap left ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1
        );
      const leftFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await projectPage
        .getVisualization()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1,
          'Field',
          spreadsheet.getTable(2).getMenu().SwapLeft()
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          curFieldValue || ''
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1,
          leftFieldValue || ''
        );
      spreadsheet.getTable(2).swapFields(0, 1);
    }
  );

  test(
    `swap right ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2
        );
      const rightFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3
        );
      await projectPage
        .getVisualization()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2,
          'Field',
          spreadsheet.getTable(2).getMenu().SwapRight()
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          curFieldValue || ''
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2,
          rightFieldValue || ''
        );
      spreadsheet.getTable(2).swapFields(2, 3);
    }
  );

  test(
    `swap left by hotkey Shift+Alt+ArrowLeft ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1
        );
      const leftFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1
        );
      await page.keyboard.press('Shift+Alt+ArrowLeft');
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          curFieldValue || ''
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1,
          leftFieldValue || ''
        );
      spreadsheet.getTable(2).swapFields(0, 1);
    }
  );

  test(
    `swap right by hotkey Shift+Alt+ArrowRight ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2
        );
      const rightFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3
        );
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2
        );
      await page.keyboard.press('Shift+Alt+ArrowRight');
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          curFieldValue || ''
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2,
          rightFieldValue || ''
        );
      spreadsheet.getTable(2).swapFields(2, 3);
    }
  );

  test(
    `swap left for the very left column ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await projectPage
        .getVisualization()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          'Field',
          spreadsheet.getTable(2).getMenu().SwapLeft()
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          curFieldValue || ''
        );
    }
  );

  test(
    `swap right for the very right column ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getVisualization()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3
        );
      await projectPage
        .getVisualization()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          'Field',
          'Swap right'
        );
      await projectPage
        .getVisualization()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          curFieldValue || ''
        );
    }
  );

  test(
    `edit formula ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      /*   const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          'Edit formula'
        );
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newValue = '222';
      await projectPage.getVisualization().setCellValue(newValue);
      await expect(projectPage.getFormula()).toHaveText('=' + newValue);
      spreadsheet.getTable(2).getField(0).updateValue(newValue);*/
    }
  );

  test(
    `edit formula by hotkey Alt+F2 ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      /*   const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await page.keyboard.press('Alt+F2');
      const newValue = '111';
      await projectPage.getVisualization().setCellValue(newValue);
      await projectPage
        .getVisualization()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await expect(projectPage.getFormula()).toHaveText('=' + newValue);
      spreadsheet.getTable(2).getField(0).updateValue(newValue);*/
    }
  );

  test(
    `add key ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          GridMenuItem.AddKey
        );

      await projectPage
        .getVisualization()
        .expectFieldToBeKey(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );

      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          GridMenuItem.RemoveKey
        );
    }
  );

  test(
    `remove key ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft(),
          GridMenuItem.RemoveKey
        );

      await projectPage
        .getVisualization()
        .expectFieldNotBeKey(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft()
        );
      spreadsheet.getTable(0).getField(0).removeKey();
    }
  );

  //add dimension
  test(
    `add dimension ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 1,
          FieldMenuItem.MakeDimension
        );

      await projectPage
        .getVisualization()
        .expectCellToNotBeDim(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft() + 1
        );

      await projectPage
        .getVisualization()
        .expectFieldIsDimension(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 1
        );
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 1,
          FieldMenuItem.RemoveDimension
        );
    }
  );

  test(
    `remove dimension ${dataType}`,
    {
      tag: ['@hiddenTable', '@horizonal'],
    },
    async () => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getVisualization()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 2,
          FieldMenuItem.RemoveDimension
        );

      await projectPage
        .getVisualization()
        .expectCellToBeDim(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft() + 2
        );
      await projectPage
        .getVisualization()
        .expectFieldIsNotDimension(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 2
        );
      spreadsheet.getTable(0).getField(2).removeDim();
    }
  );

  test('filter by value', async () => {});
});
