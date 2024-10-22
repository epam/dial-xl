/* eslint-disable playwright/no-conditional-in-test */
/* eslint-disable playwright/expect-expect */
import { expect, test } from '@playwright/test';

import { SearchForm, SearchTabs } from '../../components/SearchForm';
import { Field } from '../../logic-entities/Field';
import { SpreadSheet } from '../../logic-entities/SpreadSheet';
import { Table } from '../../logic-entities/Table';
import { ProjectPage } from '../../pages/ProjectPage';
import { TestFixtures } from '../TestFixtures';

const projectName = TestFixtures.addGuid('autotest_search');

const tableForSearch = 'SearchTable';

const fieldForSearch = 'SearchField';

const table1Row = 2,
  table1Column = 2;

const projectSpreadsheet = new SpreadSheet();

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, tableForSearch);
  Table1.addField(new Field(fieldForSearch + '1', '5'));
  Table1.addField(new Field(fieldForSearch + '2', '7'));
  projectSpreadsheet.addTable(Table1);
  await TestFixtures.createProject(
    browser,
    projectName,
    table1Row,
    table1Column,
    tableForSearch,
    projectSpreadsheet.toDsl()
  );
});

test.beforeEach(async ({ page }) => {
  await TestFixtures.openProject(page, projectName);
});

test.afterAll(async ({ browser }) => {
  await TestFixtures.deleteProject(browser, projectName);
});

test.describe('search form', () => {
  test('switch tabs', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Projects);
    await searchForm.search(projectName);
    await expect(searchForm.getFirstSearchResult()).toHaveText(projectName);
  });

  async function testTabSwitch(
    searchForm: SearchForm,
    tabName: string,
    searchEntry: string
  ) {
    await searchForm.switchTabKeyboard();
    await searchForm.expectTabSelected(tabName);
    await searchForm.search(searchEntry);
    await expect(searchForm.getFirstSearchResult()).toHaveText(searchEntry);
  }

  async function testTabSwitchReverse(
    searchForm: SearchForm,
    tabName: string,
    searchEntry: string
  ) {
    await searchForm.switchTabKeyboardReverseOrder();
    await searchForm.expectTabSelected(tabName);
    await searchForm.search(searchEntry);
    await expect(searchForm.getFirstSearchResult()).toHaveText(searchEntry);
  }

  test('switch tabs keyboard', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await testTabSwitch(searchForm, SearchTabs.Projects, projectName);
    await testTabSwitch(searchForm, SearchTabs.Sheets, 'Sheet1');
    await testTabSwitch(
      searchForm,
      SearchTabs.Tables,
      projectSpreadsheet.getTable(0).getName()
    );
    await testTabSwitch(
      searchForm,
      SearchTabs.Fields,
      projectSpreadsheet.getTable(0).getField(0).getName()
    );
  });

  test('switch tabs keyboard last to first', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Fields);
    await testTabSwitch(searchForm, SearchTabs.All, projectName);
  });

  test('switch tabs reserse order', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await testTabSwitchReverse(
      searchForm,
      SearchTabs.Fields,
      projectSpreadsheet.getTable(0).getField(0).getName()
    );
    await testTabSwitchReverse(
      searchForm,
      SearchTabs.Tables,
      projectSpreadsheet.getTable(0).getName()
    );
    await testTabSwitchReverse(searchForm, SearchTabs.Sheets, 'Sheet1');
    await testTabSwitchReverse(searchForm, SearchTabs.Projects, projectName);
  });

  test('content refresh on tab switch', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Projects);
    await searchForm.search(projectName);
    await searchForm.switchTabKeyboard();
    await expect(searchForm.getNoResultsLabel()).toBeVisible();
  });

  test('search results navigation up and down', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Fields);
    let itemText = await searchForm.getSelectedItemText();
    if (itemText == null) itemText = '';
    await page.keyboard.press('ArrowDown');
    await searchForm.expectSelectedItemChange(itemText);
    let newText = await searchForm.getSelectedItemText();
    if (newText == null) newText = '';
    await page.keyboard.press('ArrowUp');
    await searchForm.expectSelectedItemChange(newText);
    expect(await searchForm.getSelectedItemText()).toBe(itemText);
  });

  test('search result selection by click', async ({ page }) => {});

  test('search result selection by Enter', async ({ page }) => {});

  test('close search and open again', async ({ page }) => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Projects);
    await searchForm.search(projectName);
    await page.keyboard.press('Escape');
    await searchForm.expectFormToDissapear();
    await page.keyboard.press('Control+Shift+F');
    await searchForm.expectTabSelected(SearchTabs.Projects);
    expect(await searchForm.getSearchText()).toBe(projectName);
    await searchForm.switchTabKeyboard();
    await searchForm.expectTabSelected(SearchTabs.Sheets);
    await expect(searchForm.getNoResultsLabel()).toBeVisible();
  });
});
