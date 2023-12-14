/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = 'autotest_formulas';

const tableRow = 2;

const tableColumn = 2;

const tableName = 'Table';

test.beforeAll(async ({ browser }) => {
  const table1Dsl = `!placement(${tableRow}, ${tableColumn})\ntable ${tableName}\n[Field1] = 1\n[Field2] = 7\n[Field3] = 3\n[Field4] = 10`;
  await TestFixtures.createProject(
    browser,
    projectName,
    tableRow,
    tableColumn,
    tableName,
    table1Dsl
  );
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test('change cell value in formula', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(tableRow + 1, tableColumn);
  const currentText = await projectPage.getFormula().textContent();
  await projectPage.sendKeysFormulaValue('234');
  await expect(projectPage.getFormula()).toHaveText(currentText + '234');
});

test('change cell value in formula with clear', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(tableRow + 1, tableColumn);
  const currentText = await projectPage.getFormula().textContent();
  await projectPage.setFormula('234', currentText?.length || 0);
  await expect(projectPage.getFormula()).toHaveText('234');
});

test('cancel changing of formula', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(tableRow + 1, tableColumn);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const oldValue = (await projectPage.getFormula().textContent()) || '';
  await projectPage.cancelFormulaChange('555');
  await expect(projectPage.getFormula()).toHaveText(oldValue);
});

test('type a value in formula and click on other click', async ({ page }) => {
  const projectPage = await ProjectPage.createInstance(page);
  await projectPage.getGrid().clickOnCell(tableRow + 1, tableColumn);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const oldValue = (await projectPage.getFormula().textContent()) || '';
  await projectPage.typeInFormulaBar('333');
  await projectPage.getGrid().clickOnCell(tableRow + 2, tableColumn);
  await expect(projectPage.getFormula()).toHaveText(oldValue);
});

//edit regular cell, not header
