/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

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

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

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

test.describe('Intelisense', () => {
  test('suggestions order when adding a new field with =', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when adding a new table with =', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    expect(
      suggestionsList.findIndex((item) =>
        item.startsWith(spreadsheet.getTable(0).getName())
      )
    ).toBe(1);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when adding a new table with :', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue(':', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(0).getName(), 3);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when adding a new field with = in the middle', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('FieldX=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('suggestions order when editing formula', async () => {
    /*const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(1);
    await projectPage
      .getVisualization()
      .performCellAction(table.getTop() + 1, table.getLeft(), 'Edit formula');
    await projectPage.getVisualization().getCellEditor().removeCharaters(6);
    await projectPage.getVisualization().getCellEditor().requestIntellisense();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, 'RANGE', 1);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();*/
  });

  test('function insertion through intelisense', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue(':R', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion('RANGE');
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(':RANGE()');
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('table insertion through intelisense', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(0).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=' + spreadsheet.getTable(0).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('field insertion through intelisense', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getField(0).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText(`=[${table.getField(0).getName()}]`);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('close suggestions by Esc', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('FieldX=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
  });

  async function validateNoMessage(projectPage: ProjectPage, page: Page) {
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().requestIntellisense();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .expectNoSuggestionsMessageToBeVisible();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  }

  test('no intelisense when typing new table name', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(8, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('Table', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('no intelisense when typing new field name', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(
      table.getTop() + 1,
      table.getLeft() + table.width()
    );
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('xyz', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('no intelisense when adding override', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop() + 2, table.getLeft() + 1);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('9', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('intelisense when adding override with =', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop() + 2, table.getLeft() + 1);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=Fie', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('no intelisense when renaming a table', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop(), table.getLeft());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('Tabl', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('no intelisense when renaming a field', async () => {
    const table = spreadsheet.getTable(0);
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(table.getTop() + 1, table.getLeft());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('Fiel', false, false);
    await validateNoMessage(projectPage, page);
  });

  test('new suggestions after we inserted a table name with [', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=' + table.getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getName() + '[');
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getName() + '[');
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    assertIndex(suggestionsList, table.getField(0).getName());
    assertIndex(suggestionsList, table.getField(1).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('new suggestions after we inserted a table name with .', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    const table = spreadsheet.getTable(0);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(table.getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=' + table.getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, table.getName() + '.');
    await page.keyboard.type('.');
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    assertIndex(suggestionsList, 'ABS');
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('suggestions with multi words table names with quotes', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue("='T", false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(2).getName(), 3);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(2).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=' + spreadsheet.getTable(2).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('suggestions with multi words table names without quotes', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(5, 8);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=T', false, false);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .intellisenseShouldBeVisible();
    const suggestionsList = await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .getSuggestionsList();
    assertIndex(suggestionsList, spreadsheet.getTable(2).getName(), 3);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .selectSuggestion(spreadsheet.getTable(2).getName());
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=' + spreadsheet.getTable(2).getName());
    await projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup()
      .closeAutocomplete();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  test('intellisense in formula editor should work for edit', async () => {
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

  test('intellisense in formula editor should work for typing', async () => {
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

  test('open all formulas in intellisense', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    const popup = projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup();
    await popup.intellisenseShouldBeVisible();
    await popup.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await projectPage.clickOnGridCell(9, 9);
    await formulasMenu.menuShouldHidden();
  });

  test('insert formula from all formulas in intellisense', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage
      .getVisualization()
      .getCellEditor()
      .typeValue('=', false, false);
    const popup = projectPage
      .getVisualization()
      .getCellEditor()
      .getIntellisensePopup();
    await popup.intellisenseShouldBeVisible();
    await popup.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await formulasMenu.selectItemByPath(['Aggregations', 'COUNT']);
    await expect(
      projectPage.getVisualization().getCellEditor().getValueLocator()
    ).toHaveText('=COUNT()');
    await formulasMenu.menuShouldHidden();
    await projectPage.getVisualization().getCellEditor().cancelSettingValue();
  });

  /*test('intellisense in formula editor should work for typing field', async () => {
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
