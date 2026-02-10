/* eslint-disable playwright/no-conditional-in-test */
/* eslint-disable playwright/expect-expect */
import { BrowserContext, expect, Page, test } from '@playwright/test';

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

let browserContext: BrowserContext;

let page: Page;

const storagePath = `playwright/${projectName}.json`;

test.beforeAll(async ({ browser }) => {
  const Table1 = new Table(table1Row, table1Column, tableForSearch);
  Table1.addField(new Field(fieldForSearch + '1', '5'));
  Table1.addField(new Field(fieldForSearch + '2', '7'));
  projectSpreadsheet.addTable(Table1);
  await TestFixtures.createProject(
    storagePath,
    browser,
    projectName,
    table1Row,
    table1Column,
    tableForSearch,
    projectSpreadsheet.toDsl()
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

test.describe('search form', () => {
  test('switch tabs', async () => {
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

  test('switch tabs keyboard', async () => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.expectFormToAppear();
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

  test('switch tabs keyboard last to first', async () => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Fields);
    await testTabSwitch(searchForm, SearchTabs.All, projectName);
  });

  test('switch tabs reserse order', async () => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.expectFormToAppear();
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

  test('content refresh on tab switch', async () => {
    await ProjectPage.createInstance(page);
    await page.keyboard.press('Control+Shift+F');
    const searchForm = new SearchForm(page);
    await searchForm.switchTab(SearchTabs.Projects);
    await searchForm.search(projectName);
    await searchForm.switchTabKeyboard();
    await expect(searchForm.getNoResultsLabel()).toBeVisible();
  });

  test('search results navigation up and down', async () => {
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

  test('search result selection by click', async () => {});

  test('search result selection by Enter', async () => {});

  test('close search and open again', async () => {
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
