/* eslint-disable playwright/expect-expect */
import { expect, Page, test } from '@playwright/test';

import { FormulasMenu } from '../../components/FormulasMenu';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_intelisense');

const table1Row = 2;

const table1Column = 2;

const table1Name = 'Table1';

const spreadsheet: SpreadSheet = new SpreadSheet();

function assertIndex(suggestionsList: string[], item: string, bound = 2) {
  const index = suggestionsList.findIndex((item) => item.startsWith(item));
  expect(index).toBeGreaterThanOrEqual(0);
  expect(index).toBeLessThan(bound);
}

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, table1Name);
  Table1.addField(new Field('Field1', '5'));
  Table1.addField(new Field('Field2', '7'));
  spreadsheet.addTable(Table1);
  const Table2 = new Table(2, 6, 'Table2');
  Table2.addField(new Field('FormulaField', 'RANGE(10)'));
  Table2.makeDynamic();
  spreadsheet.addTable(Table2);
  const Table3 = new Table(2, 10, `'T A B L E'`);
  Table3.addField(new Field('SField', '5'));
  Table3.addField(new Field('M W Field', '123'));
  spreadsheet.addTable(Table3);
  await TestFixtures.createProjectNew(browser, projectName, spreadsheet);
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
  await TestFixtures.expectTableToBeDisplayed(page, spreadsheet.getTable(0));
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('Intelisense', () => {
  test('suggestions order when adding a new field with =', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when adding a new table with =', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    expect(
      suggestionsList.findIndex((item) =>
        item.startsWith(spreadsheet.getTable(0).getName())
      )
    ).toBe(1);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when adding a new table with :', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage.getGrid().getCellEditor().typeValue(':', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(0).getName(), 3);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when adding a new field with = in the middle', async ({
    page,
  }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue('FieldX=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when editing formula', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage
      .getGrid()
      .performCellAction(table.getTop() + 1, table.getLeft(), 'Edit formula');
    await projectPage.getGrid().getCellEditor().removeCharaters(6);
    await projectPage.getGrid().getCellEditor().requestIntellisense();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, 'RANGE', 1);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('function insertion through intelisense', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage.getGrid().getCellEditor().typeValue(':R', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion('RANGE');
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(':RANGE()');
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('table insertion through intelisense', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(0).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=' + spreadsheet.getTable(0).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('field insertion through intelisense', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getField(0).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText(`=[${table.getField(0).getName()}]`);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('close suggestions by Esc', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue('FieldX=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
  });

  async function validateNoMessage(projectPage: ProjectPage, page: Page) {
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().requestIntellisense();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage
      .getGrid()
      .getCellEditor()
      .expectNoSuggestionsMessageToBeVisible();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  }

  test('no intelisense when typing new table name', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage
      .getGrid()
      .getCellEditor()
      .typeValue('Table', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('no intelisense when typing new field name', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage.getGrid().getCellEditor().typeValue('xyz', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('no intelisense when adding override', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop() + 2, table.getLeft() + 1);
    await projectPage.getGrid().getCellEditor().typeValue('9', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('intelisense when adding override with =', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop() + 2, table.getLeft() + 1);
    await projectPage.getGrid().getCellEditor().typeValue('=Fie', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('no intelisense when renaming a table', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop(), table.getLeft());
    await projectPage.getGrid().getCellEditor().typeValue('Tabl', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('no intelisense when renaming a field', async ({ page }) => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop() + 1, table.getLeft());
    await projectPage.getGrid().getCellEditor().typeValue('Fiel', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('new suggestions after we inserted a table name with [', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=' + table.getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getName() + '[');
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getName() + '[');
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('new suggestions after we inserted a table name with .', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=' + table.getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getName() + '.');
    await page.keyboard.type('.');
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    assertIndex(suggestionsList, 'ABS');
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('suggestions with multi words table names with quotes', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage.getGrid().getCellEditor().typeValue("='T", false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(2).getName(), 3);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(2).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=' + spreadsheet.getTable(2).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('suggestions with multi words table names without quotes', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage.getGrid().getCellEditor().typeValue('=T', false, false);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(2).getName(), 3);
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(2).getName());
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=' + spreadsheet.getTable(2).getName());
    await projectPage
      .getGrid()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  test('intellisense in formula editor should work for edit', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(
      table.getFieldHeadersRow(),
      table.getLeft()
    );
    await projectPage.getFormulaEditor().focus();
    await projectPage.getFormulaEditor().removeCharaters(6);
    await projectPage.getFormulaEditor().requestIntellisense();
    await projectPage
      .getFormulaEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getFormulaEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, 'RANGE');
    await projectPage
      .getFormulaEditor()
      .getIntellisensePopup()
      .selectSuggestion('RANGE');
    await expect(projectPage.getFormulaEditor().getValueLocator()).toHaveText(
      '=RANGE()'
    );
    await projectPage.getFormulaEditor().cancelSettingValue();
  });

  test('intellisense in formula editor should work for typing', async ({
    page,
  }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage.getFormulaEditor().typeValue('=T', true, false);
    await projectPage
      .getFormulaEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getFormulaEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(0).getName());
    await projectPage
      .getFormulaEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(0).getName());
    await expect(projectPage.getFormulaEditor().getValueLocator()).toHaveText(
      '=' + spreadsheet.getTable(0).getName()
    );
    await projectPage.getFormulaEditor().cancelSettingValue();
  });

  test('open all formulas in intellisense', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    const popup = projectPage.getGrid().getCellEditor().getIntellisensePopup();
    await popup.intellisenseShouldBeVisible();
    await popup.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await projectPage.clickOnGridCell(9, 9);
    await formulasMenu.menuShouldHidden();
  });

  test('insert formula from all formulas in intellisense', async ({ page }) => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getGrid().getCellEditor().typeValue('=', false, false);
    const popup = projectPage.getGrid().getCellEditor().getIntellisensePopup();
    await popup.intellisenseShouldBeVisible();
    await popup.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await formulasMenu.selectItemByPath(['Aggregations', 'COUNT']);
    await expect(
      projectPage.getGrid().getCellEditor().getValueLocator()
    ).toHaveText('=COUNT()');
    await formulasMenu.menuShouldHidden();
    await projectPage.getGrid().getCellEditor().cancelSettingValue();
  });

  /*test('intellisense in formula editor should work for typing field', async ({ page}) => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage.clickOnGridCell(table.getTop()+1, table.getLeft()+1);
    await projectPage.getFormulaEditor().typeValue("=Fo");
    await projectPage
    .getFormulaEditor()
    .getIntellisensePopup()
    .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
    .getFormulaEditor()
    .getIntellisensePopup()
    .getSuggestionsList();    
    assertIndex(suggestionsList, table.getField(0).getName());
    await projectPage.getFormulaEditor().getIntellisensePopup().selectSuggestion('RANGE');
    await expect(projectPage.getFormulaEditor().getValueLocator()).toHaveText('=RANGE()');
    await projectPage.getFormulaEditor().cancelSettingValue();
  });*/
});
