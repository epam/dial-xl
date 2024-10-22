/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { FieldMenuItem } from '../../enums/FieldMenuItem';
import { GridMenuItem } from '../../enums/GridMenuItem';
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

const table3Row = 2;

const table3Column = 10;

const table3Name = 'TableForSwaps';

const dataType = process.env['DATA_TYPE']
  ? process.env['DATA_TYPE']
  : 'default';

let spreadsheet: SpreadSheet = new SpreadSheet();

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
  //const table1Dsl = `!placement(${table1Row}, ${table1Column})\ntable ${table1Name}\nkey [Field1] = 1\n[Field2] = RANGE(5)\ndim [Field3] = RANGE(10)\n`;
  //const table2Dsl = `!placement(${table2Row}, ${table2Column})\ntable ${table2Name}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n`;
  //const table3Dsl = `!placement(${table3Row}, ${table3Column})\ntable ${table3Name}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n[Field4] = 10\n`;
  if (dataType !== 'default') {
    spreadsheet = getProjectSpreadSheeet(dataType, spreadsheet);
  }
  await TestFixtures.createProjectNew(browser, projectName, spreadsheet);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
  /*await TestFixtures.expectCellTableToBeDisplayed(
    page,
    spreadsheet.getTable(1).getTop(),
    spreadsheet.getTable(1).getLeft()
  );*/

  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(1));
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('field actions', () => {
  test(
    `verify fields names ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await expect(
        projectPage
          .getGrid()
          .getCellTableText(
            spreadsheet.getTable(0).getFieldHeadersRow(),
            spreadsheet.getTable(0).getLeft()
          )
      ).toHaveText('Field1');
      await expect(
        projectPage
          .getGrid()
          .getCellTableText(
            spreadsheet.getTable(0).getFieldHeadersRow(),
            spreadsheet.getTable(0).getLeft() + 1
          )
      ).toHaveText('Field2');
      await expect(
        projectPage
          .getGrid()
          .getCellTableText(
            spreadsheet.getTable(0).getFieldHeadersRow(),
            spreadsheet.getTable(0).getLeft() + 2
          )
      ).toHaveText('Field3');
    }
  );

  test(
    `rename field ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          'Rename field'
        );
      const newName = 'Field1New';
      await projectPage.getGrid().setCellValue(newName);
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .clickOnCell(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft()
        );
      await page.keyboard.press('F2');
      const newName = 'Field1HotKey';
      await projectPage.getGrid().setCellValue(newName);
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const fieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft()
        )
        .textContent();
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft(),
          'Rename field'
        );
      const newName = 'Field1Cancel';
      await projectPage.getGrid().setCellValueAndCancel(newName);
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellSubAction(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft() + 1,
          'Delete',
          'Delete field'
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .clickOnCell(
          spreadsheet.getTable(1).getFieldHeadersRow(),
          spreadsheet.getTable(1).getLeft() + 1
        );
      await page.keyboard.press('Delete');
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1
        )
        .textContent();
      const leftFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        )
        .textContent();
      await projectPage
        .getGrid()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1,
          'Field',
          'Swap left'
        );
      await projectPage
        .getGrid()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          curFieldValue || ''
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2
        )
        .textContent();
      const rightFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3
        )
        .textContent();
      await projectPage
        .getGrid()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2,
          'Field',
          'Swap right'
        );
      await projectPage
        .getGrid()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          curFieldValue || ''
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1
        )
        .textContent();
      const leftFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        )
        .textContent();
      await projectPage
        .getGrid()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 1
        );
      await page.keyboard.press('Shift+Alt+ArrowLeft');
      await projectPage
        .getGrid()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          curFieldValue || ''
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2
        )
        .textContent();
      const rightFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3
        )
        .textContent();
      await projectPage
        .getGrid()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 2
        );
      await page.keyboard.press('Shift+Alt+ArrowRight');
      await projectPage
        .getGrid()
        .expectCellTextChange(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          curFieldValue || ''
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        )
        .textContent();
      await projectPage
        .getGrid()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          'Field',
          'Swap left'
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      const curFieldValue = await projectPage
        .getGrid()
        .getCellTableText(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3
        )
        .textContent();
      await projectPage
        .getGrid()
        .performCellSubAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft() + 3,
          'Field',
          'Swap right'
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          'Edit formula'
        );
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newValue = '222';
      await projectPage.getGrid().setCellValue(newValue);
      await expect(projectPage.getFormula()).toHaveText('=' + newValue);
      spreadsheet.getTable(2).getField(0).updateValue(newValue);
    }
  );

  test(
    `edit formula by hotkey Alt+F2 ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await page.keyboard.press('Alt+F2');
      const newValue = '111';
      await projectPage.getGrid().setCellValue(newValue);
      await projectPage
        .getGrid()
        .clickOnCell(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );
      await expect(projectPage.getFormula()).toHaveText('=' + newValue);
      spreadsheet.getTable(2).getField(0).updateValue(newValue);
    }
  );

  test(
    `add key ${dataType}`,
    {
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft(),
          GridMenuItem.AddKey
        );

      await projectPage
        .getGrid()
        .expectFieldToBeKey(
          spreadsheet.getTable(2).getFieldHeadersRow(),
          spreadsheet.getTable(2).getLeft()
        );

      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft(),
          GridMenuItem.RemoveKey
        );

      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 1,
          FieldMenuItem.MakeDimension
        );

      await projectPage
        .getGrid()
        .expectCellToNotBeDim(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft() + 1
        );

      await projectPage
        .getGrid()
        .expectFieldIsDimension(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 1
        );
      await projectPage
        .getGrid()
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
      tag: ['@hiddenTable'],
    },
    async ({ page }) => {
      const projectPage = await ProjectPage.createInstance(page);
      await projectPage
        .getGrid()
        .performCellAction(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 2,
          FieldMenuItem.RemoveDimension
        );

      await projectPage
        .getGrid()
        .expectCellToBeDim(
          spreadsheet.getTable(0).getFirstCellCoord(),
          spreadsheet.getTable(0).getLeft() + 2
        );
      await projectPage
        .getGrid()
        .expectFieldIsNotDimension(
          spreadsheet.getTable(0).getFieldHeadersRow(),
          spreadsheet.getTable(0).getLeft() + 2
        );
      spreadsheet.getTable(0).getField(2).removeDim();
    }
  );
});
