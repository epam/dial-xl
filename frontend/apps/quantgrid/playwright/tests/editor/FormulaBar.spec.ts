/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

import { Canvas } from '../../components/Canvas';
import { FormulasMenu } from '../../components/FormulasMenu';
import {
  expectCellTextNotToBe,
  expectCellTextToBe,
} from '../../helpers/canvasExpects';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_formulas');

const tableRow = 2;

const tableColumn = 2;

const tableName = 'Table';

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!layout(${tableRow}, ${tableColumn}, "title", "headers")\ntable ${tableName}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n[Field4] = 10\n[Field5] = [Field1] + [Field3]`;
  await TestFixtures.createProject(
    storagePath,
    browser,
    projectName,
    tableRow,
    tableColumn,
    tableName,
    table1Dsl
  );
  browserContext = await browser.newContext({ storageState: storagePath });
});

test.beforeEach(async () => {
  page = await browserContext.newPage();
  await TestFixtures.openProject(page, projectName);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async ({ browser }) => {
  await browserContext.close();
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('formula bar', () => {
  test('change cell value in formula', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getVisualization().clickOnCell(tableRow + 1, tableColumn);
    const currentText = await projectPage.getFormula().textContent();
    await projectPage.sendKeysFormulaValue('234');
    await expect(projectPage.getFormula()).toHaveText(currentText + '234');
  });

  test('change cell value in formula with clear', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getVisualization().clickOnCell(tableRow + 1, tableColumn);
    const currentText = await projectPage.getFormula().textContent();
    await projectPage.setFormula('234', currentText?.length || 0);
    await expect(projectPage.getFormula()).toHaveText('234');
  });

  test('cancel changing of formula', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getVisualization().clickOnCell(tableRow + 1, tableColumn);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const oldValue = (await projectPage.getFormula().textContent()) || '';
    await projectPage.cancelFormulaChange('555');
    await expect(projectPage.getFormula()).toHaveText(oldValue);
  });

  test('type a value in formula and click on other cell', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.getVisualization().clickOnCell(tableRow + 1, tableColumn);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const oldValue = (await projectPage.getFormula().textContent()) || '';
    const newValue = '333';
    await projectPage.setFormula(newValue, oldValue.length);
    await projectPage
      .getVisualization()
      .clickOnCell(tableRow + 1, tableColumn + 3);
    await expect(projectPage.getFormula()).toHaveText('=' + newValue);
  });

  test('insert formula from all formulas in formula editor', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getFormulaEditor().typeValue('=', true, false);
    const popup = projectPage.getFormulaEditor().getIntellisensePopup();
    await popup.intellisenseShouldBeVisible();
    await popup.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await formulasMenu.selectItemByPath(['Math', 'SIN']);
    await expect(projectPage.getFormula()).toHaveText('=SIN()');
    await formulasMenu.menuShouldHidden();
    await projectPage.getFormulaEditor().cancelSettingValue();
  });

  test('insert formula from all formulas without editing mode', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await formulasMenu.selectItemByPath(['Table', 'RANGE']);
    await expect(projectPage.getFormula()).toHaveText('=RANGE()');
    await formulasMenu.menuShouldHidden();
    await projectPage.getFormulaEditor().cancelSettingValue();
  });

  test('insert 2 formulas in a row from all formulas', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    await projectPage.clickOnGridCell(10, 10);
    await projectPage.getFormulaEditor().typeValue('=', true, false);
    const popup = projectPage.getFormulaEditor().getIntellisensePopup();
    await popup.intellisenseShouldBeVisible();
    await popup.openFormulasList();
    const formulasMenu = new FormulasMenu(page);
    await formulasMenu.menuShouldPresent();
    await formulasMenu.selectItemByPath(['Math', 'LOG10']);
    await expect(projectPage.getFormula()).toHaveText('=LOG10()');
    await projectPage.getFormulaEditor().requestIntellisense();
    await popup.openFormulasList();
    await formulasMenu.menuShouldPresent();
    await formulasMenu.selectItemByPath(['Aggregations', 'COUNT']);
    await expect(projectPage.getFormula()).toHaveText('=LOG10(COUNT())');
    await projectPage.getFormulaEditor().cancelSettingValue();
  });

  test('add operation to existing formula', async () => {
    const projectPage = await ProjectPage.createInstance(page);
    let initialValue = await projectPage.getCellText(
      tableRow + 2,
      tableColumn + 4
    );
    initialValue = initialValue ? initialValue : '';
    await projectPage
      .getVisualization()
      .clickOnCell(tableRow + 2, tableColumn + 4);
    await projectPage.getFormulaEditor().typeValue('+3');
    await projectPage.getFormulaEditor().finishLine();
    await expectCellTextNotToBe(
      <Canvas>projectPage.getVisualization(),
      tableRow + 2,
      tableColumn + 4,
      initialValue
    );
  });
  //edit regular cell, not header
});
